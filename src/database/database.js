// src/database/database.js
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../config/config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? join(process.env.RAILWAY_VOLUME_MOUNT_PATH)
  : join(__dirname, '../../data');
const dbPath = join(dataDir, 'ptpt.json');

mkdirSync(dataDir, { recursive: true });

const defaultDB = {
  prices: {
    revv: {},
    ibo: {},
  },
  tickets: {},
  orders: {},
  cooldowns: {},
  logs: [],
  settings: {
    ticketOpen: true,
    enabledDurations: {
      revv: [],
      ibo: [],
    },
  },
  slotMessageIds: {
    revv: null,
    ibo: null,
  },
};

export function loadDB() {
  if (!existsSync(dbPath)) {
    saveDB(defaultDB);
    return JSON.parse(JSON.stringify(defaultDB));
  }
  try {
    return JSON.parse(readFileSync(dbPath, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(defaultDB));
  }
}

export function saveDB(data) {
  writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

function initPrices() {
  const db = loadDB();
  let changed = false;
  for (const server of config.servers) {
    if (!db.prices[server]) { db.prices[server] = {}; changed = true; }
    for (const [duration, price] of Object.entries(config.defaultPrices[server])) {
      if (!db.prices[server][duration]) {
        db.prices[server][duration] = { price, updated_at: new Date().toISOString(), updated_by: 'system' };
        changed = true;
      }
    }
  }
  // migrate settings.enabledDurations jika masih format lama (array)
  if (Array.isArray(db.settings?.enabledDurations)) {
    const old = db.settings.enabledDurations;
    db.settings.enabledDurations = { revv: [...old], ibo: [...old] };
    changed = true;
  }
  if (!db.settings?.enabledDurations?.revv) {
    db.settings = db.settings || {};
    db.settings.enabledDurations = { revv: [...config.durations], ibo: [...config.durations] };
    changed = true;
  }
  if (!db.slotMessageIds?.revv === undefined) {
    db.slotMessageIds = { revv: null, ibo: null };
    changed = true;
  }
  if (changed) saveDB(db);
  logger.info('Database initialized (JSON)');
}

// =================== PRICE ===================

export function getPrice(server, duration) {
  const db = loadDB();
  return db.prices[server]?.[duration]?.price ?? null;
}

export function getAllPrices(server) {
  const db = loadDB();
  const priceObj = db.prices[server] || {};
  return config.durations.map(d => ({
    duration: d,
    price: priceObj[d]?.price ?? config.defaultPrices[server]?.[d] ?? 0,
    updated_at: priceObj[d]?.updated_at ?? null,
    updated_by: priceObj[d]?.updated_by ?? 'system',
  }));
}

export function setPrice(server, duration, price, updatedBy = 'admin') {
  const db = loadDB();
  if (!db.prices[server]) db.prices[server] = {};
  db.prices[server][duration] = { price, updated_at: new Date().toISOString(), updated_by: updatedBy };
  saveDB(db);
}

export function resetPrices(server, updatedBy = 'admin') {
  for (const [duration, price] of Object.entries(config.defaultPrices[server] || {})) {
    setPrice(server, duration, price, updatedBy);
  }
}

// =================== TICKET ===================

export function createTicket(ticketId, channelId, userId, username) {
  const db = loadDB();
  db.tickets[ticketId] = {
    ticket_id: ticketId,
    channel_id: channelId,
    user_id: userId,
    username,
    status: 'open',
    claimed_by: null,
    created_at: new Date().toISOString(),
    closed_at: null,
  };
  saveDB(db);
}

export function getTicket(ticketId) {
  const db = loadDB();
  return db.tickets[ticketId] ?? null;
}

export function getActiveTicketByUser(userId) {
  const db = loadDB();
  return Object.values(db.tickets).find(t => t.user_id === userId && t.status === 'open') ?? null;
}

export function closeTicket(ticketId) {
  const db = loadDB();
  if (db.tickets[ticketId]) {
    db.tickets[ticketId].status = 'closed';
    db.tickets[ticketId].closed_at = new Date().toISOString();
    saveDB(db);
  }
}

export function claimTicket(ticketId, claimedBy) {
  const db = loadDB();
  if (db.tickets[ticketId]) {
    db.tickets[ticketId].claimed_by = claimedBy;
    saveDB(db);
  }
}

export function getTicketByChannelId(channelId) {
  const db = loadDB();
  return Object.values(db.tickets).find(t => t.channel_id === channelId) ?? null;
}

// =================== COOLDOWN ===================

export function setTicketCooldown(userId) {
  const db = loadDB();
  db.cooldowns[userId] = { last_created: new Date().toISOString() };
  saveDB(db);
}

export function isOnCooldown(userId, cooldownSeconds) {
  const db = loadDB();
  const row = db.cooldowns[userId];
  if (!row) return false;
  const diff = (Date.now() - new Date(row.last_created).getTime()) / 1000;
  return diff < cooldownSeconds;
}

export function getCooldownRemaining(userId, cooldownSeconds) {
  const db = loadDB();
  const row = db.cooldowns[userId];
  if (!row) return 0;
  const diff = (Date.now() - new Date(row.last_created).getTime()) / 1000;
  return Math.max(0, Math.ceil(cooldownSeconds - diff));
}

// =================== ORDER ===================

export function createOrder(data) {
  const db = loadDB();
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  db.orders[orderId] = {
    order_id: orderId,
    ticket_id: data.ticketId,
    user_id: data.userId,
    discord_username: data.discordUsername,
    server: data.server,
    roblox_username: data.robloxUsername,
    display_name: data.displayName,
    slot_data: data.slotData || [{ robloxUsername: data.robloxUsername, displayName: data.displayName }],
    slots: data.slots,
    duration: data.duration,
    total_price: data.totalPrice,
    payment_status: 'pending',
    payment_proof_url: null,
    verified_by: null,
    reject_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveDB(db);
  return orderId;
}

export function getOrder(orderId) {
  const db = loadDB();
  return db.orders[orderId] ?? null;
}

export function getOrderByTicket(ticketId) {
  const db = loadDB();
  return Object.values(db.orders)
    .filter(o => o.ticket_id === ticketId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
}

export function updateOrderStatus(orderId, status, verifiedBy = null, rejectReason = null) {
  const db = loadDB();
  if (db.orders[orderId]) {
    db.orders[orderId].payment_status = status;
    db.orders[orderId].verified_by = verifiedBy;
    db.orders[orderId].reject_reason = rejectReason;
    db.orders[orderId].updated_at = new Date().toISOString();
    saveDB(db);
  }
}

export function updatePaymentProof(orderId, proofUrl) {
  const db = loadDB();
  if (db.orders[orderId]) {
    db.orders[orderId].payment_proof_url = proofUrl;
    db.orders[orderId].updated_at = new Date().toISOString();
    saveDB(db);
  }
}

export function getActiveSlotCount(server) {
  const db = loadDB();
  const now = Date.now();
  return Object.values(db.orders)
    .filter(o => {
      if (o.payment_status !== 'accepted') return false;
      if (o.server !== server) return false;
      const match = o.duration?.match(/^(\d+)h$/);
      if (!match) return true;
      const endTime = new Date(o.updated_at).getTime() + parseInt(match[1]) * 3600000;
      return endTime > now;
    })
    .reduce((sum, o) => sum + (o.slots || 0), 0);
}

export function getActiveOrdersByServer(server) {
  const db = loadDB();
  const now = Date.now();
  return Object.values(db.orders)
    .filter(o => {
      if (o.payment_status !== 'accepted') return false;
      if (o.server !== server) return false;
      const match = o.duration?.match(/^(\d+)h$/);
      if (!match) return true;
      const endTime = new Date(o.updated_at).getTime() + parseInt(match[1]) * 3600000;
      return endTime > now;
    })
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
}

// =================== LOG ===================

export function logTransaction(orderId, action, performedBy, details = null) {
  const db = loadDB();
  db.logs.push({
    order_id: orderId,
    action,
    performed_by: performedBy,
    details,
    created_at: new Date().toISOString(),
  });
  if (db.logs.length > 1000) db.logs = db.logs.slice(-1000);
  saveDB(db);
}

// =================== SLOT MESSAGE IDS ===================

export function getSlotMessageId(server) {
  const db = loadDB();
  return db.slotMessageIds?.[server] ?? null;
}

export function saveSlotMessageId(server, messageId) {
  const db = loadDB();
  if (!db.slotMessageIds) db.slotMessageIds = {};
  db.slotMessageIds[server] = messageId;
  saveDB(db);
}

initPrices();
export default { loadDB, saveDB };

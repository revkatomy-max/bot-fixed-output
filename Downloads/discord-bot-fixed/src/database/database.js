// src/database/database.js - JSON Database (no native modules required)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../config/config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');
const dbPath = join(dataDir, 'ptpt.json');

mkdirSync(dataDir, { recursive: true });

// Default DB structure
const defaultDB = {
  prices: {},
  tickets: {},
  orders: {},
  cooldowns: {},
  logs: [],
  settings: {
    ticketOpen: true,
    enabledDurations: [],
  },
  slotMessageIds: {}, // Persistent message IDs untuk slot list channels
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

// Init default prices
function initPrices() {
  const db = loadDB();
  let changed = false;
  for (const [duration, price] of Object.entries(config.defaultPrices)) {
    if (!db.prices[duration]) {
      db.prices[duration] = { price, updated_at: new Date().toISOString(), updated_by: 'system' };
      changed = true;
    }
  }
  if (changed) saveDB(db);
  logger.info('Database initialized (JSON)');
}

// =================== PRICE FUNCTIONS ===================

export function getPrice(duration) {
  const db = loadDB();
  return db.prices[duration]?.price ?? null;
}

export function getAllPrices() {
  const db = loadDB();
  return Object.entries(db.prices).map(([duration, data]) => ({
    duration,
    price: data.price,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  }));
}

export function setPrice(duration, price, updatedBy = 'admin') {
  const db = loadDB();
  db.prices[duration] = { price, updated_at: new Date().toISOString(), updated_by: updatedBy };
  saveDB(db);
}

export function resetPrices(updatedBy = 'admin') {
  for (const [duration, price] of Object.entries(config.defaultPrices)) {
    setPrice(duration, price, updatedBy);
  }
}

// =================== TICKET FUNCTIONS ===================

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

// =================== COOLDOWN FUNCTIONS ===================

export function getTicketCooldown(userId) {
  const db = loadDB();
  return db.cooldowns[userId] ?? null;
}

export function setTicketCooldown(userId) {
  const db = loadDB();
  db.cooldowns[userId] = { last_created: new Date().toISOString() };
  saveDB(db);
}

export function isOnCooldown(userId, cooldownSeconds) {
  const row = getTicketCooldown(userId);
  if (!row) return false;
  const lastCreated = new Date(row.last_created);
  const diff = (Date.now() - lastCreated.getTime()) / 1000;
  return diff < cooldownSeconds;
}

export function getCooldownRemaining(userId, cooldownSeconds) {
  const row = getTicketCooldown(userId);
  if (!row) return 0;
  const lastCreated = new Date(row.last_created);
  const diff = (Date.now() - lastCreated.getTime()) / 1000;
  return Math.max(0, Math.ceil(cooldownSeconds - diff));
}

// =================== ORDER FUNCTIONS ===================

export function createOrder(data) {
  const db = loadDB();
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  db.orders[orderId] = {
    order_id: orderId,
    ticket_id: data.ticketId,
    user_id: data.userId,
    discord_username: data.discordUsername,
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
  const orders = Object.values(db.orders)
    .filter(o => o.ticket_id === ticketId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return orders[0] ?? null;
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

// Hitung total slot aktif (order accepted yang belum expired berdasarkan durasi)
export function getActiveSlotCount() {
  const db = loadDB();
  const now = Date.now();
  return Object.values(db.orders)
    .filter(o => {
      if (o.payment_status !== 'accepted') return false;
      // Cek apakah durasi order masih aktif
      const durationMs = parseDurationMs(o.duration);
      if (!durationMs) return true; // kalau ga bisa parse, anggap masih aktif
      const endTime = new Date(o.updated_at).getTime() + durationMs;
      return endTime > now;
    })
    .reduce((sum, o) => sum + (o.slots || 0), 0);
}

// Ambil daftar order aktif yang sudah terurut (untuk keperluan slot per channel)
export function getActiveOrdersSorted() {
  const db = loadDB();
  const now = Date.now();
  return Object.values(db.orders)
    .filter(o => {
      if (o.payment_status !== 'accepted') return false;
      const durationMs = parseDurationMs(o.duration);
      if (!durationMs) return true;
      const endTime = new Date(o.updated_at).getTime() + durationMs;
      return endTime > now;
    })
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
}

function parseDurationMs(duration) {
  const match = duration.match(/^(\d+)h$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 * 60 * 1000;
}

export function getAllTransactions(limit = 50) {
  const db = loadDB();
  return Object.values(db.orders)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// =================== LOG FUNCTIONS ===================

export function logTransaction(orderId, action, performedBy, details = null) {
  const db = loadDB();
  db.logs.push({
    order_id: orderId,
    action,
    performed_by: performedBy,
    details,
    created_at: new Date().toISOString(),
  });
  // Keep last 1000 logs only
  if (db.logs.length > 1000) db.logs = db.logs.slice(-1000);
  saveDB(db);
}

initPrices();
export default { loadDB, saveDB };

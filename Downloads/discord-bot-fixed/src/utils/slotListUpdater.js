// src/utils/slotListUpdater.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import { loadDB, saveDB } from '../database/database.js';
import logger from './logger.js';

const SLOTS_PER_CHANNEL = 18;

// Simpan message ID per channel index — persistent via DB agar tidak hilang saat restart
function getMessageIds() {
  const db = loadDB();
  return db.slotMessageIds || {};
}

function saveMessageId(channelIndex, messageId) {
  const db = loadDB();
  if (!db.slotMessageIds) db.slotMessageIds = {};
  db.slotMessageIds[channelIndex] = messageId;
  saveDB(db);
}

function getActiveOrders() {
  const db = loadDB();
  const now = Date.now();
  return Object.values(db.orders)
    .filter(o => {
      if (o.payment_status !== 'accepted') return false;
      const match = o.duration?.match(/^(\d+)h$/);
      if (!match) return true;
      const endTime = new Date(o.updated_at).getTime() + parseInt(match[1]) * 3600000;
      return endTime > now;
    })
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
}

// Flatten semua order jadi list slot individual
function flattenSlots(orders) {
  const slots = [];
  for (const order of orders) {
    const slotData = order.slot_data ||
      [{ robloxUsername: order.roblox_username, displayName: order.display_name }];
    for (const slot of slotData) {
      slots.push({ ...slot, userId: order.user_id, duration: order.duration });
    }
  }
  return slots;
}

function buildChannelEmbed(slots, channelIndex, totalChannels) {
  const startNum = channelIndex * SLOTS_PER_CHANNEL + 1;
  const endNum = startNum + SLOTS_PER_CHANNEL - 1;

  const embed = new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle(`🎯 LIST PTPT AKTIF — Sesi ${channelIndex + 1}`)
    .setTimestamp();

  const lines = [];
  for (let i = 0; i < SLOTS_PER_CHANNEL; i++) {
    const nomor = startNum + i;
    // Ambil slot berdasarkan posisi global (channel index * 18 + i)
    const slotGlobalIndex = channelIndex * SLOTS_PER_CHANNEL + i;
    const slot = slots[slotGlobalIndex];
    if (slot) {
      lines.push(`${nomor}. ${slot.robloxUsername} – ${slot.displayName} (<@${slot.userId}>)`);
    } else {
      lines.push(`${nomor}. –`);
    }
  }

  const terisi = slots.slice(channelIndex * SLOTS_PER_CHANNEL, (channelIndex + 1) * SLOTS_PER_CHANNEL).length;

  embed.setDescription([
    `> 👥 **Slot ${startNum}–${endNum}** | Terisi: **${terisi}/${SLOTS_PER_CHANNEL}**`,
    '',
    lines.join('\n'),
    '',
    `*📅 Diperbarui: <t:${Math.floor(Date.now() / 1000)}:R>*`,
  ].join('\n'));

  return embed;
}

export async function updateSlotList(client) {
  try {
    const channels = config.channels.slotListChannels;
    if (!channels || channels.length === 0) return;

    const orders = getActiveOrders();
    const allSlots = flattenSlots(orders);
    const messageIds = getMessageIds();

    for (let i = 0; i < channels.length; i++) {
      const channelId = channels[i];
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;

      const embed = buildChannelEmbed(allSlots, i, channels.length);

      const existingMsgId = messageIds[i];
      if (existingMsgId) {
        const msg = await channel.messages.fetch(existingMsgId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed] });
          continue;
        }
      }

      // Kirim pesan baru jika belum ada / tidak ditemukan
      const sent = await channel.send({ embeds: [embed] });
      saveMessageId(i, sent.id);
    }
  } catch (err) {
    logger.error('Error updating slot list:', err.message);
  }
}

export function startSlotListRefresh(client) {
  updateSlotList(client);
  setInterval(() => updateSlotList(client), 60_000);
}

// src/utils/slotListUpdater.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import { loadDB, saveDB } from '../database/database.js';
import logger from './logger.js';

const SLOTS_PER_CHANNEL = 18;

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

// Flatten semua order jadi list slot individual.
// Setiap order dengan slots=N mengisi N baris — tidak boleh ada gap.
function flattenSlots(orders) {
  const slots = [];
  for (const order of orders) {
    const slotCount = order.slots || 1;

    if (order.slot_data && Array.isArray(order.slot_data) && order.slot_data.length > 0) {
      // Pakai slot_data jika ada
      for (const slot of order.slot_data) {
        slots.push({
          robloxUsername: slot.robloxUsername || order.roblox_username,
          displayName: slot.displayName || order.display_name,
          userId: order.user_id,
          duration: order.duration,
        });
      }
      // Isi sisa jika slot_data kurang dari slotCount
      for (let extra = order.slot_data.length; extra < slotCount; extra++) {
        slots.push({
          robloxUsername: order.roblox_username,
          displayName: order.display_name,
          userId: order.user_id,
          duration: order.duration,
        });
      }
    } else {
      // Expand slotCount kali pakai data utama
      for (let j = 0; j < slotCount; j++) {
        slots.push({
          robloxUsername: order.roblox_username,
          displayName: order.display_name,
          userId: order.user_id,
          duration: order.duration,
        });
      }
    }
  }
  return slots;
}

function buildChannelEmbed(slots, channelIndex) {
  const startNum = channelIndex * SLOTS_PER_CHANNEL + 1;
  const endNum = startNum + SLOTS_PER_CHANNEL - 1;

  const sliceStart = channelIndex * SLOTS_PER_CHANNEL;
  const sliceEnd = sliceStart + SLOTS_PER_CHANNEL;
  const channelSlots = slots.slice(sliceStart, sliceEnd);
  const terisi = channelSlots.filter(Boolean).length;

  const lines = [];
  for (let i = 0; i < SLOTS_PER_CHANNEL; i++) {
    const nomor = startNum + i;
    const slot = channelSlots[i];
    if (slot) {
      lines.push(`${nomor}. ${slot.robloxUsername} \u2013 ${slot.displayName} (<@${slot.userId}>)`);
    } else {
      lines.push(`${nomor}. \u2013`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle(`\uD83C\uDFAF LIST PTPT AKTIF \u2014 Sesi ${channelIndex + 1}`)
    .setDescription([
      `> \uD83D\uDC65 **Slot ${startNum}\u2013${endNum}** | Terisi: **${terisi}/${SLOTS_PER_CHANNEL}**`,
      '',
      lines.join('\n'),
      '',
      `*\uD83D\uDCC5 Diperbarui: <t:${Math.floor(Date.now() / 1000)}:R>*`,
    ].join('\n'))
    .setTimestamp();

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

      const embed = buildChannelEmbed(allSlots, i);

      const existingMsgId = messageIds[i];
      if (existingMsgId) {
        const msg = await channel.messages.fetch(existingMsgId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed] });
          continue;
        }
      }

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

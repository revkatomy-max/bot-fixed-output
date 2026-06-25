// src/utils/slotListUpdater.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import { getActiveOrdersByServer, getSlotMessageId, saveSlotMessageId } from '../database/database.js';
import logger from './logger.js';

function flattenSlots(orders) {
  const slots = [];
  for (const order of orders) {
    const slotCount = order.slots || 1;
    if (order.slot_data?.length > 0) {
      for (const slot of order.slot_data) {
        slots.push({
          robloxUsername: slot.robloxUsername || order.roblox_username,
          displayName:    slot.displayName    || order.display_name,
          userId:         order.user_id,
          duration:       order.duration,
        });
      }
      for (let extra = order.slot_data.length; extra < slotCount; extra++) {
        slots.push({ robloxUsername: order.roblox_username, displayName: order.display_name, userId: order.user_id, duration: order.duration });
      }
    } else {
      for (let j = 0; j < slotCount; j++) {
        slots.push({ robloxUsername: order.roblox_username, displayName: order.display_name, userId: order.user_id, duration: order.duration });
      }
    }
  }
  return slots;
}

function buildServerEmbed(server, slots) {
  const maxSlots   = config.maxSlotsPerServer[server];
  const label      = config.serverLabels[server];
  const color      = config.colors[server] || config.colors.primary;
  const terisi     = slots.length;

  const lines = [];
  for (let i = 0; i < maxSlots; i++) {
    const slot = slots[i];
    if (slot) {
      lines.push(`${i + 1}. ${slot.robloxUsername} – ${slot.displayName} (<@${slot.userId}>) • \`${config.durationLabels[slot.duration] || slot.duration}\``);
    } else {
      lines.push(`${i + 1}. –`);
    }
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎯 LIST PTPT AKTIF — ${label}`)
    .setDescription([
      `> 👥 **Terisi: ${terisi}/${maxSlots} slot**`,
      '',
      lines.join('\n'),
      '',
      `*📅 Diperbarui: <t:${Math.floor(Date.now() / 1000)}:R>*`,
    ].join('\n'))
    .setTimestamp();
}

export async function updateSlotList(client, server = null) {
  const serversToUpdate = server ? [server] : config.servers;

  for (const srv of serversToUpdate) {
    try {
      const channelId = srv === 'revv' ? config.channels.slotListRevv : config.channels.slotListIbo;
      if (!channelId) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;

      const orders   = getActiveOrdersByServer(srv);
      const slots    = flattenSlots(orders);
      const embed    = buildServerEmbed(srv, slots);
      const msgId    = getSlotMessageId(srv);

      if (msgId) {
        const msg = await channel.messages.fetch(msgId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed] });
          continue;
        }
      }

      const sent = await channel.send({ embeds: [embed] });
      saveSlotMessageId(srv, sent.id);
    } catch (err) {
      logger.error(`Error updating slot list [${srv}]:`, err.message);
    }
  }
}

export function startSlotListRefresh(client) {
  updateSlotList(client);
  setInterval(() => updateSlotList(client), 60_000);
}

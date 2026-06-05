// src/utils/durationChannelManager.js
// Mengelola embed daftar order per channel durasi (6h, 12h, 24h, 36h, 48h, 72h)

import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import {
  getActiveOrdersByDuration,
  getDurationChannelMessages,
  saveDurationChannelMessage,
  deleteDurationChannelMessage,
} from '../database/database.js';
import logger from './logger.js';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Build embed daftar order untuk satu durasi
 */
function buildDurationListEmbed(duration, orders) {
  const label = config.durationLabels[duration] || duration;
  const totalSlots = orders.reduce((s, o) => s + (o.slots || 0), 0);

  const embed = new EmbedBuilder()
    .setColor(durationColor(duration))
    .setTitle(`📋 DAFTAR ORDER PTPT — ${label}`)
    .setTimestamp();

  if (orders.length === 0) {
    embed.setDescription([
      `> ⏱ Durasi: **${label}**`,
      '> 📭 Belum ada order aktif untuk durasi ini.',
    ].join('\n'));
    return embed;
  }

  // Flatten semua slot menjadi baris individual
  const lines = [];
  let nomor = 1;
  for (const order of orders) {
    const slotData = order.slot_data ||
      [{ robloxUsername: order.roblox_username, displayName: order.display_name }];

    for (const slot of slotData) {
      lines.push(
        `\`${String(nomor).padStart(2, '0')}\` ┃ **${slot.robloxUsername}** — ${slot.displayName} ┃ <@${order.user_id}>`
      );
      nomor++;
    }
  }

  embed.setDescription([
    `> ⏱ Durasi: **${label}**`,
    `> 👥 Total Slot Terisi: **${totalSlots} slot** dari **${orders.length} order**`,
    '',
    lines.join('\n'),
    '',
    `*📅 Diperbarui: <t:${Math.floor(Date.now() / 1000)}:R>*`,
  ].join('\n'));

  return embed;
}

function durationColor(duration) {
  const colors = {
    '6h':  0x57F287, // hijau
    '12h': 0x00B0F4, // biru
    '24h': 0xFEE75C, // kuning
    '36h': 0xFF8C00, // oranye
    '48h': 0x9B59B6, // ungu
    '72h': 0xED4245, // merah
  };
  return colors[duration] || 0x5865F2;
}

/**
 * Kirim atau update embed daftar order ke channel durasi yang sesuai.
 * Dipanggil setelah order baru diterima atau setelah reset.
 */
export async function updateDurationChannel(client, duration) {
  try {
    const channelId = config.channels.durationChannels[duration];
    if (!channelId) {
      logger.warn(`Channel untuk durasi ${duration} belum dikonfigurasi di .env`);
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn(`Channel durasi ${duration} (${channelId}) tidak ditemukan`);
      return;
    }

    const orders = getActiveOrdersByDuration(duration);
    const embed = buildDurationListEmbed(duration, orders);
    const msgIds = getDurationChannelMessages();
    const existingMsgId = msgIds[duration];

    if (existingMsgId) {
      const msg = await channel.messages.fetch(existingMsgId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
        return;
      }
    }

    // Kirim pesan baru jika belum ada / tidak ditemukan
    const sent = await channel.send({ embeds: [embed] });
    saveDurationChannelMessage(duration, sent.id);
  } catch (err) {
    logger.error(`Error updateDurationChannel [${duration}]:`, err.message);
  }
}

/**
 * Kirim embed notifikasi order baru ke channel durasi (satu kali, bukan daftar).
 * Dipakai saat order baru masuk — dikirim sebagai pesan terpisah agar terbaca.
 */
export async function sendOrderNotificationToDurationChannel(client, duration, orderData) {
  try {
    const channelId = config.channels.durationChannels[duration];
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const label = config.durationLabels[duration] || duration;
    const slotData = orderData.slotData ||
      [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];

    const slotLines = slotData.map((s, i) =>
      `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(durationColor(duration))
      .setTitle(`🆕 ORDER BARU — ${label}`)
      .setDescription([
        '> Order baru telah **diverifikasi** dan masuk ke daftar.',
        '',
        '**━━━━━━ 👤 DATA USER ━━━━━━**',
        `> **Discord:** <@${orderData.userId}> (\`${orderData.discordUsername}\`)`,
        `> **User ID:** \`${orderData.userId}\``,
        '',
        '**━━━━━━ 🎮 DATA ROBLOX ━━━━━━**',
        slotLines,
        '',
        '**━━━━━━ 📦 DETAIL ORDER ━━━━━━**',
        `> **Durasi:** \`${label}\``,
        `> **Jumlah Slot:** \`${orderData.slots} Slot\``,
        `> **Order ID:** \`${orderData.orderId}\``,
      ].join('\n'))
      .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Order Masuk' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Setelah notif, update juga embed daftar lengkap
    await updateDurationChannel(client, duration);
  } catch (err) {
    logger.error(`Error sendOrderNotificationToDurationChannel [${duration}]:`, err.message);
  }
}

/**
 * Update semua channel durasi sekaligus (untuk refresh periodik atau setelah reset all)
 */
export async function updateAllDurationChannels(client) {
  for (const duration of config.durations) {
    await updateDurationChannel(client, duration);
  }
}

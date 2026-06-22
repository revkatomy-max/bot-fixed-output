// src/utils/durationChannelManager.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import {
  getActiveOrdersByDuration,
  getDurationChannelMessages,
  saveDurationChannelMessage,
} from '../database/database.js';
import logger from './logger.js';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount);
}

function durationColor(duration) {
  const colors = {
    '6h':  0x57F287,
    '12h': 0x00B0F4,
    '24h': 0xFEE75C,
    '36h': 0xFF8C00,
    '48h': 0x9B59B6,
    '72h': 0xED4245,
  };
  return colors[duration] || 0x5865F2;
}

function buildDurationListEmbed(duration, orders) {
  const label = config.durationLabels[duration] || duration;
  const totalSlots = orders.reduce((s, o) => s + (o.slots || 0), 0);

  const embed = new EmbedBuilder()
    .setColor(durationColor(duration))
    .setTitle(`\uD83D\uDCCB DAFTAR ORDER PTPT \u2014 ${label}`)
    .setTimestamp();

  if (orders.length === 0) {
    embed.setDescription([
      `> \u23F1 Durasi: **${label}**`,
      '> \uD83D\uDCED Belum ada order aktif untuk durasi ini.',
    ].join('\n'));
    return embed;
  }

  const lines = [];
  let nomor = 1;
  for (const order of orders) {
    const slotData = order.slot_data ||
      [{ robloxUsername: order.roblox_username, displayName: order.display_name }];
    for (const slot of slotData) {
      lines.push(
        `\`${String(nomor).padStart(2, '0')}\` \u2503 **${slot.robloxUsername}** \u2014 ${slot.displayName} \u2503 <@${order.user_id}>`
      );
      nomor++;
    }
  }

  embed.setDescription([
    `> \u23F1 Durasi: **${label}**`,
    `> \uD83D\uDC65 Total Slot Terisi: **${totalSlots} slot** dari **${orders.length} order**`,
    '',
    lines.join('\n'),
    '',
    `*\uD83D\uDCC5 Diperbarui: <t:${Math.floor(Date.now() / 1000)}:R>*`,
  ].join('\n'));

  return embed;
}

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

    const sent = await channel.send({ embeds: [embed] });
    saveDurationChannelMessage(duration, sent.id);
  } catch (err) {
    logger.error(`Error updateDurationChannel [${duration}]:`, err.message);
  }
}

/**
 * Kirim notifikasi order baru ke channel ORDER MASUK (1 channel semua durasi).
 * Lalu update embed daftar di channel durasi masing-masing.
 */
export async function sendOrderNotificationToDurationChannel(client, duration, orderData) {
  try {
    const label = config.durationLabels[duration] || duration;
    const slotData = orderData.slotData ||
      [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];

    const slotLines = slotData.map((s, i) =>
      `> **Slot ${i + 1}:** \`${s.robloxUsername}\` \u2014 *${s.displayName}*`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(durationColor(duration))
      .setTitle(`\uD83C\uDD95 ORDER BARU \u2014 ${label}`)
      .setDescription([
        '> Order baru telah **diverifikasi** dan masuk ke daftar.',
        '',
        '**\u2501\u2501\u2501\u2501\u2501\u2501 \uD83D\uDC64 DATA USER \u2501\u2501\u2501\u2501\u2501\u2501**',
        `> **Discord:** <@${orderData.userId}> (\`${orderData.discordUsername}\`)`,
        `> **User ID:** \`${orderData.userId}\``,
        '',
        '**\u2501\u2501\u2501\u2501\u2501\u2501 \uD83C\uDFAE DATA ROBLOX \u2501\u2501\u2501\u2501\u2501\u2501**',
        slotLines,
        '',
        '**\u2501\u2501\u2501\u2501\u2501\u2501 \uD83D\uDCE6 DETAIL ORDER \u2501\u2501\u2501\u2501\u2501\u2501**',
        `> **Durasi:** \`${label}\``,
        `> **Jumlah Slot:** \`${orderData.slots} Slot\``,
        `> **Order ID:** \`${orderData.orderId}\``,
      ].join('\n'))
      .setFooter({ text: '\u26A1 PTPT ORDER SYSTEM \u2022 Order Masuk' })
      .setTimestamp();

    // Kirim ke channel ORDER MASUK (1 channel untuk semua durasi)
    const orderMasukId = config.channels.orderMasuk;
    if (!orderMasukId) {
      logger.warn('[ORDER_MASUK] ORDER_MASUK_CHANNEL_ID tidak ada di .env / Railway variables');
    } else {
      const orderMasukChannel = await client.channels.fetch(orderMasukId).catch((err) => {
        logger.error(`[ORDER_MASUK] Gagal fetch channel ID "${orderMasukId}": ${err.message}`);
        return null;
      });
      if (!orderMasukChannel) {
        logger.error(`[ORDER_MASUK] Channel tidak ditemukan atau bot tidak punya akses. Channel ID: "${orderMasukId}"`);
      } else {
        await orderMasukChannel.send({ embeds: [embed] });
        logger.info(`[ORDER_MASUK] Notifikasi order ${orderData.orderId} berhasil dikirim ke channel ${orderMasukId}`);
      }
    }

    // Update daftar di channel durasi masing-masing
    await updateDurationChannel(client, duration);
  } catch (err) {
    logger.error(`Error sendOrderNotificationToDurationChannel [${duration}]:`, err.message);
  }
}

export async function updateAllDurationChannels(client) {
  for (const duration of config.durations) {
    await updateDurationChannel(client, duration);
  }
}

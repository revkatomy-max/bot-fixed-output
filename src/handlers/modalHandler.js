// src/handlers/modalHandler.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import {
  getPrice, setPrice, getAllPrices,
  createOrder, getOrder, updateOrderStatus,
  logTransaction, getTicketByChannelId,
} from '../database/database.js';
import {
  createAdminPanelEmbed, createTransactionLogEmbed,
  createVerificationEmbed, formatRupiah,
} from '../embeds/embedBuilder.js';
import { buildAdminPriceButtons } from '../buttons/buttonBuilder.js';
import { buildDurationSelectMenu } from '../selectmenus/orderSelectMenus.js';
import { isModerator } from '../utils/permissions.js';
import logger from '../utils/logger.js';

const pendingOrders = new Map();

export function getPendingOrder(userId) { return pendingOrders.get(userId); }
export function setPendingOrder(userId, data) {
  pendingOrders.set(userId, data);
  setTimeout(() => pendingOrders.delete(userId), 30 * 60 * 1000);
}
export function clearPendingOrder(userId) { pendingOrders.delete(userId); }

export async function handleModal(interaction) {
  const { customId, user, member } = interaction;

  try {
    // ===== ORDER FORM =====
    if (customId.startsWith('modal_order_ptpt_')) {
      const slots = parseInt(customId.replace('modal_order_ptpt_', ''));
      const pending = getPendingOrder(user.id);

      const slotData = [];
      if (slots <= 2) {
        for (let i = 1; i <= slots; i++) {
          const usn = interaction.fields.getTextInputValue(`roblox_username_${i}`).trim();
          const dn  = interaction.fields.getTextInputValue(`display_name_${i}`).trim();
          slotData.push({ robloxUsername: usn, displayName: dn });
        }
      } else {
        for (let i = 1; i <= slots; i++) {
          const raw = interaction.fields.getTextInputValue(`slot_data_${i}`).trim();
          const parts = raw.split('|').map(s => s.trim());
          slotData.push({
            robloxUsername: parts[0] || raw,
            displayName: parts[1] || parts[0] || raw,
          });
        }
      }

      const server = pending?.server || 'revv';

      setPendingOrder(user.id, { ...(pending || {}), slots, slotData, step: 'select_duration' });

      const lines = slotData.map((s, i) =>
        `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors[server] || config.colors.primary)
        .setTitle('✅ Data Diterima!')
        .setDescription([
          ...lines,
          '',
          '**Langkah selanjutnya:**',
          '> Pilih **durasi order** dari menu di bawah.',
        ].join('\n'))
        .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${config.serverLabels[server]}` })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        components: [buildDurationSelectMenu(server)],
        ephemeral: true,
      });
    }

    // ===== SET PRICE =====
    if (customId.startsWith('modal_set_price_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      }

      // format: modal_set_price_{server}_{duration}
      const parts = customId.replace('modal_set_price_', '').split('_');
      const server   = parts[0];
      const duration = parts[1];

      const priceRaw = interaction.fields.getTextInputValue('new_price').trim();
      const price = parseInt(priceRaw.replace(/\D/g, ''), 10);

      if (isNaN(price) || price <= 0) {
        return interaction.reply({ content: '> ❌ Harga tidak valid!', flags: 64 });
      }
      if (price > 10_000_000) {
        return interaction.reply({ content: '> ❌ Harga terlalu besar! Maksimum 10.000.000.', flags: 64 });
      }

      setPrice(server, duration, price, user.username);

      try {
        const prices = getAllPrices(server);
        await interaction.message?.edit({
          embeds: [createAdminPanelEmbed(prices, server)],
          components: buildAdminPriceButtons(server),
        });
      } catch {}

      return interaction.reply({
        content: `> ✅ Harga **${config.serverLabels[server]} — ${config.durationLabels[duration]}** diupdate ke **${formatRupiah(price)}**!`,
        flags: 64,
      });
    }

    // ===== REJECT PAYMENT =====
    if (customId.startsWith('modal_reject_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      }

      const orderId = customId.replace('modal_reject_', '');
      const reason  = interaction.fields.getTextInputValue('reject_reason').trim();
      const order   = getOrder(orderId);

      if (!order) return interaction.reply({ content: '> ❌ Order tidak ditemukan.', flags: 64 });

      updateOrderStatus(order.order_id, 'rejected', user.username, reason);
      logTransaction(order.order_id, 'PAYMENT_REJECTED', user.username, reason);

      const verifyEmbed = createVerificationEmbed(order, 'reject', user.username, reason);
      const orderData = buildOrderData(order);

      try { await interaction.message?.edit({ components: [] }); } catch {}

      await interaction.reply({
        content: `<@${order.user_id}> ❌ Pembayaranmu ditolak.\n> **Alasan:** ${reason}`,
        embeds: [verifyEmbed],
      });

      const logChannelId = config.channels.transactionLog;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          await logChannel.send({ embeds: [createTransactionLogEmbed(orderData, 'rejected', user.username, reason)] });
        }
      }
    }

  } catch (error) {
    logger.error(`Modal handler error [${customId}]:`, error);
    try {
      const msg = { content: '> ❌ Terjadi kesalahan. Coba lagi.', flags: 64 };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {}
  }
}

function buildOrderData(order) {
  return {
    orderId: order.order_id,
    userId: order.user_id,
    discordUsername: order.discord_username,
    discordMention: `<@${order.user_id}>`,
    server: order.server,
    robloxUsername: order.roblox_username,
    displayName: order.display_name,
    slotData: order.slot_data,
    slots: order.slots,
    duration: order.duration,
    totalPrice: order.total_price,
  };
}

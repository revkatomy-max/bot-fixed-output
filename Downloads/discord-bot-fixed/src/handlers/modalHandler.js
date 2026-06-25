// src/handlers/modalHandler.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import config from '../config/config.js';
import {
  getPrice,
  setPrice,
  getAllPrices,
  createOrder,
  getOrder,
  updateOrderStatus,
  logTransaction,
  getTicketByChannelId,
} from '../database/database.js';
import {
  createAdminPanelEmbed,
  createTransactionLogEmbed,
  createVerificationEmbed,
  formatRupiah,
} from '../embeds/embedBuilder.js';
import {
  buildAdminPriceButtons,
} from '../buttons/buttonBuilder.js';
import { buildSlotSelectMenu, buildDurationSelectMenu } from '../selectmenus/orderSelectMenus.js';
import { isModerator } from '../utils/permissions.js';
import logger from '../utils/logger.js';

// Temp storage for order data (in-memory, per user)
const pendingOrders = new Map();

export function getPendingOrder(userId) {
  return pendingOrders.get(userId);
}

export function setPendingOrder(userId, data) {
  pendingOrders.set(userId, data);
  // Auto cleanup after 30 minutes
  setTimeout(() => pendingOrders.delete(userId), 30 * 60 * 1000);
}

export function clearPendingOrder(userId) {
  pendingOrders.delete(userId);
}

export async function handleModal(interaction) {
  const { customId, user, member } = interaction;

  try {
    // ===== ORDER FORM SUBMIT (dinamis per slot) =====
    if (customId.startsWith('modal_order_ptpt_')) {
      const slots = parseInt(customId.replace('modal_order_ptpt_', ''));
      const pending = getPendingOrder(user.id);

      // Parse data per slot
      const slotData = [];
      if (slots <= 2) {
        for (let i = 1; i <= slots; i++) {
          const usn = interaction.fields.getTextInputValue(`roblox_username_${i}`).trim();
          const dn = interaction.fields.getTextInputValue(`display_name_${i}`).trim();
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

      // Update pending dengan data slot
      setPendingOrder(user.id, {
        ...(pending || {}),
        slots,
        slotData,
        step: 'select_duration',
      });

      // Tampilkan ringkasan + pilih durasi
      const lines = slotData.map((s, i) =>
        `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('✅ Data Diterima!')
        .setDescription([
          ...lines,
          '',
          '**Langkah selanjutnya:**',
          '> Pilih **durasi order** dari menu di bawah.',
        ].join('\n'))
        .setFooter({ text: '⚡ PTPT ORDER SYSTEM' })
        .setTimestamp();

      const { buildDurationSelectMenu } = await import('../selectmenus/orderSelectMenus.js');
      const durationMenu = buildDurationSelectMenu();

      return interaction.reply({
        embeds: [embed],
        components: [durationMenu],
        ephemeral: true,
      });
    }

    // ===== SET PRICE MODAL =====
    if (customId.startsWith('modal_set_price_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      }

      const duration = customId.replace('modal_set_price_', '');
      const priceRaw = interaction.fields.getTextInputValue('new_price').trim();
      const price = parseInt(priceRaw.replace(/\D/g, ''), 10);

      if (isNaN(price) || price <= 0) {
        return interaction.reply({ content: '> ❌ Harga tidak valid! Masukkan angka yang benar.', flags: 64 });
      }

      if (price > 10_000_000) {
        return interaction.reply({ content: '> ❌ Harga terlalu besar! Maksimum 10.000.000.', flags: 64 });
      }

      setPrice(duration, price, user.username);
      const prices = getAllPrices();
      const adminEmbed = createAdminPanelEmbed(prices);
      const priceButtons = buildAdminPriceButtons();

      // Update the original admin panel message
      try {
        await interaction.message?.edit({
          embeds: [adminEmbed],
          components: priceButtons,
        });
      } catch {}

      return interaction.reply({
        content: `> ✅ Harga **${config.durationLabels[duration]}** berhasil diupdate ke **${formatRupiah(price)}**!`,
        ephemeral: true,
      });
    }

    // ===== REJECT PAYMENT MODAL =====
    if (customId.startsWith('modal_reject_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      }

      const orderId = customId.replace('modal_reject_', '');
      const reason = interaction.fields.getTextInputValue('reject_reason').trim();
      const order = getOrder(orderId);

      if (!order) {
        return interaction.reply({ content: '> ❌ Order tidak ditemukan.', flags: 64 });
      }

      updateOrderStatus(order.order_id, 'rejected', user.username, reason);
      logTransaction(order.order_id, 'PAYMENT_REJECTED', user.username, reason);

      const verifyEmbed = createVerificationEmbed(order, 'reject', user.username, reason);

      const orderData = {
        orderId: order.order_id,
        userId: order.user_id,
        discordUsername: order.discord_username,
        discordMention: `<@${order.user_id}>`,
        robloxUsername: order.roblox_username,
        displayName: order.display_name,
        slots: order.slots,
        duration: order.duration,
        totalPrice: order.total_price,
      };

      try {
        await interaction.message?.edit({
          components: [],
        });
      } catch {}

      await interaction.reply({
        content: `<@${order.user_id}> ❌ Pembayaranmu ditolak.\n> **Alasan:** ${reason}`,
        embeds: [verifyEmbed],
      });

      // Log to transaction channel
      const logChannelId = config.channels.transactionLog;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          await logChannel.send({ embeds: [createTransactionLogEmbed(orderData, 'rejected', user.username, reason)] });
        }
      }

      return;
    }

  } catch (error) {
    logger.error(`Modal handler error [${customId}]:`, error);
    try {
      const msg = { content: '> ❌ Terjadi kesalahan. Coba lagi.', flags: 64 };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch {}
  }
}

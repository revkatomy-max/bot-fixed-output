// src/handlers/selectMenuHandler.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import { getPrice, createOrder, getTicketByChannelId, getActiveSlotCount } from '../database/database.js';
import { createOrderSummaryEmbed, formatRupiah } from '../embeds/embedBuilder.js';
import { buildDurationSelectMenu } from '../selectmenus/orderSelectMenus.js';
import { buildOrderActionButtons } from '../buttons/buttonBuilder.js';
import { getPendingOrder, setPendingOrder, clearPendingOrder } from './modalHandler.js';
import generateQRCode from '../utils/qrGenerator.js';
import config2 from '../config/config.js';
import logger from '../utils/logger.js';

export async function handleSelectMenu(interaction) {
  const { customId, user } = interaction;

  try {
    // ===== SLOT SELECTION =====
    if (customId === 'select_slots') {
      const value = interaction.values[0];
      const slots = parseInt(value.replace('slot_', ''));

      // Cek slot limit
      const activeSlots = getActiveSlotCount();
      const maxSlots = config.maxSlots;
      const sisa = maxSlots - activeSlots;

      if (sisa <= 0) {
        return interaction.update({
          content: `> ❌ **Slot PTPT sudah penuh!** (${activeSlots}/${maxSlots} slot terisi)\n> Silakan coba lagi nanti atau hubungi admin.`,
          components: [],
          embeds: [],
        });
      }

      if (slots > sisa) {
        return interaction.update({
          content: `> ❌ Slot tidak cukup! Sisa slot tersedia: **${sisa}** slot.\n> Silakan pilih jumlah slot yang lebih kecil.`,
          components: [],
          embeds: [],
        });
      }

      // Simpan jumlah slot ke pending, lalu tampilkan modal dengan kolom dinamis
      setPendingOrder(user.id, { slots, step: 'fill_form' });

      const { buildOrderModal } = await import('../modals/orderModal.js');
      const modal = buildOrderModal(slots);
      return interaction.showModal(modal);
    }

    // ===== DURATION SELECTION =====
    if (customId === 'select_duration') {
      await interaction.deferUpdate();

      const value = interaction.values[0];
      const duration = value.replace('dur_', '');

      const pending = getPendingOrder(user.id);
      if (!pending) {
        return interaction.editReply({
          content: '> ❌ Session order kamu expired. Klik tombol ORDER PTPT lagi.',
          components: [],
          embeds: [],
        });
      }

      const price = getPrice(duration);
      if (!price) {
        return interaction.editReply({
          content: '> ❌ Harga untuk durasi ini belum diset. Hubungi admin.',
          components: [],
        });
      }

      const totalPrice = price * pending.slots;
      const ticket = getTicketByChannelId(interaction.channelId);

      if (!ticket) {
        return interaction.editReply({
          content: '> ❌ Channel ini bukan ticket yang valid.',
          components: [],
        });
      }

      // Create order in database — gunakan slot pertama sebagai primary, simpan semua slotData
      const primarySlot = pending.slotData?.[0] || { robloxUsername: pending.robloxUsername || '-', displayName: pending.displayName || '-' };
      const orderData = {
        ticketId: ticket.ticket_id,
        userId: user.id,
        discordUsername: user.username,
        robloxUsername: primarySlot.robloxUsername,
        displayName: primarySlot.displayName,
        slotData: pending.slotData || [primarySlot],
        slots: pending.slots,
        duration,
        totalPrice,
      };

      const orderId = createOrder(orderData);
      clearPendingOrder(user.id);

      // Generate QR Code
      const qrisPayload = `${config2.payment.qrisData}|ORDER:${orderId}|AMOUNT:${totalPrice}`;
      let qrAttachment = null;
      try {
        qrAttachment = await generateQRCode(qrisPayload);
      } catch (err) {
        logger.warn('QR generation failed:', err.message);
      }

      const summaryData = {
        ...orderData,
        orderId,
        discordMention: `<@${user.id}>`,
      };

      const summaryEmbed = createOrderSummaryEmbed(summaryData, qrAttachment);
      const actionButtons = buildOrderActionButtons(orderId);

      const messagePayload = {
        content: null,
        embeds: [summaryEmbed],
        components: [actionButtons],
      };

      if (qrAttachment) {
        messagePayload.files = [qrAttachment];
      }

      // Update ephemeral with summary
      await interaction.editReply({
        content: '> ✅ Order berhasil dibuat! QR Code dikirim ke channel ticket.',
        embeds: [],
        components: [],
      });

      // Send to ticket channel (visible to all)
      await interaction.channel.send(messagePayload);

      logger.info(`Order created: ${orderId} by ${user.username}`);
      return;
    }

  } catch (error) {
    logger.error(`SelectMenu handler error [${customId}]:`, error);
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

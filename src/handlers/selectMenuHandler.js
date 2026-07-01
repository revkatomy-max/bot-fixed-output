// src/handlers/selectMenuHandler.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import {
  getPrice, createOrder, getTicketByChannelId, getActiveSlotCount,
} from '../database/database.js';
import { createOrderSummaryEmbed, formatRupiah } from '../embeds/embedBuilder.js';
import { buildSlotSelectMenu, buildDurationSelectMenu } from '../selectmenus/orderSelectMenus.js';
import { buildOrderActionButtons } from '../buttons/buttonBuilder.js';
import { getPendingOrder, setPendingOrder, clearPendingOrder } from './modalHandler.js';
import { isServerOpen } from '../commands/adminpanel.js';
import generateQRCode from '../utils/qrGenerator.js';
import logger from '../utils/logger.js';

export async function handleSelectMenu(interaction) {
  const { customId, user } = interaction;

  try {
    // ===== PILIH SERVER =====
    if (customId === 'select_server') {
      const value = interaction.values[0];
      const server = value.replace('server_', '');

      if (!config.servers.includes(server)) {
        return interaction.update({ content: '> ❌ Server tidak valid.', components: [], embeds: [] });
      }

      if (!isServerOpen(server)) {
        return interaction.update({
          content: `> ❌ **${config.serverLabels[server]}** sedang **TUTUP** saat ini.\n> Silakan pilih server lain atau coba lagi nanti.`,
          components: [],
          embeds: [],
        });
      }

      const activeSlots = getActiveSlotCount(server);
      const maxSlots    = config.maxSlotsPerServer[server];
      const sisa        = maxSlots - activeSlots;

      if (sisa <= 0) {
        return interaction.update({
          content: `> ❌ **Slot ${config.serverLabels[server]} sudah penuh!** (${activeSlots}/${maxSlots})\n> Silakan coba lagi nanti.`,
          components: [],
          embeds: [],
        });
      }

      setPendingOrder(user.id, { server, step: 'select_slots' });

      const embed = new EmbedBuilder()
        .setColor(config.colors[server] || config.colors.primary)
        .setTitle(`🎰 Pilih Jumlah Slot — ${config.serverLabels[server]}`)
        .setDescription([
          `> Sisa slot tersedia: **${sisa}/${maxSlots}**`,
          '',
          '> Pilih berapa slot yang ingin kamu order.',
        ].join('\n'))
        .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${config.serverLabels[server]}` })
        .setTimestamp();

      return interaction.update({
        embeds: [embed],
        components: [buildSlotSelectMenu(sisa)],
      });
    }

    // ===== PILIH SLOT =====
    if (customId === 'select_slots') {
      const slots  = parseInt(interaction.values[0].replace('slot_', ''));
      const pending = getPendingOrder(user.id);
      const server  = pending?.server || 'revv';

      const activeSlots = getActiveSlotCount(server);
      const maxSlots    = config.maxSlotsPerServer[server];
      const sisa        = maxSlots - activeSlots;

      if (sisa <= 0) {
        return interaction.update({ content: `> ❌ Slot ${config.serverLabels[server]} sudah penuh!`, components: [], embeds: [] });
      }
      if (slots > sisa) {
        return interaction.update({
          content: `> ❌ Slot tidak cukup! Sisa: **${sisa}** slot. Pilih lebih kecil.`,
          components: [],
          embeds: [],
        });
      }

      setPendingOrder(user.id, { ...(pending || {}), slots, step: 'fill_form' });

      const { buildOrderModal } = await import('../modals/orderModal.js');
      return interaction.showModal(buildOrderModal(slots));
    }

    // ===== PILIH DURASI =====
    if (customId === 'select_duration') {
      await interaction.deferUpdate();

      const duration = interaction.values[0].replace('dur_', '');
      if (duration === 'none') {
        return interaction.editReply({ content: '> ❌ Tidak ada durasi aktif. Hubungi admin.', components: [], embeds: [] });
      }

      const pending = getPendingOrder(user.id);
      if (!pending) {
        return interaction.editReply({ content: '> ❌ Session expired. Klik ORDER PTPT lagi.', components: [], embeds: [] });
      }

      const server = pending.server || 'revv';
      const price  = getPrice(server, duration);
      if (!price) {
        return interaction.editReply({ content: '> ❌ Harga untuk durasi ini belum diset. Hubungi admin.', components: [] });
      }

      const totalPrice = price * pending.slots;
      const ticket     = getTicketByChannelId(interaction.channelId);
      if (!ticket) {
        return interaction.editReply({ content: '> ❌ Channel ini bukan ticket yang valid.', components: [] });
      }

      const primarySlot = pending.slotData?.[0] || { robloxUsername: '-', displayName: '-' };
      const orderData = {
        ticketId: ticket.ticket_id,
        userId: user.id,
        discordUsername: user.username,
        server,
        robloxUsername: primarySlot.robloxUsername,
        displayName: primarySlot.displayName,
        slotData: pending.slotData || [primarySlot],
        slots: pending.slots,
        duration,
        totalPrice,
      };

      const orderId = createOrder(orderData);
      clearPendingOrder(user.id);

      // Generate QR
      const qrisPayload = `${config.payment.qrisData}|ORDER:${orderId}|AMOUNT:${totalPrice}`;
      let qrAttachment = null;
      try {
        qrAttachment = await generateQRCode(qrisPayload);
      } catch (err) {
        logger.warn('QR generation failed:', err.message);
      }

      const summaryData = { ...orderData, orderId, discordMention: `<@${user.id}>` };
      const summaryEmbed   = createOrderSummaryEmbed(summaryData, qrAttachment);
      const actionButtons  = buildOrderActionButtons(orderId);

      const messagePayload = { content: null, embeds: [summaryEmbed], components: [actionButtons] };
      if (qrAttachment) messagePayload.files = [qrAttachment];

      await interaction.editReply({ content: '> ✅ Order dibuat! QR dikirim ke channel ticket.', embeds: [], components: [] });
      await interaction.channel.send(messagePayload);

      logger.info(`Order created: ${orderId} by ${user.username} (${config.serverLabels[server]})`);
    }

  } catch (error) {
    logger.error(`SelectMenu handler error [${customId}]:`, error);
    try {
      const msg = { content: '> ❌ Terjadi kesalahan. Coba lagi.', flags: 64 };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {}
  }
}

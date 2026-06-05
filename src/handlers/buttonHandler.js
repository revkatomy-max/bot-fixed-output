// src/handlers/buttonHandler.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import config from '../config/config.js';
import {
  getOrderByTicket,
  getOrder,
  updateOrderStatus,
  updatePaymentProof,
  logTransaction,
  claimTicket,
  getTicketByChannelId,
  getAllPrices,
  resetPrices,
  getActiveSlotCount,
  loadDB,
  saveDB,
} from '../database/database.js';
import {
  createPaymentProofEmbed,
  createVerificationEmbed,
  createTransactionLogEmbed,
  createAdminPanelEmbed,
} from '../embeds/embedBuilder.js';
import {
  buildOrderActionButtons,
  buildModeratorVerifyButtons,
  buildAdminPriceButtons,
} from '../buttons/buttonBuilder.js';
import { buildOrderModal } from '../modals/orderModal.js';
import { buildPriceModal, buildRejectModal } from '../modals/orderModal.js';
import { createTicketChannel, closeTicketChannel } from '../tickets/ticketManager.js';
import { isModerator, isAdmin } from '../utils/permissions.js';
import { checkCooldown } from '../utils/cooldownManager.js';
import { setPendingOrder } from './modalHandler.js';
import { isTicketOpen, getEnabledDurations, buildAdminEmbed, buildAdminButtons } from '../commands/adminpanel.js';
import logger from '../utils/logger.js';

export async function handleButton(interaction) {
  const { customId, user, member, guild } = interaction;

  try {
    // ===== CREATE TICKET =====
    if (customId === 'create_ticket') {
      const cooldown = checkCooldown('create_ticket', user.id, 3000);
      if (cooldown > 0) {
        return interaction.reply({ content: `> ⏳ Terlalu cepat! Tunggu ${cooldown} detik.`, flags: 64 });
      }

      // Cek apakah ticket sedang dibuka
      if (!isTicketOpen()) {
        return interaction.reply({
          content: '> 🔴 **Ticket sedang ditutup oleh admin.** Silakan coba lagi nanti.',
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await createTicketChannel(guild, user);

      if (!result.success) {
        if (result.error === 'cooldown') {
          return interaction.editReply({ content: `> ⏳ Kamu sedang dalam cooldown. Tunggu **${result.remaining} detik** lagi.` });
        }
        if (result.error === 'existing') {
          return interaction.editReply({ content: `> ❌ Kamu sudah memiliki ticket aktif: <#${result.channelId}>` });
        }
        return interaction.editReply({ content: `> ❌ Gagal membuat ticket: ${result.message}` });
      }

      return interaction.editReply({ content: `> ✅ Ticket berhasil dibuat! ${result.channel}` });
    }

    // ===== ORDER PTPT (inside ticket) =====
    if (customId === 'order_ptpt') {
      const cooldown = checkCooldown('order_ptpt', user.id, 5000);
      if (cooldown > 0) {
        return interaction.reply({ content: `> ⏳ Terlalu cepat! Tunggu ${cooldown} detik.`, flags: 64 });
      }

      // Cek slot dulu sebelum tampilkan menu
      const activeSlots = getActiveSlotCount();
      const maxSlots = config.maxSlots;
      const sisa = maxSlots - activeSlots;

      if (sisa <= 0) {
        return interaction.reply({
          content: `> ❌ **Slot PTPT sudah penuh!** (${activeSlots}/${maxSlots})\n> Silakan coba lagi nanti.`,
          ephemeral: true,
        });
      }

      // Tampilkan pilih slot dulu
      const { buildSlotSelectMenu } = await import('../selectmenus/orderSelectMenus.js');
      const { EmbedBuilder } = await import('discord.js');
      const slotEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎰 Pilih Jumlah Slot')
        .setDescription([
          `> Sisa slot tersedia: **${sisa}/${maxSlots}**`,
          '',
          '> Pilih berapa slot yang ingin kamu order.',
          '> Setelah memilih, form username akan muncul.',
        ].join('\n'))
        .setFooter({ text: '⚡ PTPT ORDER SYSTEM' })
        .setTimestamp();

      // Simpan pending awal
      setPendingOrder(user.id, { step: 'select_slots' });

      return interaction.reply({
        embeds: [slotEmbed],
        components: [buildSlotSelectMenu(sisa)],
        ephemeral: true,
      });
    }

    // ===== CLOSE TICKET =====
    if (customId === 'close_ticket') {
      const ticket = getTicketByChannelId(interaction.channelId);
      if (!ticket) {
        return interaction.reply({ content: '> ❌ Channel ini bukan ticket.', flags: 64 });
      }

      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Hanya moderator atau admin yang dapat menutup ticket.', flags: 64 });
      }

      return closeTicketChannel(interaction);
    }

    // ===== CLAIM TICKET =====
    if (customId === 'claim_ticket') {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Hanya moderator yang dapat claim ticket.', flags: 64 });
      }

      const ticket = getTicketByChannelId(interaction.channelId);
      if (!ticket) {
        return interaction.reply({ content: '> ❌ Channel ini bukan ticket.', flags: 64 });
      }

      claimTicket(ticket.ticket_id, user.username);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`> ✅ Ticket di-claim oleh ${interaction.user}`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ===== UPLOAD PROOF =====
    if (customId.startsWith('upload_proof_')) {
      const orderId = customId.replace('upload_proof_', '');
      const cooldown = checkCooldown('upload_proof', user.id, 5000);
      if (cooldown > 0) {
        return interaction.reply({ content: `> ⏳ Terlalu cepat! Tunggu ${cooldown} detik.`, flags: 64 });
      }

      const order = getOrder(orderId);
      if (!order) {
        return interaction.reply({ content: '> ❌ Order tidak ditemukan.', flags: 64 });
      }

      if (order.user_id !== user.id && !isModerator(member)) {
        return interaction.reply({ content: '> ❌ Kamu tidak memiliki izin.', flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('📤 Upload Bukti Pembayaran')
        .setDescription([
          '> Kirim gambar bukti pembayaran kamu **sekarang** di channel ini.',
          '',
          '**Format yang diterima:**',
          '> `PNG` • `JPG` • `JPEG` • `WEBP`',
          '',
          '> ⚠️ Kamu punya waktu **2 menit** untuk mengirim gambar.',
        ].join('\n'))
        .setFooter({ text: `Order ID: ${orderId}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 64 });

      // Collect message with image
      const filter = (m) => m.author.id === user.id && m.attachments.size > 0;
      const collector = interaction.channel.createMessageCollector({ filter, time: 120000, max: 1 });

      collector.on('collect', async (msg) => {
        const attachment = msg.attachments.first();
        const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];

        if (!validTypes.includes(attachment.contentType)) {
          await msg.reply('> ❌ Format file tidak valid! Hanya PNG, JPG, JPEG, WEBP yang diterima.');
          return;
        }

        try {
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

          // Fetch gambar sebagai buffer agar tidak expired saat dikirim ke moderator
          let imageAttachment = null;
          let imageUrl = attachment.url;
          try {
            const fetch = (await import('node-fetch')).default;
            const res = await fetch(attachment.url);
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer());
              const ext = attachment.name?.split('.').pop() || 'png';
              imageAttachment = new AttachmentBuilder(buffer, { name: `bukti_tf.${ext}` });
              imageUrl = `attachment://bukti_tf.${ext}`;
            }
          } catch (fetchErr) {
            logger.warn('Gagal fetch gambar bukti, fallback ke URL:', fetchErr.message);
          }

          updatePaymentProof(order.order_id, attachment.url);
          updateOrderStatus(order.order_id, 'proof_uploaded');
          logTransaction(order.order_id, 'PROOF_UPLOADED', user.username);

          // Hapus pesan buyer SETELAH berhasil fetch gambar
          await msg.delete().catch(() => {});

          const proofEmbed = createPaymentProofEmbed(orderData, imageUrl);
          const verifyButtons = buildModeratorVerifyButtons(order.order_id);

          const sendPayload = {
            content: `<@&${config.roles.moderator || ''}> 🔔 Bukti pembayaran telah diupload!`,
            embeds: [proofEmbed],
            components: [verifyButtons],
          };
          if (imageAttachment) {
            sendPayload.files = [imageAttachment];
          }

          await interaction.channel.send(sendPayload);

          // Log to transaction channel
          await sendToTransactionLog(interaction.guild, createTransactionLogEmbed(orderData, 'proof_uploaded'));

          // Auto-close ticket setelah bukti berhasil diupload
          await interaction.channel.send({
            content: `> ✅ Bukti pembayaran diterima. Ticket akan ditutup otomatis dalam **5 detik**...`,
          });
          setTimeout(async () => {
            try {
              await closeTicketChannel(interaction);
            } catch {}
          }, 5000);
        } catch (err) {
          logger.error('Error processing proof upload:', err);
        }
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp({ content: '> ⏰ Waktu upload habis. Klik tombol Upload Bukti lagi.', flags: 64 }).catch(() => {});
        }
      });

      return;
    }

    // ===== ACCEPT PAYMENT =====
    if (customId.startsWith('accept_payment_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Hanya moderator yang dapat verifikasi pembayaran.', flags: 64 });
      }

      const orderId = customId.replace('accept_payment_', '');
      const order = getOrder(orderId);
      if (!order) {
        return interaction.reply({ content: '> ❌ Order tidak ditemukan.', flags: 64 });
      }

      updateOrderStatus(order.order_id, 'accepted', user.username);
      logTransaction(order.order_id, 'PAYMENT_ACCEPTED', user.username);

      const verifyEmbed = createVerificationEmbed(order, 'accept', user.username);

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

      await interaction.update({
        embeds: [interaction.message.embeds[0], verifyEmbed],
        components: [],
      });

      await interaction.followUp({ content: `<@${order.user_id}> ✅ Pembayaranmu telah diverifikasi!` });
      await sendToTransactionLog(interaction.guild, createTransactionLogEmbed(orderData, 'accepted', user.username));

      // Update slot list channel (tampilan global)
      const { updateSlotList } = await import('../utils/slotListUpdater.js');
      await updateSlotList(interaction.client);

      // Kirim notifikasi + update daftar ke channel durasi yang sesuai
      const { sendOrderNotificationToDurationChannel } = await import('../utils/durationChannelManager.js');
      const acceptedOrder = getOrder(order.order_id);
      await sendOrderNotificationToDurationChannel(interaction.client, acceptedOrder.duration, {
        orderId: acceptedOrder.order_id,
        userId: acceptedOrder.user_id,
        discordUsername: acceptedOrder.discord_username,
        robloxUsername: acceptedOrder.roblox_username,
        displayName: acceptedOrder.display_name,
        slotData: acceptedOrder.slot_data || null,
        slots: acceptedOrder.slots,
        duration: acceptedOrder.duration,
        totalPrice: acceptedOrder.total_price,
      });

      // Cek slot setelah accept: jika slot sudah penuh, auto-close semua ticket open lainnya
      const activeSlots = getActiveSlotCount();
      const maxSlots = config.maxSlots;
      if (activeSlots >= maxSlots) {
        await autoCloseOpenTickets(interaction.guild, interaction.channel.id, maxSlots, activeSlots);
      }

      return;
    }

    // ===== REJECT PAYMENT =====
    if (customId.startsWith('reject_payment_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Hanya moderator yang dapat verifikasi pembayaran.', flags: 64 });
      }

      const orderId = customId.replace('reject_payment_', '');
      const modal = buildRejectModal(orderId);
      return interaction.showModal(modal);
    }

    // ===== ADMIN TOGGLE TICKET OPEN/CLOSE =====
    if (customId === 'admin_toggle_ticket') {
      if (!isAdmin(member)) {
        return interaction.reply({ content: '> ❌ Hanya Admin/Owner yang dapat mengubah status ticket.', flags: 64 });
      }

      const { loadDB: ldb, saveDB: sdb } = await import('../database/database.js');
      const db = ldb();
      if (!db.settings) db.settings = { ticketOpen: true, enabledDurations: config.durations };
      db.settings.ticketOpen = !db.settings.ticketOpen;
      sdb(db);

      const { buildAdminEmbed, buildAdminButtons } = await import('../commands/adminpanel.js');
      await interaction.update({
        embeds: [buildAdminEmbed(db.settings)],
        components: buildAdminButtons(db.settings),
      });
      return;
    }

    // ===== ADMIN TOGGLE DURATION =====
    if (customId.startsWith('admin_toggle_dur_')) {
      if (!isAdmin(member)) {
        return interaction.reply({ content: '> ❌ Hanya Admin/Owner yang dapat mengubah durasi.', flags: 64 });
      }

      const dur = customId.replace('admin_toggle_dur_', '');
      const { loadDB: ldb, saveDB: sdb } = await import('../database/database.js');
      const db = ldb();
      if (!db.settings) db.settings = { ticketOpen: true, enabledDurations: config.durations };
      if (!db.settings.enabledDurations) db.settings.enabledDurations = [...config.durations];

      const idx = db.settings.enabledDurations.indexOf(dur);
      if (idx >= 0) {
        db.settings.enabledDurations.splice(idx, 1);
      } else {
        db.settings.enabledDurations.push(dur);
      }
      sdb(db);

      const { buildAdminEmbed, buildAdminButtons } = await import('../commands/adminpanel.js');
      await interaction.update({
        embeds: [buildAdminEmbed(db.settings)],
        components: buildAdminButtons(db.settings),
      });
      return;
    }

    // ===== ADMIN EDIT PRICE BUTTONS =====
    if (customId.startsWith('admin_edit_price_')) {
      if (!isModerator(member)) {
        return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      }

      const duration = customId.replace('admin_edit_price_', '');
      if (!config.durations.includes(duration)) {
        return interaction.reply({ content: '> ❌ Durasi tidak valid.', flags: 64 });
      }

      const modal = buildPriceModal(duration);
      return interaction.showModal(modal);
    }

    // ===== ADMIN RESET PRICES =====
    if (customId === 'admin_reset_prices') {
      if (!isAdmin(member)) {
        return interaction.reply({ content: '> ❌ Hanya Admin/Owner yang dapat reset harga.', flags: 64 });
      }

      resetPrices(user.username);
      const prices = getAllPrices();
      const adminEmbed = createAdminPanelEmbed(prices);
      const priceButtons = buildAdminPriceButtons();

      await interaction.update({
        embeds: [adminEmbed],
        components: priceButtons,
      });

      await interaction.followUp({ content: '> ✅ Semua harga berhasil direset ke default!', flags: 64 });
      return;
    }

  } catch (error) {
    logger.error(`Button handler error [${customId}]:`, error);
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

// ===== HELPER: Kirim log ke channel transaksi =====
async function sendToTransactionLog(guild, embed) {
  try {
    const logChannelId = config.channels.transactionLog;
    if (!logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error('Error sending to transaction log:', err.message);
  }
}

// Auto-close semua ticket yang masih open jika slot sudah penuh
async function autoCloseOpenTickets(guild, excludeChannelId, maxSlots, activeSlots) {
  try {
    const { loadDB, closeTicket } = await import('../database/database.js');
    const db = loadDB();
    const openTickets = Object.values(db.tickets).filter(
      t => t.status === 'open' && t.channel_id !== excludeChannelId
    );

    for (const ticket of openTickets) {
      try {
        const channel = guild.channels.cache.get(ticket.channel_id);
        if (!channel) continue;

        const { EmbedBuilder } = await import('discord.js');
        const fullEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🔒 SLOT PTPT PENUH — TICKET DITUTUP OTOMATIS')
          .setDescription([
            `> ⚠️ Semua slot PTPT sudah terisi penuh **(${activeSlots}/${maxSlots} slot)**.`,
            '> Ticket ini ditutup otomatis. Silakan coba lagi nanti.',
          ].join('\n'))
          .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Auto-Close' })
          .setTimestamp();

        await channel.send({ content: `<@${ticket.user_id}>`, embeds: [fullEmbed] });

        // Tutup ticket di DB lalu hapus channel setelah 5 detik
        closeTicket(ticket.ticket_id);
        setTimeout(async () => {
          try { await channel.delete(); } catch {}
        }, 5000);
      } catch (err) {
        logger.error(`Gagal auto-close ticket ${ticket.ticket_id}:`, err);
      }
    }
  } catch (err) {
    logger.error('Error in autoCloseOpenTickets:', err);
  }
}

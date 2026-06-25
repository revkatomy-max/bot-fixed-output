// src/handlers/buttonHandler.js
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import config from '../config/config.js';
import {
  getOrder, updateOrderStatus, updatePaymentProof,
  logTransaction, claimTicket, getTicketByChannelId,
  getAllPrices, resetPrices, getActiveSlotCount,
  loadDB, saveDB, closeTicket,
} from '../database/database.js';
import {
  createPaymentProofEmbed, createVerificationEmbed,
  createTransactionLogEmbed, createAdminPanelEmbed,
} from '../embeds/embedBuilder.js';
import {
  buildOrderActionButtons, buildModeratorVerifyButtons,
  buildAdminPriceButtons, buildAdminServerSelectButtons,
} from '../buttons/buttonBuilder.js';
import { buildRejectModal, buildPriceModal } from '../modals/orderModal.js';
import { createTicketChannel, closeTicketChannel } from '../tickets/ticketManager.js';
import { buildServerSelectMenu } from '../selectmenus/orderSelectMenus.js';
import { isModerator, isAdmin } from '../utils/permissions.js';
import { checkCooldown } from '../utils/cooldownManager.js';
import { setPendingOrder } from './modalHandler.js';
import { isTicketOpen, buildAdminEmbed, buildAdminButtons } from '../commands/adminpanel.js';
import logger from '../utils/logger.js';

export async function handleButton(interaction) {
  const { customId, user, member, guild } = interaction;

  try {
    // ===== CREATE TICKET =====
    if (customId === 'create_ticket') {
      const cooldown = checkCooldown('create_ticket', user.id, 3000);
      if (cooldown > 0) return interaction.reply({ content: `> ⏳ Terlalu cepat! Tunggu ${cooldown} detik.`, flags: 64 });
      if (!isTicketOpen()) return interaction.reply({ content: '> 🔴 **Ticket sedang ditutup oleh admin.**', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const result = await createTicketChannel(guild, user);

      if (!result.success) {
        if (result.error === 'cooldown')  return interaction.editReply({ content: `> ⏳ Cooldown. Tunggu **${result.remaining} detik** lagi.` });
        if (result.error === 'existing') return interaction.editReply({ content: `> ❌ Kamu sudah punya ticket aktif: <#${result.channelId}>` });
        return interaction.editReply({ content: `> ❌ Gagal membuat ticket: ${result.message}` });
      }
      return interaction.editReply({ content: `> ✅ Ticket berhasil dibuat! ${result.channel}` });
    }

    // ===== ORDER PTPT — tampilkan pilih server =====
    if (customId === 'order_ptpt') {
      const cooldown = checkCooldown('order_ptpt', user.id, 5000);
      if (cooldown > 0) return interaction.reply({ content: `> ⏳ Terlalu cepat! Tunggu ${cooldown} detik.`, flags: 64 });

      // Cek apakah setidaknya ada 1 server yang masih punya slot
      const revvFull = getActiveSlotCount('revv') >= config.maxSlotsPerServer.revv;
      const iboFull  = getActiveSlotCount('ibo')  >= config.maxSlotsPerServer.ibo;

      if (revvFull && iboFull) {
        return interaction.reply({
          content: '> ❌ **Semua slot PTPT sudah penuh!** Coba lagi nanti.',
          ephemeral: true,
        });
      }

      setPendingOrder(user.id, { step: 'select_server' });

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🖥️ Pilih Server PTPT')
        .setDescription([
          `> 🔵 **${config.serverLabels.revv}** — ${config.maxSlotsPerServer.revv - getActiveSlotCount('revv')} slot tersisa`,
          `> 🟣 **${config.serverLabels.ibo}** — ${config.maxSlotsPerServer.ibo - getActiveSlotCount('ibo')} slot tersisa`,
        ].join('\n'))
        .setFooter({ text: '⚡ PTPT ORDER SYSTEM' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        components: [buildServerSelectMenu()],
        ephemeral: true,
      });
    }

    // ===== CLOSE TICKET =====
    if (customId === 'close_ticket') {
      const ticket = getTicketByChannelId(interaction.channelId);
      if (!ticket) return interaction.reply({ content: '> ❌ Channel ini bukan ticket.', flags: 64 });
      if (!isModerator(member)) return interaction.reply({ content: '> ❌ Hanya moderator yang dapat menutup ticket.', flags: 64 });
      return closeTicketChannel(interaction);
    }

    // ===== CLAIM TICKET =====
    if (customId === 'claim_ticket') {
      if (!isModerator(member)) return interaction.reply({ content: '> ❌ Hanya moderator yang dapat claim ticket.', flags: 64 });
      const ticket = getTicketByChannelId(interaction.channelId);
      if (!ticket) return interaction.reply({ content: '> ❌ Channel ini bukan ticket.', flags: 64 });
      claimTicket(ticket.ticket_id, user.username);
      const embed = new EmbedBuilder().setColor(config.colors.success).setDescription(`> ✅ Ticket di-claim oleh ${interaction.user}`).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ===== UPLOAD PROOF =====
    if (customId.startsWith('upload_proof_')) {
      const orderId = customId.replace('upload_proof_', '');
      const cooldown = checkCooldown('upload_proof', user.id, 5000);
      if (cooldown > 0) return interaction.reply({ content: `> ⏳ Terlalu cepat! Tunggu ${cooldown} detik.`, flags: 64 });

      const order = getOrder(orderId);
      if (!order) return interaction.reply({ content: '> ❌ Order tidak ditemukan.', flags: 64 });
      if (order.user_id !== user.id && !isModerator(member)) return interaction.reply({ content: '> ❌ Kamu tidak memiliki izin.', flags: 64 });

      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('📤 Upload Bukti Pembayaran')
        .setDescription(['> Kirim gambar bukti pembayaran di channel ini.', '', '**Format:** `PNG` • `JPG` • `JPEG` • `WEBP`', '> ⚠️ Waktu **2 menit**.'].join('\n'))
        .setFooter({ text: `Order ID: ${orderId}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 64 });

      const filter    = (m) => m.author.id === user.id && m.attachments.size > 0;
      const collector = interaction.channel.createMessageCollector({ filter, time: 120000, max: 1 });

      collector.on('collect', async (msg) => {
        const attachment = msg.attachments.first();
        const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
        if (!validTypes.includes(attachment.contentType)) {
          await msg.reply('> ❌ Format tidak valid! Hanya PNG, JPG, JPEG, WEBP.');
          return;
        }

        try {
          const orderData = buildOrderData(order);
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
            logger.warn('Gagal fetch gambar bukti:', fetchErr.message);
          }

          updatePaymentProof(order.order_id, attachment.url);
          updateOrderStatus(order.order_id, 'proof_uploaded');
          logTransaction(order.order_id, 'PROOF_UPLOADED', user.username);

          await msg.delete().catch(() => {});

          const proofEmbed  = createPaymentProofEmbed(orderData, imageUrl);
          const verifyBtns  = buildModeratorVerifyButtons(order.order_id);

          const sendPayload = {
            content: `<@&${config.roles.moderator || ''}> 🔔 Bukti pembayaran diupload!`,
            embeds: [proofEmbed],
            components: [verifyBtns],
          };
          if (imageAttachment) sendPayload.files = [imageAttachment];

          await interaction.channel.send(sendPayload);
          await sendToTransactionLog(guild, createTransactionLogEmbed(orderData, 'proof_uploaded'));

          await interaction.channel.send({ content: '> ✅ Bukti diterima. Ticket ditutup otomatis dalam **5 detik**...' });

          setTimeout(async () => {
            try {
              const ticket = getTicketByChannelId(interaction.channelId);
              if (!ticket) return;
              closeTicket(ticket.ticket_id);
              await interaction.channel.delete().catch(() => {});
            } catch (e) {
              logger.error('Error auto-closing ticket after proof:', e);
            }
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
      if (!isModerator(member)) return interaction.reply({ content: '> ❌ Hanya moderator.', flags: 64 });
      const orderId = customId.replace('accept_payment_', '');
      const order   = getOrder(orderId);
      if (!order) return interaction.reply({ content: '> ❌ Order tidak ditemukan.', flags: 64 });

      updateOrderStatus(order.order_id, 'accepted', user.username);
      logTransaction(order.order_id, 'PAYMENT_ACCEPTED', user.username);

      const orderData    = buildOrderData(order);
      const verifyEmbed  = createVerificationEmbed(order, 'accept', user.username);

      await interaction.update({ embeds: [interaction.message.embeds[0], verifyEmbed], components: [] });
      await interaction.followUp({ content: `<@${order.user_id}> ✅ Pembayaranmu telah diverifikasi! Server: **${config.serverLabels[order.server] || order.server}**` });
      await sendToTransactionLog(guild, createTransactionLogEmbed(orderData, 'accepted', user.username));

      const { updateSlotList } = await import('../utils/slotListUpdater.js');
      await updateSlotList(interaction.client, order.server);

      // Cek auto-close jika slot penuh
      const activeSlots = getActiveSlotCount(order.server);
      const maxSlots    = config.maxSlotsPerServer[order.server];
      if (activeSlots >= maxSlots) {
        await autoCloseOpenTickets(guild, interaction.channel.id, order.server, maxSlots, activeSlots);
      }
      return;
    }

    // ===== REJECT PAYMENT =====
    if (customId.startsWith('reject_payment_')) {
      if (!isModerator(member)) return interaction.reply({ content: '> ❌ Hanya moderator.', flags: 64 });
      const orderId = customId.replace('reject_payment_', '');
      return interaction.showModal(buildRejectModal(orderId));
    }

    // ===== ADMIN TOGGLE TICKET =====
    if (customId === 'admin_toggle_ticket') {
      if (!isAdmin(member)) return interaction.reply({ content: '> ❌ Hanya Admin.', flags: 64 });
      const db = loadDB();
      if (!db.settings) db.settings = { ticketOpen: true, enabledDurations: { revv: [...config.durations], ibo: [...config.durations] } };
      db.settings.ticketOpen = !db.settings.ticketOpen;
      saveDB(db);
      await interaction.update({ embeds: [buildAdminEmbed(db.settings)], components: buildAdminButtons(db.settings) });
      return;
    }

    // ===== ADMIN TOGGLE DURASI PER SERVER =====
    // format: admin_toggle_dur_{server}_{duration}
    if (customId.startsWith('admin_toggle_dur_')) {
      if (!isAdmin(member)) return interaction.reply({ content: '> ❌ Hanya Admin.', flags: 64 });
      const parts    = customId.replace('admin_toggle_dur_', '').split('_');
      const server   = parts[0];
      const duration = parts[1];

      const db = loadDB();
      if (!db.settings) db.settings = { ticketOpen: true, enabledDurations: { revv: [...config.durations], ibo: [...config.durations] } };
      if (!db.settings.enabledDurations) db.settings.enabledDurations = { revv: [...config.durations], ibo: [...config.durations] };
      if (!db.settings.enabledDurations[server]) db.settings.enabledDurations[server] = [...config.durations];

      const idx = db.settings.enabledDurations[server].indexOf(duration);
      if (idx >= 0) db.settings.enabledDurations[server].splice(idx, 1);
      else db.settings.enabledDurations[server].push(duration);
      saveDB(db);

      await interaction.update({ embeds: [buildAdminEmbed(db.settings)], components: buildAdminButtons(db.settings) });
      return;
    }

    // ===== ADMIN PILIH SERVER UNTUK EDIT HARGA =====
    if (customId.startsWith('admin_prices_server_')) {
      if (!isModerator(member)) return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      const server = customId.replace('admin_prices_server_', '');
      const prices = getAllPrices(server);
      await interaction.update({
        embeds: [createAdminPanelEmbed(prices, server)],
        components: buildAdminPriceButtons(server),
      });
      return;
    }

    // ===== ADMIN EDIT HARGA =====
    // format: admin_edit_price_{server}_{duration}
    if (customId.startsWith('admin_edit_price_')) {
      if (!isModerator(member)) return interaction.reply({ content: '> ❌ Akses ditolak.', flags: 64 });
      const parts    = customId.replace('admin_edit_price_', '').split('_');
      const server   = parts[0];
      const duration = parts[1];
      if (!config.servers.includes(server) || !config.durations.includes(duration)) {
        return interaction.reply({ content: '> ❌ Parameter tidak valid.', flags: 64 });
      }
      return interaction.showModal(buildPriceModal(server, duration));
    }

    // ===== ADMIN RESET HARGA =====
    // format: admin_reset_prices_{server}
    if (customId.startsWith('admin_reset_prices_')) {
      if (!isAdmin(member)) return interaction.reply({ content: '> ❌ Hanya Admin.', flags: 64 });
      const server = customId.replace('admin_reset_prices_', '');
      resetPrices(server, user.username);
      const prices = getAllPrices(server);
      await interaction.update({ embeds: [createAdminPanelEmbed(prices, server)], components: buildAdminPriceButtons(server) });
      await interaction.followUp({ content: `> ✅ Harga **${config.serverLabels[server]}** direset ke default!`, flags: 64 });
      return;
    }

  } catch (error) {
    logger.error(`Button handler error [${customId}]:`, error);
    try {
      const msg = { content: '> ❌ Terjadi kesalahan. Coba lagi.', flags: 64 };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {}
  }
}

// ===== HELPERS =====

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

async function sendToTransactionLog(guild, embed) {
  try {
    const logChannelId = config.channels.transactionLog;
    if (!logChannelId) return;
    const ch = guild.channels.cache.get(logChannelId);
    if (!ch) return;
    await ch.send({ embeds: [embed] });
  } catch (err) {
    logger.error('Error sending to transaction log:', err.message);
  }
}

async function autoCloseOpenTickets(guild, excludeChannelId, server, maxSlots, activeSlots) {
  try {
    const db = loadDB();
    const openTickets = Object.values(db.tickets).filter(
      t => t.status === 'open' && t.channel_id !== excludeChannelId
    );
    for (const ticket of openTickets) {
      try {
        const channel = guild.channels.cache.get(ticket.channel_id);
        if (!channel) continue;
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`🔒 SLOT ${config.serverLabels[server].toUpperCase()} PENUH`)
          .setDescription([
            `> ⚠️ Semua slot **${config.serverLabels[server]}** sudah terisi **(${activeSlots}/${maxSlots})**.`,
            '> Ticket ini ditutup otomatis. Silakan coba lagi nanti.',
          ].join('\n'))
          .setTimestamp();
        await channel.send({ content: `<@${ticket.user_id}>`, embeds: [embed] });
        closeTicket(ticket.ticket_id);
        setTimeout(async () => { try { await channel.delete(); } catch {} }, 5000);
      } catch (err) {
        logger.error(`Gagal auto-close ticket ${ticket.ticket_id}:`, err);
      }
    }
  } catch (err) {
    logger.error('Error in autoCloseOpenTickets:', err);
  }
}

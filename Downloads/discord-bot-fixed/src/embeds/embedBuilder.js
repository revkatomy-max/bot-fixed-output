// src/embeds/embedBuilder.js
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import config from '../config/config.js';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatTimestamp(date = new Date()) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function createTicketOpenEmbed(user, ticketId) {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎫 TICKET PTPT ORDER')
    .setDescription([
      `> Halo ${user}! Selamat datang di ticket order PTPT untuk boost server x8.`,
      '',
      '**Langkah berikutnya:**',
      '1️⃣ Klik tombol **ORDER PTPT** untuk mengisi form order',
      '2️⃣ Isi form dengan data Roblox kamu',
      '3️⃣ Pilih jumlah slot dan durasi yang diinginkan',
      '4️⃣ Lakukan pembayaran sesuai QR yang muncul',
      '5️⃣ Upload bukti pembayaran',
      '6️⃣ Tunggu verifikasi dari moderator',
    ].join('\n'))
    .addFields(
      { name: '🆔 Ticket ID', value: `\`${ticketId}\``, inline: true },
      { name: '👤 User', value: `${user}`, inline: true },
      { name: '📅 Dibuat', value: formatTimestamp(), inline: true }
    )
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Powered by Bot' })
    .setTimestamp();
}

export function createOrderSummaryEmbed(orderData, qrAttachment = null) {
  const embed = new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle('🛒 RINGKASAN ORDER PTPT')
    .setDescription('> Scan QR Code di bawah untuk melakukan pembayaran')
    .addFields(
      {
        name: '━━━━━━━ 👤 DATA USER ━━━━━━━',
        value: [
          `> **Discord:** ${orderData.discordMention} (\`${orderData.discordUsername}\`)`,
          `> **Discord ID:** \`${orderData.userId}\``,
        ].join('\n'),
        inline: false
      },
      {
        name: '━━━━━━━ 🎮 DATA ROBLOX ━━━━━━━',
        value: (() => {
          const slots = orderData.slotData || [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];
          return slots.map((s, i) =>
            `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`
          ).join('\n');
        })(),
        inline: false
      },
      {
        name: '━━━━━━━ 📦 DETAIL ORDER ━━━━━━━',
        value: [
          `> **Jumlah Slot:** \`${orderData.slots} Slot\``,
          `> **Durasi:** \`${config.durationLabels[orderData.duration]}\``,
          `> **Total Harga:** \`${formatRupiah(orderData.totalPrice)}\``,
        ].join('\n'),
        inline: false
      },
      {
        name: '━━━━━━━ 💳 STATUS ━━━━━━━',
        value: '> 🟡 **MENUNGGU PEMBAYARAN**',
        inline: false
      }
    )
    .addFields(
      { name: '🆔 Order ID', value: `\`${orderData.orderId}\``, inline: true },
      { name: '📅 Waktu Order', value: formatTimestamp(), inline: true }
    )
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Scan QR untuk bayar' })
    .setTimestamp();

  if (qrAttachment) {
    embed.setImage('attachment://qrcode.png');
  }

  return embed;
}

export function createPaymentProofEmbed(orderData, proofUrl) {
  return new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('📤 BUKTI PEMBAYARAN DITERIMA')
    .setDescription('> Bukti pembayaran telah diupload, menunggu verifikasi moderator.')
    .addFields(
      {
        name: '━━━━━━━ 👤 DATA USER ━━━━━━━',
        value: [
          `> **Discord:** ${orderData.discordMention} (\`${orderData.discordUsername}\`)`,
          `> **Discord ID:** \`${orderData.userId}\``,
        ].join('\n'),
        inline: false
      },
      {
        name: '━━━━━━━ 🎮 DATA ROBLOX ━━━━━━━',
        value: (() => {
          const slots = orderData.slotData || [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];
          return slots.map((s, i) =>
            `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`
          ).join('\n');
        })(),
        inline: false
      },
      {
        name: '━━━━━━━ 📦 DETAIL ORDER ━━━━━━━',
        value: [
          `> **Jumlah Slot:** \`${orderData.slots} Slot\``,
          `> **Durasi:** \`${config.durationLabels[orderData.duration]}\``,
          `> **Total Harga:** \`${formatRupiah(orderData.totalPrice)}\``,
        ].join('\n'),
        inline: false
      },
      {
        name: '━━━━━━━ 💳 STATUS ━━━━━━━',
        value: '> 🟠 **MENUNGGU VERIFIKASI**',
        inline: false
      },
      { name: '🆔 Order ID', value: `\`${orderData.orderId}\``, inline: true },
      { name: '⏰ Upload At', value: formatTimestamp(), inline: true }
    )
    .setImage(proofUrl)
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Moderator harap verifikasi pembayaran' })
    .setTimestamp();
}

export function createTransactionLogEmbed(orderData, status, verifier = null, rejectReason = null) {
  const statusMap = {
    pending: { color: config.colors.warning, emoji: '🟡', text: 'MENUNGGU PEMBAYARAN' },
    proof_uploaded: { color: 0xFF8C00, emoji: '🟠', text: 'MENUNGGU VERIFIKASI' },
    accepted: { color: config.colors.success, emoji: '🟢', text: 'PEMBAYARAN BERHASIL' },
    rejected: { color: config.colors.danger, emoji: '🔴', text: 'PEMBAYARAN DITOLAK' },
  };

  const st = statusMap[status] || statusMap.pending;

  const embed = new EmbedBuilder()
    .setColor(st.color)
    .setTitle(`${st.emoji} LOG TRANSAKSI PTPT`)
    .setDescription(`> Status: **${st.text}**`)
    .addFields(
      {
        name: '👤 Data User',
        value: [
          `**Discord:** \`${orderData.discordUsername}\``,
          `**ID:** \`${orderData.userId}\``,
        ].join('\n'),
        inline: true
      },
      {
        name: '🎮 Data Roblox',
        value: [
          `**Username:** \`${orderData.robloxUsername}\``,
          `**Display:** \`${orderData.displayName}\``,
        ].join('\n'),
        inline: true
      },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: '📦 Detail Order',
        value: [
          `**Slot:** \`${orderData.slots} Slot\``,
          `**Durasi:** \`${config.durationLabels[orderData.duration]}\``,
          `**Harga:** \`${formatRupiah(orderData.totalPrice)}\``,
        ].join('\n'),
        inline: true
      },
      { name: '🆔 Order ID', value: `\`${orderData.orderId}\``, inline: true },
    );

  if (verifier) {
    embed.addFields({ name: '✅ Verifikator', value: `\`${verifier}\``, inline: true });
  }

  if (rejectReason) {
    embed.addFields({ name: '❌ Alasan Penolakan', value: `> ${rejectReason}`, inline: false });
  }

  embed
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Transaction Log' })
    .setTimestamp();

  return embed;
}

export function createPricesEmbed(prices) {
  const priceList = prices.map(p => {
    const label = config.durationLabels[p.duration] || p.duration;
    return `> **${label}:** \`${formatRupiah(p.price)}\` per slot`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(config.colors.purple)
    .setTitle('💰 DAFTAR HARGA PTPT')
    .setDescription(priceList || '> Belum ada harga yang diset.')
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Harga per slot' })
    .setTimestamp();
}

export function createAdminPanelEmbed(prices) {
  const priceList = prices.map(p => {
    const label = config.durationLabels[p.duration] || p.duration;
    return `> **${label}:** \`${formatRupiah(p.price)}\` *(diupdate: <t:${Math.floor(new Date(p.updated_at + 'Z').getTime() / 1000)}:R>)*`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('⚙️ ADMIN PANEL HARGA PTPT')
    .setDescription([
      '> Kelola harga PTPT secara realtime.',
      '',
      '**Harga Saat Ini:**',
      priceList || '> Belum ada harga.',
    ].join('\n'))
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Admin Only' })
    .setTimestamp();
}

export function createVerificationEmbed(orderData, action, verifier, rejectReason = null) {
  const isAccepted = action === 'accept';
  return new EmbedBuilder()
    .setColor(isAccepted ? config.colors.success : config.colors.danger)
    .setTitle(isAccepted ? '✅ PEMBAYARAN DITERIMA' : '❌ PEMBAYARAN DITOLAK')
    .setDescription(isAccepted
      ? '> Pembayaran kamu telah diverifikasi! Order akan segera diproses.'
      : `> Maaf, pembayaran kamu ditolak.\n> **Alasan:** ${rejectReason || 'Tidak ada alasan'}`)
    .addFields(
      { name: '🆔 Order ID', value: `\`${orderData.order_id}\``, inline: true },
      { name: '✅ Verifikator', value: `\`${verifier}\``, inline: true },
      { name: '⏰ Waktu', value: formatTimestamp(), inline: true },
    )
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM' })
    .setTimestamp();
}

export { formatRupiah };

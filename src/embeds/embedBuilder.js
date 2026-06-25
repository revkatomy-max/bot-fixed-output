// src/embeds/embedBuilder.js
import { EmbedBuilder } from 'discord.js';
import config from '../config/config.js';

export function formatRupiah(amount) {
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
      `> Halo ${user}! Selamat datang di ticket order PTPT.`,
      '',
      '**Langkah berikutnya:**',
      '1️⃣ Klik tombol **ORDER PTPT**',
      '2️⃣ Pilih **Server** (Revv / IBO)',
      '3️⃣ Pilih jumlah slot',
      '4️⃣ Isi data Roblox',
      '5️⃣ Pilih durasi',
      '6️⃣ Bayar sesuai QR Code',
      '7️⃣ Upload bukti pembayaran',
      '8️⃣ Tunggu verifikasi moderator',
    ].join('\n'))
    .addFields(
      { name: '🆔 Ticket ID', value: `\`${ticketId}\``, inline: true },
      { name: '👤 User', value: `${user}`, inline: true },
      { name: '📅 Dibuat', value: formatTimestamp(), inline: true }
    )
    .setFooter({ text: '⚡ PTPT ORDER SYSTEM' })
    .setTimestamp();
}

export function createOrderSummaryEmbed(orderData, qrAttachment = null) {
  const serverLabel = config.serverLabels[orderData.server] || orderData.server;
  const serverColor = config.colors[orderData.server] || config.colors.primary;

  const embed = new EmbedBuilder()
    .setColor(serverColor)
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
        name: '━━━━━━━ 🖥️ SERVER ━━━━━━━',
        value: `> **${serverLabel}**`,
        inline: false
      },
      {
        name: '━━━━━━━ 🎮 DATA ROBLOX ━━━━━━━',
        value: (() => {
          const slots = orderData.slotData || [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];
          return slots.map((s, i) => `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`).join('\n');
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
    .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${serverLabel}` })
    .setTimestamp();

  if (qrAttachment) embed.setImage('attachment://qrcode.png');
  return embed;
}

export function createPaymentProofEmbed(orderData, proofUrl) {
  const serverLabel = config.serverLabels[orderData.server] || orderData.server;
  const serverColor = config.colors[orderData.server] || config.colors.warning;

  return new EmbedBuilder()
    .setColor(serverColor)
    .setTitle('📤 BUKTI PEMBAYARAN DITERIMA')
    .setDescription('> Menunggu verifikasi moderator.')
    .addFields(
      {
        name: '━━━━━━━ 👤 DATA USER ━━━━━━━',
        value: [
          `> **Discord:** ${orderData.discordMention} (\`${orderData.discordUsername}\`)`,
          `> **Server:** **${serverLabel}**`,
        ].join('\n'),
        inline: false
      },
      {
        name: '━━━━━━━ 🎮 DATA ROBLOX ━━━━━━━',
        value: (() => {
          const slots = orderData.slotData || [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];
          return slots.map((s, i) => `> **Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`).join('\n');
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
      { name: '🆔 Order ID', value: `\`${orderData.orderId}\``, inline: true },
      { name: '⏰ Upload At', value: formatTimestamp(), inline: true }
    )
    .setImage(proofUrl)
    .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${serverLabel} • Harap verifikasi` })
    .setTimestamp();
}

export function createTransactionLogEmbed(orderData, status, verifier = null, rejectReason = null) {
  const statusMap = {
    pending:        { color: config.colors.warning, emoji: '🟡', text: 'MENUNGGU PEMBAYARAN' },
    proof_uploaded: { color: 0xFF8C00, emoji: '🟠', text: 'MENUNGGU VERIFIKASI' },
    accepted:       { color: config.colors.success, emoji: '🟢', text: 'PEMBAYARAN BERHASIL' },
    rejected:       { color: config.colors.danger,  emoji: '🔴', text: 'PEMBAYARAN DITOLAK' },
  };
  const st = statusMap[status] || statusMap.pending;
  const serverLabel = config.serverLabels[orderData.server] || orderData.server || '-';

  const embed = new EmbedBuilder()
    .setColor(st.color)
    .setTitle(`${st.emoji} LOG TRANSAKSI PTPT`)
    .setDescription(`> Status: **${st.text}** | Server: **${serverLabel}**`)
    .addFields(
      {
        name: '👤 Data User',
        value: [`**Discord:** \`${orderData.discordUsername}\``, `**ID:** \`${orderData.userId}\``].join('\n'),
        inline: true
      },
     {
        name: '🎮 Data Roblox',
        value: (() => {
          const slots = orderData.slotData?.length
            ? orderData.slotData
            : [{ robloxUsername: orderData.robloxUsername, displayName: orderData.displayName }];
          return slots.map((s, i) =>
            `**Slot ${i + 1}:** \`${s.robloxUsername}\` — *${s.displayName}*`
          ).join('\n');
        })(),
        inline: false
      },
      {
        name: '📦 Detail Order',
        value: [
          `**Server:** \`${serverLabel}\``,
          `**Slot:** \`${orderData.slots} Slot\``,
          `**Durasi:** \`${config.durationLabels[orderData.duration]}\``,
          `**Harga:** \`${formatRupiah(orderData.totalPrice)}\``,
        ].join('\n'),
        inline: true
      },
      { name: '🆔 Order ID', value: `\`${orderData.orderId}\``, inline: true },
    );

  if (verifier) embed.addFields({ name: '✅ Verifikator', value: `\`${verifier}\``, inline: true });
  if (rejectReason) embed.addFields({ name: '❌ Alasan Penolakan', value: `> ${rejectReason}`, inline: false });

  embed.setFooter({ text: '⚡ PTPT ORDER SYSTEM • Transaction Log' }).setTimestamp();
  return embed;
}

export function createAdminPanelEmbed(prices, server) {
  const serverLabel = config.serverLabels[server] || server;
  const serverColor = config.colors[server] || config.colors.primary;

  const priceList = prices.map(p => {
    const label = config.durationLabels[p.duration] || p.duration;
    const ts    = p.updated_at ? `*(update: <t:${Math.floor(new Date(p.updated_at).getTime() / 1000)}:R>)*` : '';
    return `> **${label}:** \`${formatRupiah(p.price)}\` ${ts}`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(serverColor)
    .setTitle(`⚙️ ADMIN PANEL HARGA — ${serverLabel}`)
    .setDescription(['> Kelola harga PTPT secara realtime.', '', '**Harga Saat Ini:**', priceList || '> Belum ada harga.'].join('\n'))
    .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${serverLabel} • Admin Only` })
    .setTimestamp();
}

export function createVerificationEmbed(orderData, action, verifier, rejectReason = null) {
  const isAccepted  = action === 'accept';
  const serverLabel = config.serverLabels[orderData.server] || orderData.server || '-';
  return new EmbedBuilder()
    .setColor(isAccepted ? config.colors.success : config.colors.danger)
    .setTitle(isAccepted ? '✅ PEMBAYARAN DITERIMA' : '❌ PEMBAYARAN DITOLAK')
    .setDescription(isAccepted
      ? `> Pembayaran diverifikasi! Server: **${serverLabel}**`
      : `> Pembayaran ditolak.\n> **Alasan:** ${rejectReason || 'Tidak ada alasan'}`)
    .addFields(
      { name: '🆔 Order ID', value: `\`${orderData.order_id}\``, inline: true },
      { name: '✅ Verifikator', value: `\`${verifier}\``, inline: true },
      { name: '⏰ Waktu', value: formatTimestamp(), inline: true },
    )
    .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${serverLabel}` })
    .setTimestamp();
}

export function createPricesEmbed(prices, server) {
  const serverLabel = config.serverLabels[server] || server;
  const priceList = prices.map(p => {
    const label = config.durationLabels[p.duration] || p.duration;
    return `> **${label}:** \`${formatRupiah(p.price)}\` per slot`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(config.colors[server] || config.colors.purple)
    .setTitle(`💰 DAFTAR HARGA PTPT — ${serverLabel}`)
    .setDescription(priceList || '> Belum ada harga yang diset.')
    .setFooter({ text: `⚡ PTPT ORDER SYSTEM • ${serverLabel}` })
    .setTimestamp();
}

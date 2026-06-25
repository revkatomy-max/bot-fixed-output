// src/buttons/buttonBuilder.js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config/config.js';

export function buildOrderActionButtons(orderId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upload_proof_${orderId}`)
      .setLabel('📤 Upload Bukti Bayar')
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildModeratorVerifyButtons(orderId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_payment_${orderId}`)
      .setLabel('✅ ACCEPT')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_payment_${orderId}`)
      .setLabel('❌ REJECT')
      .setStyle(ButtonStyle.Danger),
  );
}

// Tombol edit harga per server per durasi
export function buildAdminPriceButtons(server) {
  const rows = [];
  const durations = config.durations;

  // Maks 4 per row, Discord limit 5 buttons per row
  for (let i = 0; i < durations.length; i += 4) {
    const row = new ActionRowBuilder();
    durations.slice(i, i + 4).forEach(d => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_edit_price_${server}_${d}`)
          .setLabel(`✏️ ${config.durationLabels[d]}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });
    rows.push(row);
  }

  // Reset button
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_reset_prices_${server}`)
      .setLabel(`🔄 Reset Harga ${config.serverLabels[server]}`)
      .setStyle(ButtonStyle.Danger)
  ));

  return rows;
}

export function buildAdminServerSelectButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_prices_server_revv')
      .setLabel('🔵 Harga Server Revv')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('admin_prices_server_ibo')
      .setLabel('🟣 Harga Server IBO')
      .setStyle(ButtonStyle.Secondary),
  );
}
export function buildTicketPanelButtons(slotFull = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel(slotFull ? '🔴 Slot Penuh' : '🎫 Buat Ticket')
      .setStyle(slotFull ? ButtonStyle.Danger : ButtonStyle.Success)
      .setDisabled(slotFull),
  );
}
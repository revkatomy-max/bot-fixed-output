// src/buttons/buttonBuilder.js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildTicketPanelButtons(slotFull = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel(slotFull ? '🔒 SLOT PENUH' : '🎫 ORDER PTPT')
      .setStyle(slotFull ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(slotFull)
  );
}

export function buildOrderActionButtons(orderId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upload_proof_${orderId}`)
      .setLabel('📤 Upload Bukti Bayar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('❌ Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildModeratorVerifyButtons(orderId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_payment_${orderId}`)
      .setLabel('✅ ACCEPT PAYMENT')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_payment_${orderId}`)
      .setLabel('❌ REJECT PAYMENT')
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildAdminPriceButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_edit_price_6h')
      .setLabel('✏️ EDIT 6 JAM')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_edit_price_12h')
      .setLabel('✏️ EDIT 12 JAM')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_edit_price_24h')
      .setLabel('✏️ EDIT 24 JAM')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_edit_price_48h')
      .setLabel('✏️ EDIT 48 JAM')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_edit_price_72h')
      .setLabel('✏️ EDIT 72 JAM')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_edit_price_168h')
      .setLabel('✏️ EDIT 168 JAM')
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_reset_prices')
      .setLabel('🔄 Reset Semua Harga')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2, row3];
}

export function buildConfirmOrderButton(robloxUsername, displayName, slots, duration) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_order_${slots}_${duration}`)
      .setLabel('✅ KONFIRMASI & BUAT ORDER')
      .setStyle(ButtonStyle.Success)
  );
}

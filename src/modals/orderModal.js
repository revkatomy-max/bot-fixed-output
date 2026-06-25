// src/modals/orderModal.js
import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import config from '../config/config.js';

export function buildOrderModal(slots) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_order_ptpt_${slots}`)
    .setTitle(`Data Roblox — ${slots} Slot`);

  const rows = [];
  if (slots <= 2) {
    for (let i = 1; i <= slots; i++) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`roblox_username_${i}`)
            .setLabel(`Username Roblox Slot ${i}`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('contoh: PlayerName123')
            .setRequired(true)
            .setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`display_name_${i}`)
            .setLabel(`Display Name Slot ${i}`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('contoh: Player Name')
            .setRequired(true)
            .setMaxLength(50)
        )
      );
    }
  } else {
    for (let i = 1; i <= Math.min(slots, 5); i++) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`slot_data_${i}`)
            .setLabel(`Slot ${i} (Username | DisplayName)`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('PlayerName123 | Player Name')
            .setRequired(true)
            .setMaxLength(100)
        )
      );
    }
  }

  modal.addComponents(...rows);
  return modal;
}

export function buildRejectModal(orderId) {
  return new ModalBuilder()
    .setCustomId(`modal_reject_${orderId}`)
    .setTitle('Alasan Penolakan')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reject_reason')
          .setLabel('Alasan Penolakan')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Tulis alasan penolakan pembayaran...')
          .setRequired(true)
          .setMaxLength(500)
      )
    );
}

export function buildPriceModal(server, duration) {
  const serverLabel   = config.serverLabels[server] || server;
  const durationLabel = config.durationLabels[duration] || duration;
  return new ModalBuilder()
    .setCustomId(`modal_set_price_${server}_${duration}`)
    .setTitle(`Set Harga ${serverLabel} — ${durationLabel}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('new_price')
          .setLabel(`Harga baru (IDR) untuk ${durationLabel}`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('contoh: 15000')
          .setRequired(true)
          .setMaxLength(10)
      )
    );
}

// src/modals/orderModal.js
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

// Modal dinamis — jumlah kolom USN+DN sesuai slots yang dipilih (max 5 row di Discord)
// Slot 1 → 2 row (usn1, dn1)
// Slot 2 → 4 row (usn1, dn1, usn2, dn2)
// Slot 3-5 → pakai 1 row gabungan per slot (format: "usn1|dn1")
export function buildOrderModal(slots = 1) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_order_ptpt_${slots}`)
    .setTitle(`📦 Form Order PTPT — ${slots} Slot`);

  const rows = [];

  if (slots <= 2) {
    // Slot 1-2: pisah kolom usn dan dn per slot (muat 2 row per slot)
    for (let i = 1; i <= slots; i++) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`roblox_username_${i}`)
            .setLabel(`Slot ${i} — Username Roblox`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Username Roblox slot ${i}`)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(20)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`display_name_${i}`)
            .setLabel(`Slot ${i} — Display Name`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Display Name slot ${i}`)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(50)
        )
      );
    }
  } else {
    // Slot 3-5: gabungkan USN|DN dalam 1 baris per slot (Discord max 5 rows)
    for (let i = 1; i <= slots; i++) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`slot_data_${i}`)
            .setLabel(`Slot ${i} — Username | Display Name`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`ContohUSN | Contoh Display Name`)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(50)
        )
      );
    }
  }

  modal.addComponents(...rows);
  return modal;
}

export function buildPriceModal(duration) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_set_price_${duration}`)
    .setTitle(`💰 Set Harga ${duration.toUpperCase()}`);

  const priceInput = new TextInputBuilder()
    .setCustomId('new_price')
    .setLabel(`Harga baru untuk ${duration} (dalam Rupiah)`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: 20000')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(10);

  modal.addComponents(new ActionRowBuilder().addComponents(priceInput));
  return modal;
}

export function buildRejectModal(orderId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_reject_${orderId}`)
    .setTitle('❌ Tolak Pembayaran');

  const reasonInput = new TextInputBuilder()
    .setCustomId('reject_reason')
    .setLabel('Alasan penolakan')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Jelaskan alasan penolakan pembayaran...')
    .setRequired(true)
    .setMinLength(5)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

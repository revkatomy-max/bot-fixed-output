// src/selectmenus/orderSelectMenus.js
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import config from '../config/config.js';
import { getPrice } from '../database/database.js';
import { getEnabledDurations } from '../commands/adminpanel.js';

export function buildSlotSelectMenu(maxSlots = 5) {
  const max = Math.min(maxSlots, 5);
  const options = config.slots.filter(s => s <= max).map(slot =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${slot} Slot`)
      .setDescription(`Order ${slot} slot PTPT`)
      .setValue(`slot_${slot}`)
      .setEmoji(slot <= 1 ? '1️⃣' : slot <= 2 ? '2️⃣' : slot <= 3 ? '3️⃣' : slot <= 4 ? '4️⃣' : '5️⃣')
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_slots')
      .setPlaceholder('🎰 Pilih jumlah slot PTPT...')
      .addOptions(options)
  );
}

export function buildDurationSelectMenu() {
  const activeDurations = getEnabledDurations();
  const options = activeDurations.map(dur => {
    const price = getPrice(dur);
    const label = config.durationLabels[dur];
    const priceText = price ? `Rp ${price.toLocaleString('id-ID')} / slot` : 'Harga belum diset';

    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setDescription(priceText)
      .setValue(`dur_${dur}`)
      .setEmoji('⏱️');
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_duration')
      .setPlaceholder('⏱️ Pilih durasi order...')
      .addOptions(options)
  );
}

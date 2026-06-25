// src/selectmenus/orderSelectMenus.js
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import config from '../config/config.js';
import { loadDB } from '../database/database.js';

export function buildServerSelectMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('select_server')
    .setPlaceholder('Pilih server PTPT...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('🔵 Server Revv')
        .setDescription('Order slot PTPT di Server Revv')
        .setValue('server_revv'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🟣 Server IBO')
        .setDescription('Order slot PTPT di Server IBO')
        .setValue('server_ibo'),
    );
  return new ActionRowBuilder().addComponents(menu);
}

export function buildSlotSelectMenu(maxSlot = 5) {
  const available = Math.min(maxSlot, 5);
  const options = Array.from({ length: available }, (_, i) => {
    const n = i + 1;
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${n} Slot`)
      .setDescription(`Order ${n} slot sekaligus`)
      .setValue(`slot_${n}`);
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('select_slots')
    .setPlaceholder('Pilih jumlah slot...')
    .addOptions(options);
  return new ActionRowBuilder().addComponents(menu);
}

export function buildDurationSelectMenu(server = 'revv') {
  const db = loadDB();
  const enabledDurations = db.settings?.enabledDurations?.[server] || config.durations;

  const options = enabledDurations.map(d =>
    new StringSelectMenuOptionBuilder()
      .setLabel(config.durationLabels[d] || d)
      .setDescription(`Durasi ${config.durationLabels[d] || d}`)
      .setValue(`dur_${d}`)
  );

  if (options.length === 0) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('Tidak ada durasi aktif')
        .setDescription('Hubungi admin')
        .setValue('dur_none')
    );
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('select_duration')
    .setPlaceholder('Pilih durasi order...')
    .addOptions(options);
  return new ActionRowBuilder().addComponents(menu);
}

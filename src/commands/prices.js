// src/commands/prices.js
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import config from '../config/config.js';
import {
  getAllPrices,
  setPrice,
  resetPrices,
} from '../database/database.js';
import {
  createPricesEmbed,
  createAdminPanelEmbed,
  formatRupiah,
} from '../embeds/embedBuilder.js';
import { buildAdminPriceButtons } from '../buttons/buttonBuilder.js';
import { isModerator, isAdmin } from '../utils/permissions.js';

export const setPriceCommand = {
  data: new SlashCommandBuilder()
    .setName('setprice')
    .setDescription('Set harga PTPT untuk durasi tertentu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt.setName('durasi')
        .setDescription('Durasi yang ingin diset harganya')
        .setRequired(true)
        .addChoices(
          { name: '6 Jam', value: '6h' },
          { name: '12 Jam', value: '12h' },
          { name: '24 Jam', value: '24h' },
          { name: '48 Jam', value: '48h' },
          { name: '72 Jam', value: '72h' },
          { name: '168 Jam (7 Hari)', value: '168h' },
        )
    )
    .addIntegerOption(opt =>
      opt.setName('harga')
        .setDescription('Harga dalam Rupiah (contoh: 20000)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10_000_000)
    ),

  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      return interaction.reply({ content: '> ❌ Kamu tidak memiliki izin.', flags: 64 });
    }

    const duration = interaction.options.getString('durasi');
    const price = interaction.options.getInteger('harga');

    setPrice(duration, price, interaction.user.username);

    return interaction.reply({
      content: `> ✅ Harga **${config.durationLabels[duration]}** berhasil diset ke **${formatRupiah(price)}** per slot.`,
      ephemeral: true,
    });
  }
};

export const pricesCommand = {
  data: new SlashCommandBuilder()
    .setName('prices')
    .setDescription('Lihat semua harga PTPT saat ini'),

  async execute(interaction) {
    const prices = getAllPrices();
    const embed = createPricesEmbed(prices);
    return interaction.reply({ embeds: [embed] });
  }
};

export const resetPriceCommand = {
  data: new SlashCommandBuilder()
    .setName('resetprice')
    .setDescription('Reset semua harga ke default')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '> ❌ Hanya Administrator yang dapat reset harga.', flags: 64 });
    }

    resetPrices(interaction.user.username);
    return interaction.reply({
      content: '> ✅ Semua harga berhasil direset ke default!',
      ephemeral: true,
    });
  }
};

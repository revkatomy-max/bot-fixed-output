// src/commands/prices.js
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { isModerator } from '../utils/permissions.js';
import { getAllPrices } from '../database/database.js';
import { createPricesEmbed, createAdminPanelEmbed } from '../embeds/embedBuilder.js';
import { buildAdminPriceButtons, buildAdminServerSelectButtons } from '../buttons/buttonBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('prices')
    .setDescription('Lihat atau kelola harga PTPT')
    .addStringOption(opt =>
      opt.setName('server')
        .setDescription('Server PTPT')
        .setRequired(false)
        .addChoices(
          { name: 'Server Revv', value: 'revv' },
          { name: 'Server IBO',  value: 'ibo'  }
        )
    ),

  async execute(interaction) {
    const server = interaction.options.getString('server');
    const canEdit = isModerator(interaction.member);

    if (server) {
      const prices = getAllPrices(server);
      if (canEdit) {
        return interaction.reply({
          embeds: [createAdminPanelEmbed(prices, server)],
          components: buildAdminPriceButtons(server),
          ephemeral: true,
        });
      }
      return interaction.reply({
        embeds: [createPricesEmbed(prices, server)],
        ephemeral: true,
      });
    }

    // Tanpa pilihan server — tampilkan tombol pilih server
    return interaction.reply({
      content: '> Pilih server untuk melihat harga:',
      components: [buildAdminServerSelectButtons()],
      ephemeral: true,
    });
  }
};

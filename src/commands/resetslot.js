// src/commands/resetslot.js
// Slash command /reset-slot — reset order per channel durasi
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { resetOrdersByDuration, getActiveOrdersByDuration } from '../database/database.js';
import { updateDurationChannel } from '../utils/durationChannelManager.js';
import { updateSlotList } from '../utils/slotListUpdater.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset-slot')
    .setDescription('Reset seluruh daftar order pada channel durasi tertentu')
    .addStringOption(opt =>
      opt.setName('durasi')
        .setDescription('Pilih channel durasi yang ingin direset')
        .setRequired(true)
        .addChoices(
          { name: '⏱ 6 Jam',  value: '6h'  },
          { name: '⏱ 12 Jam', value: '12h' },
          { name: '⏱ 24 Jam', value: '24h' },
          { name: '⏱ 36 Jam', value: '36h' },
          { name: '⏱ 48 Jam', value: '48h' },
          { name: '⏱ 72 Jam', value: '72h' },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '> ❌ Hanya Administrator yang bisa menggunakan command ini.',
        flags: 64,
      });
    }

    const duration = interaction.options.getString('durasi');
    const label = config.durationLabels[duration] || duration;

    // Cek dulu berapa order yang akan direset
    const activeOrdersBefore = getActiveOrdersByDuration(duration);
    const totalSlotsBefore = activeOrdersBefore.reduce((s, o) => s + (o.slots || 0), 0);

    if (activeOrdersBefore.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`ℹ️ Tidak Ada Order Aktif`)
            .setDescription(`> Tidak ada order aktif pada durasi **${label}** yang perlu direset.`)
            .setTimestamp(),
        ],
        flags: 64,
      });
    }

    // Defer karena akan ada beberapa operasi async
    await interaction.deferReply({ ephemeral: false });

    try {
      // Reset order di database
      const resetCount = resetOrdersByDuration(duration);

      // Update embed di channel durasi (tampilkan kosong)
      await updateDurationChannel(interaction.client, duration);

      // Update slot list global
      await updateSlotList(interaction.client);

      logger.info(`[reset-slot] Durasi ${duration} direset oleh ${interaction.user.username} — ${resetCount} order`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Reset Berhasil')
        .setDescription([
          `> Channel durasi **${label}** telah direset.`,
          '',
          `> 🗑️ **${resetCount} order** (${totalSlotsBefore} slot) telah dihapus dari daftar.`,
          `> 📋 Embed di channel durasi sudah diperbarui.`,
          `> ⚠️ Order pada durasi lain **tidak terpengaruh**.`,
        ].join('\n'))
        .addFields(
          { name: '⏱ Durasi',        value: `\`${label}\``,                               inline: true },
          { name: '🗑️ Order Direset', value: `\`${resetCount} order\``,                   inline: true },
          { name: '📦 Slot Direset',  value: `\`${totalSlotsBefore} slot\``,              inline: true },
          { name: '👤 Direset Oleh',  value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false },
        )
        .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Admin Reset' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[reset-slot] Error:`, err);
      await interaction.editReply({
        content: `> ❌ Terjadi kesalahan saat reset: \`${err.message}\``,
      });
    }
  },
};

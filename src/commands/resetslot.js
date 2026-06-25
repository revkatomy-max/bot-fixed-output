// src/commands/resetslot.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { loadDB, saveDB } from '../database/database.js';
import { updateSlotList } from '../utils/slotListUpdater.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset-slot')
    .setDescription('Reset seluruh order aktif pada server tertentu')
    .addStringOption(opt =>
      opt.setName('server')
        .setDescription('Pilih server yang ingin direset')
        .setRequired(true)
        .addChoices(
          { name: 'Server Revv', value: 'revv' },
          { name: 'Server IBO',  value: 'ibo'  },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '> ❌ Hanya Administrator.', flags: 64 });
    }

    const server = interaction.options.getString('server');
    const label  = config.serverLabels[server] || server;

    const db = loadDB();
    const now = Date.now();
    let resetCount = 0;
    let slotCount  = 0;

    for (const [id, order] of Object.entries(db.orders)) {
      if (order.server !== server) continue;
      if (order.payment_status !== 'accepted') continue;
      const match = order.duration?.match(/^(\d+)h$/);
      if (match) {
        const end = new Date(order.updated_at).getTime() + parseInt(match[1]) * 3600000;
        if (end <= now) continue;
      }
      db.orders[id].payment_status = 'reset';
      db.orders[id].updated_at = new Date().toISOString();
      resetCount++;
      slotCount += order.slots || 0;
    }
    saveDB(db);

    await updateSlotList(interaction.client, server);
    logger.info(`[reset-slot] ${server} direset oleh ${interaction.user.username} — ${resetCount} order, ${slotCount} slot`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Reset Berhasil')
      .setDescription([
        `> Semua slot aktif **${label}** telah direset.`,
        `> 🗑️ **${resetCount} order** (${slotCount} slot) dihapus.`,
        `> 📋 Auto list diperbarui.`,
      ].join('\n'))
      .addFields(
        { name: '🖥️ Server', value: `\`${label}\``, inline: true },
        { name: '🗑️ Order', value: `\`${resetCount}\``, inline: true },
        { name: '📦 Slot',  value: `\`${slotCount}\``,  inline: true },
        { name: '👤 Oleh',  value: `${interaction.user}`, inline: false },
      )
      .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Admin Reset' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};

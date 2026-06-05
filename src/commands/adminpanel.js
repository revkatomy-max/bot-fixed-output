// src/commands/adminpanel.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { loadDB, saveDB } from '../database/database.js';
import config from '../config/config.js';

function getSettings() {
  const db = loadDB();
  if (!db.settings) {
    db.settings = {
      ticketOpen: true,
      enabledDurations: ['6h', '12h', '24h', '36h', '48h', '72h'],
    };
    saveDB(db);
  }
  // Pastikan 36h selalu ada di list jika belum pernah tersimpan
  if (!db.settings.enabledDurations) {
    db.settings.enabledDurations = [...config.durations];
    saveDB(db);
  }
  return db.settings;
}

export function isTicketOpen() {
  return getSettings().ticketOpen !== false;
}

export function getEnabledDurations() {
  const s = getSettings();
  return s.enabledDurations?.length ? s.enabledDurations : config.durations;
}

function buildAdminEmbed(settings) {
  const ticketStatus = settings.ticketOpen ? '🟢 BUKA' : '🔴 TUTUP';
  const durationLines = config.durations.map(d => {
    const on = settings.enabledDurations?.includes(d);
    return `> ${on ? '✅' : '❌'} **${config.durationLabels[d]}** (${d})`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ ADMIN PANEL — PTPT ORDER SYSTEM')
    .setDescription([
      `**🎫 Status Ticket:** ${ticketStatus}`,
      '',
      '**⏱ Durasi yang Aktif:**',
      durationLines,
    ].join('\n'))
    .setFooter({ text: '⚡ PTPT Admin Panel' })
    .setTimestamp();
}

function buildAdminButtons(settings) {
  const rows = [];

  // Row 1: Toggle ticket open/close
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_toggle_ticket')
      .setLabel(settings.ticketOpen ? '🔴 Tutup Ticket' : '🟢 Buka Ticket')
      .setStyle(settings.ticketOpen ? ButtonStyle.Danger : ButtonStyle.Success)
  ));

  // Row 2-3: Toggle tiap durasi (max 5 per row)
  const durRow1 = new ActionRowBuilder();
  const durRow2 = new ActionRowBuilder();
  config.durations.forEach((d, i) => {
    const on = settings.enabledDurations?.includes(d);
    const btn = new ButtonBuilder()
      .setCustomId(`admin_toggle_dur_${d}`)
      .setLabel(`${on ? '✅' : '❌'} ${config.durationLabels[d]}`)
      .setStyle(on ? ButtonStyle.Success : ButtonStyle.Secondary);
    if (i < 4) durRow1.addComponents(btn);
    else durRow2.addComponents(btn);
  });
  rows.push(durRow1);
  if (config.durations.length > 4) rows.push(durRow2);

  return rows;
}

export { buildAdminEmbed, buildAdminButtons };

export default {
  data: new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Buka panel kontrol admin PTPT')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '> ❌ Hanya Administrator yang bisa menggunakan command ini.', flags: 64 });
    }

    const settings = getSettings();
    await interaction.reply({
      embeds: [buildAdminEmbed(settings)],
      components: buildAdminButtons(settings),
      ephemeral: true,
    });
  }
};

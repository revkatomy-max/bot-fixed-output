// src/commands/adminpanel.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { loadDB, saveDB } from '../database/database.js';
import config from '../config/config.js';

function getSettings() {
  const db = loadDB();
  if (!db.settings) db.settings = { ticketOpen: true, enabledDurations: { revv: [...config.durations], ibo: [...config.durations] } };
  if (!db.settings.enabledDurations?.revv) {
    db.settings.enabledDurations = { revv: [...config.durations], ibo: [...config.durations] };
    saveDB(db);
  }
  return db.settings;
}

export function isTicketOpen() { return getSettings().ticketOpen !== false; }

export function getEnabledDurations(server) {
  const s = getSettings();
  return s.enabledDurations?.[server]?.length ? s.enabledDurations[server] : config.durations;
}

export function buildAdminEmbed(settings) {
  const ticketStatus = settings.ticketOpen ? '🟢 BUKA' : '🔴 TUTUP';

  const buildDurLines = (server) => config.durations.map(d => {
    const on = settings.enabledDurations?.[server]?.includes(d);
    return `> ${on ? '✅' : '❌'} ${config.durationLabels[d]} (${d})`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ ADMIN PANEL — PTPT ORDER SYSTEM')
    .setDescription([
      `**🎫 Status Ticket:** ${ticketStatus}`,
      '',
      `**⏱ Durasi Aktif — ${config.serverLabels.revv}:**`,
      buildDurLines('revv'),
      '',
      `**⏱ Durasi Aktif — ${config.serverLabels.ibo}:**`,
      buildDurLines('ibo'),
    ].join('\n'))
    .setFooter({ text: '⚡ PTPT Admin Panel' })
    .setTimestamp();
}

export function buildAdminButtons(settings) {
  const rows = [];

  // Row 1: toggle ticket
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_toggle_ticket')
      .setLabel(settings.ticketOpen ? '🔴 Tutup Ticket' : '🟢 Buka Ticket')
      .setStyle(settings.ticketOpen ? ButtonStyle.Danger : ButtonStyle.Success)
  ));

  // Row 2-3: toggle durasi Revv (maks 4 per row)
  const revvRow1 = new ActionRowBuilder();
  const revvRow2 = new ActionRowBuilder();
  config.durations.forEach((d, i) => {
    const on = settings.enabledDurations?.revv?.includes(d);
    const btn = new ButtonBuilder()
      .setCustomId(`admin_toggle_dur_revv_${d}`)
      .setLabel(`Revv ${on ? '✅' : '❌'} ${config.durationLabels[d]}`)
      .setStyle(on ? ButtonStyle.Success : ButtonStyle.Secondary);
    if (i < 4) revvRow1.addComponents(btn);
    else revvRow2.addComponents(btn);
  });
  rows.push(revvRow1);
  if (config.durations.length > 4) rows.push(revvRow2);

  // Row 4-5: toggle durasi IBO
  const iboRow1 = new ActionRowBuilder();
  const iboRow2 = new ActionRowBuilder();
  config.durations.forEach((d, i) => {
    const on = settings.enabledDurations?.ibo?.includes(d);
    const btn = new ButtonBuilder()
      .setCustomId(`admin_toggle_dur_ibo_${d}`)
      .setLabel(`IBO ${on ? '✅' : '❌'} ${config.durationLabels[d]}`)
      .setStyle(on ? ButtonStyle.Success : ButtonStyle.Secondary);
    if (i < 4) iboRow1.addComponents(btn);
    else iboRow2.addComponents(btn);
  });
  rows.push(iboRow1);
  if (config.durations.length > 4) rows.push(iboRow2);

  return rows;
}

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

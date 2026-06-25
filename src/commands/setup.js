// src/commands/setup.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../config/config.js';
import { buildTicketPanelButtons } from '../buttons/buttonBuilder.js';
import { isAdmin } from '../utils/permissions.js';
import { getActiveSlotCount } from '../database/database.js';

function buildPanelComponents() {
  const revv = getActiveSlotCount('revv');
  const ibo  = getActiveSlotCount('ibo');
  const activeSlots = revv + ibo;
  const maxSlots = config.maxSlotsPerServer.revv + config.maxSlotsPerServer.ibo;
  const slotFull = activeSlots >= maxSlots;
  return [buildTicketPanelButtons(slotFull)];
}

function buildSlotBar(active, max) {
  const filled = Math.round((active / max) * 10);
  const empty = 10 - filled;
  return '🟩'.repeat(filled) + '⬛'.repeat(empty);
}

function buildPanelEmbed() {
  const revv = getActiveSlotCount('revv');
  const ibo  = getActiveSlotCount('ibo');
  const activeSlots = revv + ibo;
  const maxSlots = config.maxSlotsPerServer.revv + config.maxSlotsPerServer.ibo;
  const sisaSlot = Math.max(0, maxSlots - activeSlots);
  const slotBar = buildSlotBar(activeSlots, maxSlots);

  return new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle('🌟 PTPT ORDER SYSTEM')
    .setDescription([
      '```',
      '╔══════════════════════════════════╗',
      '║      SELAMAT DATANG DI PTPT      ║',
      '║         ORDER SYSTEM v2.0        ║',
      '╚══════════════════════════════════╝',
      '```',
      '',
      '> 🎯 **Apa itu PTPT?**',
      '> PTPT untuk boost server game apapun di Roblox.',
      '',
      `**🎰 Ketersediaan Slot:**`,
      `> ${slotBar}`,
      `> 🔵 **Server Revv:** ${revv}/${config.maxSlotsPerServer.revv} slot`,
      `> 🟣 **Server IBO:** ${ibo}/${config.maxSlotsPerServer.ibo} slot`,
      `> Total: **${activeSlots}/${maxSlots}** — sisa **${sisaSlot} slot**`,
      '',
      '**📋 Cara Order:**',
      '> 1️⃣ Klik tombol **Buat Ticket** di bawah',
      '> 2️⃣ Pilih server (Revv / IBO)',
      '> 3️⃣ Pilih jumlah slot dan isi data Roblox',
      '> 4️⃣ Pilih durasi dan scan QR Code',
      '> 5️⃣ Upload bukti pembayaran',
      '> 6️⃣ Tunggu verifikasi moderator ✅',
    ].join('\n'))
    .setFooter({ text: `⚡ PTPT ORDER SYSTEM • Terakhir diperbarui: ${new Date().toLocaleTimeString('id-ID')}` })
    .setTimestamp();
}

const activePanels = new Map();

export function startPanelRefresh(client) {
  setInterval(async () => {
    for (const [channelId, { messageId }] of activePanels.entries()) {
      try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) { activePanels.delete(channelId); continue; }
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) { activePanels.delete(channelId); continue; }
        await message.edit({ embeds: [buildPanelEmbed()], components: buildPanelComponents() });
      } catch {
        activePanels.delete(channelId);
      }
    }
  }, 60_000);
}

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup panel tiket ORDER PTPT')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '> ❌ Hanya Administrator yang bisa menggunakan command ini.', flags: 64 });
    }
    const panelMsg = await interaction.channel.send({
      embeds: [buildPanelEmbed()],
      components: buildPanelComponents(),
    });
    activePanels.set(interaction.channelId, { messageId: panelMsg.id });
    await interaction.reply({ content: '> ✅ Panel ticket berhasil dibuat!', flags: 64 });
  }
};
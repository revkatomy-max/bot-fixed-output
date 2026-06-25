// src/commands/resetslots.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { loadDB, saveDB, getActiveSlotCount } from '../database/database.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

const SLOTS_PER_CHANNEL = 18;

export default {
  data: new SlashCommandBuilder()
    .setName('resetslots')
    .setDescription('Reset slot PTPT yang aktif')
    .addStringOption(opt =>
      opt.setName('target')
        .setDescription('Reset semua slot, slot per sesi/channel, atau slot order tertentu')
        .setRequired(true)
        .addChoices(
          { name: '🔄 Reset SEMUA slot (hapus semua order accepted)', value: 'all' },
          { name: '📦 Reset Sesi 1 (slot 1-18 / channel 1)', value: 'session_1' },
          { name: '📦 Reset Sesi 2 (slot 19-36 / channel 2)', value: 'session_2' },
          { name: '📦 Reset Sesi 3 (slot 37-54 / channel 3)', value: 'session_3' },
          { name: '🎯 Reset 1 order (masukkan Order ID)', value: 'one' },
        )
    )
    .addStringOption(opt =>
      opt.setName('order_id')
        .setDescription('Order ID yang mau direset (wajib jika pilih "Reset 1 order")')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '> ❌ Hanya Administrator yang bisa menggunakan command ini.', flags: 64 });
    }

    const target = interaction.options.getString('target');
    const orderId = interaction.options.getString('order_id');
    const db = loadDB();

    // ===== RESET SEMUA =====
    if (target === 'all') {
      let count = 0;
      for (const id in db.orders) {
        if (db.orders[id].payment_status === 'accepted') {
          db.orders[id].payment_status = 'reset';
          db.orders[id].updated_at = new Date().toISOString();
          count++;
        }
      }
      saveDB(db);

      // Update slot list setelah reset
      try {
        const { updateSlotList } = await import('../utils/slotListUpdater.js');
        await updateSlotList(interaction.client);
      } catch (e) { logger.warn('updateSlotList error:', e.message); }

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Semua Slot Direset')
        .setDescription(`> **${count} order** telah direset.\n> Slot sekarang: **0/${config.maxSlots}**`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ===== RESET PER SESI/CHANNEL =====
    if (target.startsWith('session_')) {
      const sessionNum = parseInt(target.replace('session_', '')) - 1; // 0-indexed
      const startSlotIndex = sessionNum * SLOTS_PER_CHANNEL; // slot ke-berapa mulai (0-indexed dalam urutan aktif)

      // Ambil semua order accepted, urutkan sama seperti slotListUpdater
      const now = Date.now();
      const activeOrders = Object.values(db.orders)
        .filter(o => {
          if (o.payment_status !== 'accepted') return false;
          const match = o.duration?.match(/^(\d+)h$/);
          if (!match) return true;
          const endTime = new Date(o.updated_at).getTime() + parseInt(match[1]) * 3600000;
          return endTime > now;
        })
        .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

      // Hitung slot per order (flatten seperti slotListUpdater)
      let slotCursor = 0;
      const ordersInSession = [];
      for (const order of activeOrders) {
        const slotCount = order.slots || 1;
        const orderStartIndex = slotCursor;
        const orderEndIndex = slotCursor + slotCount - 1;

        // Cek apakah order ini overlap dengan range sesi yang mau direset
        const sessionStart = startSlotIndex;
        const sessionEnd = startSlotIndex + SLOTS_PER_CHANNEL - 1;

        if (orderStartIndex <= sessionEnd && orderEndIndex >= sessionStart) {
          ordersInSession.push(order.order_id);
        }
        slotCursor += slotCount;
      }

      if (ordersInSession.length === 0) {
        return interaction.reply({
          content: `> ℹ️ Tidak ada order aktif di Sesi ${sessionNum + 1}.`,
          flags: 64,
        });
      }

      // Reset hanya order di sesi ini
      let count = 0;
      for (const oid of ordersInSession) {
        if (db.orders[oid]) {
          db.orders[oid].payment_status = 'reset';
          db.orders[oid].updated_at = new Date().toISOString();
          count++;
        }
      }
      saveDB(db);

      // Update slot list setelah reset
      try {
        const { updateSlotList } = await import('../utils/slotListUpdater.js');
        await updateSlotList(interaction.client);
      } catch (e) { logger.warn('updateSlotList error:', e.message); }

      const sisaSlot = config.maxSlots - getActiveSlotCount();
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`✅ Sesi ${sessionNum + 1} Direset`)
        .setDescription([
          `> **${count} order** di Sesi ${sessionNum + 1} telah direset.`,
          `> Sisa slot sekarang: **${sisaSlot}/${config.maxSlots}**`,
          `> ⚠️ Order di sesi lain **tidak terpengaruh**.`,
        ].join('\n'))
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ===== RESET 1 ORDER =====
    if (target === 'one') {
      if (!orderId) {
        return interaction.reply({ content: '> ❌ Masukkan Order ID di field `order_id`.', flags: 64 });
      }

      const order = db.orders[orderId];
      if (!order) {
        return interaction.reply({ content: `> ❌ Order ID \`${orderId}\` tidak ditemukan.`, flags: 64 });
      }
      if (order.payment_status !== 'accepted') {
        return interaction.reply({ content: `> ⚠️ Order \`${orderId}\` statusnya bukan accepted (status: \`${order.payment_status}\`).`, flags: 64 });
      }

      db.orders[orderId].payment_status = 'reset';
      db.orders[orderId].updated_at = new Date().toISOString();
      saveDB(db);

      // Update slot list setelah reset
      try {
        const { updateSlotList } = await import('../utils/slotListUpdater.js');
        await updateSlotList(interaction.client);
      } catch (e) { logger.warn('updateSlotList error:', e.message); }

      const sisaSlot = config.maxSlots - getActiveSlotCount();
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Slot Direset')
        .setDescription([
          `> Order \`${orderId}\` berhasil direset.`,
          `> Sisa slot sekarang: **${sisaSlot}/${config.maxSlots}**`,
        ].join('\n'))
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};

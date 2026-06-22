// src/events/ready.js
import logger from '../utils/logger.js';
import { startPanelRefresh } from '../commands/setup.js';
import { startSlotListRefresh } from '../utils/slotListUpdater.js';
import { updateAllDurationChannels } from '../utils/durationChannelManager.js';
import config from '../config/config.js';

async function validateChannels(client) {
  logger.info('🔍 Validating channel configuration...');

  // Cek ORDER_MASUK_CHANNEL_ID
  const orderMasukId = config.channels.orderMasuk;
  if (!orderMasukId) {
    logger.warn('⚠️  [CONFIG] ORDER_MASUK_CHANNEL_ID tidak diset di environment variables');
  } else {
    const ch = await client.channels.fetch(orderMasukId).catch(() => null);
    if (!ch) logger.error(`❌ [CONFIG] ORDER_MASUK_CHANNEL_ID="${orderMasukId}" — channel tidak ditemukan atau bot tidak punya akses`);
    else logger.info(`✅ [CONFIG] ORDER_MASUK_CHANNEL_ID OK → #${ch.name}`);
  }

  // Cek TRANSACTION_LOG_CHANNEL_ID
  const txLogId = config.channels.transactionLog;
  if (!txLogId) {
    logger.warn('⚠️  [CONFIG] TRANSACTION_LOG_CHANNEL_ID tidak diset');
  } else {
    const ch = await client.channels.fetch(txLogId).catch(() => null);
    if (!ch) logger.error(`❌ [CONFIG] TRANSACTION_LOG_CHANNEL_ID="${txLogId}" — channel tidak ditemukan`);
    else logger.info(`✅ [CONFIG] TRANSACTION_LOG_CHANNEL_ID OK → #${ch.name}`);
  }

  // Cek DURATION_CHANNEL per durasi
  for (const [dur, id] of Object.entries(config.channels.durationChannels)) {
    if (!id) {
      logger.warn(`⚠️  [CONFIG] DURATION_CHANNEL_${dur.toUpperCase()} tidak diset`);
      continue;
    }
    const ch = await client.channels.fetch(id).catch(() => null);
    if (!ch) logger.error(`❌ [CONFIG] DURATION_CHANNEL_${dur.toUpperCase()}="${id}" — channel tidak ditemukan`);
    else logger.info(`✅ [CONFIG] DURATION_CHANNEL_${dur.toUpperCase()} OK → #${ch.name}`);
  }

  // Cek SLOT_LIST_CHANNEL
  for (let i = 0; i < config.channels.slotListChannels.length; i++) {
    const id = config.channels.slotListChannels[i];
    const ch = await client.channels.fetch(id).catch(() => null);
    if (!ch) logger.error(`❌ [CONFIG] SLOT_LIST_CHANNEL_${i + 1}="${id}" — channel tidak ditemukan`);
    else logger.info(`✅ [CONFIG] SLOT_LIST_CHANNEL_${i + 1} OK → #${ch.name}`);
  }
}

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`✅ Bot online as: ${client.user.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

    // Validasi semua channel config saat startup — error langsung kelihatan di log
    await validateChannels(client);

    client.user.setPresence({
      activities: [{ name: '🎫 PTPT Order System', type: 3 }],
      status: 'online',
    });

    startPanelRefresh(client);
    logger.info('🔄 Panel auto-refresh aktif (setiap 1 menit)');

    startSlotListRefresh(client);
    logger.info('📋 Slot list auto-refresh aktif (setiap 1 menit)');

    // Inisialisasi & refresh semua channel durasi saat startup
    await updateAllDurationChannels(client);
    logger.info('📂 Duration channels diperbarui saat startup');

    // Auto-refresh channel durasi setiap 5 menit
    setInterval(() => updateAllDurationChannels(client), 5 * 60_000);
    logger.info('🔄 Duration channel auto-refresh aktif (setiap 5 menit)');
  }
};

// src/events/ready.js
import logger from '../utils/logger.js';
import { startPanelRefresh } from '../commands/setup.js';
import { startSlotListRefresh } from '../utils/slotListUpdater.js';
import config from '../config/config.js';

async function validateChannels(client) {
  logger.info('🔍 Validating channel config...');

  const checks = [
    ['TRANSACTION_LOG', config.channels.transactionLog],
    ['TICKET_LOG',      config.channels.ticketLog],
    ['SLOT_LIST_REVV',  config.channels.slotListRevv],
    ['SLOT_LIST_IBO',   config.channels.slotListIbo],
  ];

  for (const [name, id] of checks) {
    if (!id) { logger.warn(`⚠️  [CONFIG] ${name} tidak diset`); continue; }
    const ch = await client.channels.fetch(id).catch(() => null);
    if (!ch) logger.error(`❌ [CONFIG] ${name}="${id}" — channel tidak ditemukan`);
    else logger.info(`✅ [CONFIG] ${name} OK → #${ch.name}`);
  }
}

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`✅ Bot online as: ${client.user.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

    await validateChannels(client);

    client.user.setPresence({
      activities: [{ name: '🎫 PTPT Order System', type: 3 }],
      status: 'online',
    });

    startPanelRefresh(client);
    logger.info('🔄 Panel auto-refresh aktif (setiap 1 menit)');

    startSlotListRefresh(client);
    logger.info('📋 Slot list auto-refresh aktif (setiap 1 menit)');
  }
};

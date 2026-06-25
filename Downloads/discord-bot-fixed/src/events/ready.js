// src/events/ready.js
import logger from '../utils/logger.js';
import { startPanelRefresh } from '../commands/setup.js';
import { startSlotListRefresh } from '../utils/slotListUpdater.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`✅ Bot online as: ${client.user.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

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

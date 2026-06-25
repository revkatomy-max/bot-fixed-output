// src/config/config.js
import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  channels: {
    transactionLog: process.env.TRANSACTION_LOG_CHANNEL_ID,
    ticketLog: process.env.TICKET_LOG_CHANNEL_ID,
    ticketCategory: process.env.TICKET_CATEGORY_ID,
    // Slot list channels — tambah sebanyak yang dibutuhkan di .env
    slotListChannels: [
      process.env.SLOT_LIST_CHANNEL_1,
      process.env.SLOT_LIST_CHANNEL_2,
      process.env.SLOT_LIST_CHANNEL_3,
      process.env.SLOT_LIST_CHANNEL_4,
      process.env.SLOT_LIST_CHANNEL_5,
    ].filter(Boolean),
  },

  roles: {
    moderator: process.env.MODERATOR_ROLE_ID,
    admin: process.env.ADMIN_ROLE_ID,
  },

  ticket: {
    cooldown: parseInt(process.env.TICKET_COOLDOWN) || 60,
  },

  payment: {
    qrisData: process.env.QRIS_DATA || 'PTPT-PAYMENT',
    paymentName: process.env.PAYMENT_NAME || 'PTPT Store',
  },

  defaultPrices: {
    '6h': parseInt(process.env.DEFAULT_PRICE_6H) || 5000,
    '12h': parseInt(process.env.DEFAULT_PRICE_12H) || 10000,
    '24h': parseInt(process.env.DEFAULT_PRICE_24H) || 20000,
    '48h': parseInt(process.env.DEFAULT_PRICE_48H) || 35000,
    '72h': parseInt(process.env.DEFAULT_PRICE_72H) || 50000,
    '168h': parseInt(process.env.DEFAULT_PRICE_168H) || 100000,
  },

  colors: {
    primary: 0x5865F2,
    success: 0x57F287,
    warning: 0xFEE75C,
    danger: 0xED4245,
    info: 0x00B0F4,
    purple: 0x9B59B6,
    neon: 0x00FFFF,
  },

  durations: ['6h', '12h', '24h', '48h', '72h', '168h'],
  durationLabels: {
    '6h': '6 Jam',
    '12h': '12 Jam',
    '24h': '24 Jam',
    '48h': '48 Jam',
    '72h': '72 Jam',
    '168h': '168 Jam (7 Hari)',
  },

  slots: [1, 2, 3, 4, 5],
  maxSlots: parseInt(process.env.MAX_SLOTS) || 18,
};

export default config;

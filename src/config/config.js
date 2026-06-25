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

    // Auto list per server
    slotListRevv: process.env.SLOT_LIST_REVV_CHANNEL_ID,
    slotListIbo:  process.env.SLOT_LIST_IBO_CHANNEL_ID,
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

  servers: ['revv', 'ibo'],
  serverLabels: {
    revv: 'Server Revv',
    ibo:  'Server IBO',
  },

  maxSlotsPerServer: {
    revv: parseInt(process.env.MAX_SLOTS_REVV) || 20,
    ibo:  parseInt(process.env.MAX_SLOTS_IBO)  || 20,
  },

  defaultPrices: {
    revv: {
      '6h':  parseInt(process.env.REVV_DEFAULT_PRICE_6H)  || 5000,
      '12h': parseInt(process.env.REVV_DEFAULT_PRICE_12H) || 10000,
      '24h': parseInt(process.env.REVV_DEFAULT_PRICE_24H) || 20000,
      '36h': parseInt(process.env.REVV_DEFAULT_PRICE_36H) || 30000,
      '48h': parseInt(process.env.REVV_DEFAULT_PRICE_48H) || 35000,
      '72h': parseInt(process.env.REVV_DEFAULT_PRICE_72H) || 50000,
    },
    ibo: {
      '6h':  parseInt(process.env.IBO_DEFAULT_PRICE_6H)  || 5000,
      '12h': parseInt(process.env.IBO_DEFAULT_PRICE_12H) || 10000,
      '24h': parseInt(process.env.IBO_DEFAULT_PRICE_24H) || 20000,
      '36h': parseInt(process.env.IBO_DEFAULT_PRICE_36H) || 30000,
      '48h': parseInt(process.env.IBO_DEFAULT_PRICE_48H) || 35000,
      '72h': parseInt(process.env.IBO_DEFAULT_PRICE_72H) || 50000,
    },
  },

  colors: {
    primary: 0x5865F2,
    success: 0x57F287,
    warning: 0xFEE75C,
    danger:  0xED4245,
    info:    0x00B0F4,
    purple:  0x9B59B6,
    neon:    0x00FFFF,
    revv:    0x5865F2,
    ibo:     0x9B59B6,
  },

  durations: ['6h', '12h', '24h', '36h', '48h', '72h'],
  durationLabels: {
    '6h':  '6 Jam',
    '12h': '12 Jam',
    '24h': '24 Jam',
    '36h': '36 Jam',
    '48h': '48 Jam',
    '72h': '72 Jam',
  },

  slots: [1, 2, 3, 4, 5],
};

export default config;

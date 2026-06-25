# 🎫 DISCORD BOT PTPT ORDER SYSTEM

Bot Discord production-ready untuk sistem order PTPT otomatis dengan ticket private, QR payment, verifikasi pembayaran, dan admin panel harga.

---

## ✨ FITUR LENGKAP

| Fitur | Status |
|-------|--------|
| 🎫 Sistem Ticket Private | ✅ |
| 📋 Form Order Modal | ✅ |
| 💳 QR Code Pembayaran Otomatis | ✅ |
| 📤 Upload Bukti Pembayaran | ✅ |
| ✅ Verifikasi Moderator | ✅ |
| 📊 Log Transaksi Otomatis | ✅ |
| ⚙️ Admin Panel Harga | ✅ |
| 🔢 Kalkulasi Harga Otomatis | ✅ |
| 🛡️ Anti Spam & Cooldown | ✅ |
| 💾 Database SQLite Persisten | ✅ |
| 🎨 Embed Modern (Neon Style) | ✅ |

---

## 📁 STRUKTUR FOLDER

```
discord-bot-ptpt/
├── src/
│   ├── commands/
│   │   ├── setup.js          # /setup - buat panel ticket
│   │   └── prices.js         # /setprice, /prices, /resetprice, /adminpanel
│   ├── events/
│   │   ├── ready.js          # event bot online
│   │   └── interactionCreate.js # router semua interaksi
│   ├── handlers/
│   │   ├── buttonHandler.js  # handler semua button
│   │   ├── modalHandler.js   # handler semua modal
│   │   ├── selectMenuHandler.js # handler select menu
│   │   ├── commandHandler.js # loader slash commands
│   │   └── eventHandler.js   # loader events
│   ├── utils/
│   │   ├── logger.js         # sistem logging winston
│   │   ├── qrGenerator.js    # generate QR code
│   │   ├── permissions.js    # validasi role/permission
│   │   └── cooldownManager.js # anti spam sistem
│   ├── database/
│   │   └── database.js       # SQLite database & queries
│   ├── config/
│   │   └── config.js         # konfigurasi global
│   ├── tickets/
│   │   └── ticketManager.js  # logic buat/tutup ticket
│   ├── embeds/
│   │   └── embedBuilder.js   # semua embed discord
│   ├── modals/
│   │   └── orderModal.js     # definisi semua modal
│   ├── buttons/
│   │   └── buttonBuilder.js  # definisi semua button
│   ├── selectmenus/
│   │   └── orderSelectMenus.js # definisi select menus
│   ├── index.js              # entry point utama
│   └── deploy-commands.js    # deploy slash commands
├── data/                     # database SQLite (auto-created)
├── logs/                     # file log (auto-created)
├── .env.example              # template environment
├── package.json
└── README.md
```

---

## 🚀 CARA INSTALL & MENJALANKAN

### 1. Requirements

- Node.js v20+ (disarankan v22 LTS atau v24)
- npm
- Discord Bot Token

### 2. Clone / Download Project

```bash
git clone <repo-url>
cd discord-bot-ptpt
```

### 3. Install Dependencies

```bash
npm install
```

> ⚠️ Jika ada error `canvas`, install system dependency:
> ```bash
> # Ubuntu/Debian
> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
> ```

### 4. Setup Environment

```bash
cp .env.example .env
```

Edit file `.env`:

```env
DISCORD_TOKEN=your_actual_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id

TRANSACTION_LOG_CHANNEL_ID=channel_id_untuk_log_transaksi
TICKET_LOG_CHANNEL_ID=channel_id_untuk_log_ticket
TICKET_CATEGORY_ID=category_id_untuk_ticket (opsional)

MODERATOR_ROLE_ID=role_id_moderator
ADMIN_ROLE_ID=role_id_admin

QRIS_DATA=string_qris_atau_nomor_rekening
PAYMENT_NAME=Nama Toko Kamu
```

### 5. Setup Discord Bot

Pergi ke [Discord Developer Portal](https://discord.com/developers/applications):

1. **New Application** → beri nama
2. Tab **Bot**:
   - Reset Token → copy token ke `.env`
   - Enable: `SERVER MEMBERS INTENT`, `MESSAGE CONTENT INTENT`
3. Tab **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (atau minimal: Manage Channels, Send Messages, Manage Messages, Read Messages, Attach Files)
4. Copy link invite → tambahkan bot ke server

### 6. Deploy Slash Commands

```bash
npm run deploy
```

### 7. Jalankan Bot

```bash
# Production
npm start

# Development (auto-restart on file change)
npm run dev
```

---

## ⚙️ SETUP CHANNEL & ROLE

Setelah bot masuk server:

1. Buat channel `#transaction-log` → salin ID → masukkan ke `.env`
2. Buat channel `#ticket-log` → salin ID → masukkan ke `.env`
3. Buat category `Tickets` (opsional) → salin ID → masukkan ke `.env`
4. Buat role `Moderator` → salin ID → masukkan ke `.env`
5. Restart bot setelah update `.env`

### Setup Panel Ticket

Di channel yang diinginkan, ketik:
```
/setup
```
Bot akan mengirim panel ticket dengan tombol **ORDER PTPT**.

### Setup Harga

```
/adminpanel          → buka panel admin dengan tombol edit harga
/setprice 24h 20000  → set harga 24 jam = Rp20.000
/prices              → lihat semua harga
/resetprice          → reset ke harga default
```

---

## 📋 ALUR ORDER LENGKAP

```
1. User klik [ORDER PTPT]
         ↓
2. Bot buat channel ticket-username (private)
         ↓
3. User klik [🛒 ORDER PTPT] di ticket
         ↓
4. Modal muncul → isi Username & Display Name Roblox
         ↓
5. Pilih Jumlah Slot (1-5)
         ↓
6. Pilih Durasi (6h/12h/24h/48h/72h/168h)
         ↓
7. Bot generate QR Code + Embed Ringkasan Order
         ↓
8. User scan QR & bayar
         ↓
9. User klik [📤 Upload Bukti Bayar]
         ↓
10. User kirim foto bukti di chat
          ↓
11. Bot kirim embed bukti ke ticket + transaction-log
    + tombol [✅ ACCEPT] [❌ REJECT] untuk moderator
          ↓
12. Moderator klik ACCEPT/REJECT
          ↓
13. Status update → notif ke user → log transaksi update
          ↓
14. Moderator klik [❌ Close Ticket] → channel dihapus
```

---

## 🛡️ SISTEM KEAMANAN

- **Cooldown ticket**: User tidak bisa buat ticket dalam waktu tertentu (default 60 detik)
- **1 ticket aktif per user**: User tidak bisa buat 2 ticket sekaligus
- **Anti spam button**: Cooldown 3-5 detik per klik button
- **Permission validation**: Setiap button/command dicek permission
- **Try-catch semua handler**: Error tidak crash bot
- **Unhandled rejection handler**: Auto-catch semua promise error
- **Image validation**: Hanya PNG/JPG/JPEG/WEBP yang diterima
- **Price validation**: Input harga divalidasi sebelum disimpan

---

## 🖥️ DEPLOY KE VPS

### Menggunakan PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start src/index.js --name "ptpt-bot"

# Auto-start saat server restart
pm2 startup
pm2 save

# Monitor
pm2 logs ptpt-bot
pm2 status
```

### Menggunakan systemd

```ini
# /etc/systemd/system/ptpt-bot.service
[Unit]
Description=PTPT Discord Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/discord-bot-ptpt
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ptpt-bot
sudo systemctl start ptpt-bot
sudo systemctl status ptpt-bot
```

---

## 📝 ENVIRONMENT VARIABLES LENGKAP

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `DISCORD_TOKEN` | ✅ | Token bot dari Developer Portal |
| `CLIENT_ID` | ✅ | Application ID dari Developer Portal |
| `GUILD_ID` | ❌ | Server ID (untuk dev, command langsung aktif) |
| `TRANSACTION_LOG_CHANNEL_ID` | ✅ | Channel untuk log semua transaksi |
| `TICKET_LOG_CHANNEL_ID` | ❌ | Channel untuk transcript ticket |
| `TICKET_CATEGORY_ID` | ❌ | Category tempat ticket dibuat |
| `MODERATOR_ROLE_ID` | ✅ | Role yang bisa verifikasi pembayaran |
| `ADMIN_ROLE_ID` | ❌ | Role admin (bisa edit harga + close ticket) |
| `TICKET_COOLDOWN` | ❌ | Cooldown buat ticket (detik, default: 60) |
| `QRIS_DATA` | ✅ | String QRIS / nomor rekening untuk QR Code |
| `PAYMENT_NAME` | ❌ | Nama penerima di embed pembayaran |
| `DEFAULT_PRICE_6H` | ❌ | Harga default 6 jam (default: 5000) |
| `DEFAULT_PRICE_12H` | ❌ | Harga default 12 jam (default: 10000) |
| `DEFAULT_PRICE_24H` | ❌ | Harga default 24 jam (default: 20000) |
| `DEFAULT_PRICE_48H` | ❌ | Harga default 48 jam (default: 35000) |
| `DEFAULT_PRICE_72H` | ❌ | Harga default 72 jam (default: 50000) |
| `DEFAULT_PRICE_168H` | ❌ | Harga default 168 jam (default: 100000) |

---

## 🆘 TROUBLESHOOTING

**Bot tidak muncul di server?**
→ Pastikan GUILD_ID benar dan jalankan `npm run deploy`

**Canvas error saat install?**
→ Install build tools: `sudo apt install build-essential libcairo2-dev`

**QR Code tidak muncul?**
→ Cek QRIS_DATA di `.env`, pastikan tidak kosong

**Ticket tidak bisa dibuat?**
→ Pastikan bot punya permission `Manage Channels` dan `TICKET_CATEGORY_ID` valid

**Button tidak merespons?**
→ Pastikan `MODERATOR_ROLE_ID` sudah diset, dan bot sudah restart setelah update `.env`

---

## 👨‍💻 PENGEMBANGAN LEBIH LANJUT

Untuk menambah fitur baru:
- **Command baru**: buat file di `src/commands/` → export `{ data, execute }`
- **Button baru**: tambah handler di `src/handlers/buttonHandler.js`
- **Modal baru**: tambah di `src/modals/orderModal.js`
- **Event baru**: buat file di `src/events/`

Database otomatis tersimpan di `data/ptpt.db` dan tidak reset saat restart.

---

*⚡ PTPT ORDER SYSTEM • Production Ready Discord Bot*

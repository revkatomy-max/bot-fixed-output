# 🚀 Panduan Deploy ke Railway.app

## Langkah-langkah

### 1. Push ke GitHub dulu
```bash
git init
git add .
git commit -m "feat: PTPT bot v3"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. Buat project di Railway
1. Buka [railway.app](https://railway.app) → **New Project**
2. Pilih **"Deploy from GitHub repo"** → pilih repo kamu
3. Railway otomatis detect Node.js dan mulai build

### 3. Tambah Volume (WAJIB — untuk database persistent)
> ⚠️ Tanpa ini, semua data order hilang tiap deploy!

1. Di dashboard Railway → klik service bot kamu
2. Tab **"Volumes"** → **"Add Volume"**
3. Isi:
   - **Mount Path:** `/data`
   - **Size:** 1 GB (cukup)
4. Klik **Create**

### 4. Set Environment Variables
Di Railway → tab **"Variables"** → tambahkan semua variabel berikut:

#### Wajib
```
DISCORD_TOKEN=          ← token bot dari Discord Developer Portal
CLIENT_ID=              ← Application ID
GUILD_ID=               ← Server ID Discord kamu
```

#### Channel Log & Kategori
```
TRANSACTION_LOG_CHANNEL_ID=
TICKET_LOG_CHANNEL_ID=
TICKET_CATEGORY_ID=
```

#### Channel Per Durasi (WAJIB DIISI SEMUA)
```
DURATION_CHANNEL_6H=    ← ID channel untuk order 6 Jam
DURATION_CHANNEL_12H=   ← ID channel untuk order 12 Jam
DURATION_CHANNEL_24H=   ← ID channel untuk order 24 Jam
DURATION_CHANNEL_36H=   ← ID channel untuk order 36 Jam
DURATION_CHANNEL_48H=   ← ID channel untuk order 48 Jam
DURATION_CHANNEL_72H=   ← ID channel untuk order 72 Jam
```

#### Slot List Global (opsional)
```
SLOT_LIST_CHANNEL_1=
SLOT_LIST_CHANNEL_2=
```

#### Role
```
MODERATOR_ROLE_ID=
ADMIN_ROLE_ID=
```

#### Pembayaran & QRIS
```
QRIS_DATA=
PAYMENT_NAME=
```

#### Harga Default (Rupiah, bisa diubah lewat /prices)
```
DEFAULT_PRICE_6H=5000
DEFAULT_PRICE_12H=10000
DEFAULT_PRICE_24H=20000
DEFAULT_PRICE_36H=30000
DEFAULT_PRICE_48H=35000
DEFAULT_PRICE_72H=50000
```

#### Lainnya
```
MAX_SLOTS=18
TICKET_COOLDOWN=60
LOG_LEVEL=info
RAILWAY_VOLUME_MOUNT_PATH=/data
```

> ⚠️ `RAILWAY_VOLUME_MOUNT_PATH=/data` harus diisi manual agar bot tahu lokasi database.

### 5. Deploy Slash Commands (sekali saja)
Setelah bot pertama kali jalan, jalankan deploy commands:

**Cara 1 — Via Railway CLI:**
```bash
npm install -g @railway/cli
railway link
railway run node src/deploy-commands.js
```

**Cara 2 — Tambah variable sementara:**
1. Tambah `RUN_DEPLOY_COMMANDS=true` di Variables Railway
2. Redeploy → commands ter-deploy otomatis
3. Hapus variable tersebut setelah selesai

### 6. Verifikasi
Setelah deploy berhasil:
- ✅ Bot online di Discord
- ✅ Slash commands (`/setup`, `/reset-slot`, dll.) muncul di server
- ✅ Data tersimpan di Volume `/data/ptpt.json`

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak online | Cek `DISCORD_TOKEN` di Variables |
| Slash commands tidak muncul | Jalankan `node src/deploy-commands.js` |
| Data hilang tiap restart | Pastikan Volume sudah dibuat & `RAILWAY_VOLUME_MOUNT_PATH=/data` sudah diset |
| Bot crash loop | Cek logs Railway → tab **"Logs"** |
| Channel durasi tidak update | Pastikan `DURATION_CHANNEL_*` sudah diisi dan bot punya permission `Send Messages` di channel tersebut |

// src/utils/qrGenerator.js
import { AttachmentBuilder } from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path ke gambar QRIS statis kamu — taruh file di folder assets/qris.png
const QRIS_PATH = join(__dirname, '../../assets/qris.png');

export async function generateQRCode(_data) {
  try {
    if (!existsSync(QRIS_PATH)) {
      throw new Error(`File QRIS tidak ditemukan di: ${QRIS_PATH}\nPastikan kamu menaruh gambar QRIS di folder assets/qris.png`);
    }

    const buffer = readFileSync(QRIS_PATH);
    const attachment = new AttachmentBuilder(buffer, { name: 'qrcode.png' });
    return attachment;
  } catch (error) {
    logger.error('Error loading QRIS image:', error);
    throw error;
  }
}

export default generateQRCode;

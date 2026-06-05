// src/commands/setqris.js
import { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const QRIS_PATH = join(__dirname, '../../assets/qris.png');

export default {
  data: new SlashCommandBuilder()
    .setName('setqris')
    .setDescription('Upload gambar QRIS untuk pembayaran')
    .addAttachmentOption(opt =>
      opt.setName('gambar')
        .setDescription('Upload gambar QRIS kamu (PNG/JPG)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '> ❌ Hanya Administrator yang bisa menggunakan command ini.', flags: 64 });
    }

    await interaction.deferReply({ ephemeral: true });

    const attachment = interaction.options.getAttachment('gambar');

    if (!attachment.contentType?.startsWith('image/')) {
      return interaction.editReply({ content: '> ❌ File harus berupa gambar (PNG/JPG).' });
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const res = await fetch(attachment.url);
      if (!res.ok) throw new Error('Gagal download gambar');

      const buffer = Buffer.from(await res.arrayBuffer());
      mkdirSync(join(__dirname, '../../assets'), { recursive: true });
      writeFileSync(QRIS_PATH, buffer);

      const preview = new AttachmentBuilder(buffer, { name: 'qris-preview.png' });

      await interaction.editReply({
        content: '> ✅ **QRIS berhasil disimpan!** Preview:',
        files: [preview],
      });
    } catch (err) {
      await interaction.editReply({ content: `> ❌ Gagal menyimpan QRIS: ${err.message}` });
    }
  }
};

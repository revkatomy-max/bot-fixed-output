// src/tickets/ticketManager.js
import {
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import config from '../config/config.js';
import {
  createTicket,
  closeTicket,
  claimTicket,
  getTicketByChannelId,
  setTicketCooldown,
  isOnCooldown,
  getCooldownRemaining,
  getActiveTicketByUser,
} from '../database/database.js';
import { createTicketOpenEmbed } from '../embeds/embedBuilder.js';
import logger from '../utils/logger.js';

export async function createTicketChannel(guild, user) {
  try {
    // Check cooldown
    if (isOnCooldown(user.id, config.ticket.cooldown)) {
      const remaining = getCooldownRemaining(user.id, config.ticket.cooldown);
      return { success: false, error: `cooldown`, remaining };
    }

    // Check for existing active ticket
    const existing = getActiveTicketByUser(user.id);
    if (existing) {
      return { success: false, error: 'existing', channelId: existing.channel_id };
    }

    const ticketId = `PTPT-${Date.now().toString(36).toUpperCase()}`;
    const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Permission overwrites
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    // Add moderator role
    if (config.roles.moderator) {
      permissionOverwrites.push({
        id: config.roles.moderator,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    // Add admin role
    if (config.roles.admin) {
      permissionOverwrites.push({
        id: config.roles.admin,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const channelOptions = {
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
    };

    if (config.channels.ticketCategory) {
      channelOptions.parent = config.channels.ticketCategory;
    }

    const channel = await guild.channels.create(channelOptions);

    // Save to DB
    createTicket(ticketId, channel.id, user.id, user.username);
    setTicketCooldown(user.id);

    // Send welcome message
    const embed = createTicketOpenEmbed(`<@${user.id}>`, ticketId);

    const orderRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('order_ptpt')
        .setLabel('🛒 ORDER PTPT')
        .setStyle(ButtonStyle.Primary)
    );

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('🔒 Claim Ticket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('❌ Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${user.id}>`,
      embeds: [embed],
      components: [orderRow, controlRow],
    });

    logger.info(`Ticket created: ${ticketId} by ${user.username}`);
    return { success: true, channel, ticketId };
  } catch (error) {
    logger.error('Error creating ticket:', error);
    return { success: false, error: 'system', message: error.message };
  }
}

export async function closeTicketChannel(interaction, reason = null) {
  const ticket = getTicketByChannelId(interaction.channelId);
  if (!ticket) return;

  try {
    // Safe reply — pakai followUp jika interaction sudah di-reply
    const closeMsg = '> ⏳ Menutup ticket dalam 5 detik...';
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: closeMsg, ephemeral: false });
      } else {
        await interaction.reply({ content: closeMsg, ephemeral: false });
      }
    } catch {
      // Kalau semua gagal, kirim ke channel langsung
      await interaction.channel.send(closeMsg).catch(() => {});
    }

    closeTicket(ticket.ticket_id);

    // Send transcript/log to ticket log channel
    await sendTicketTranscript(interaction.guild, ticket);

    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (e) {
        logger.error('Error deleting channel:', e);
      }
    }, 5000);
  } catch (error) {
    logger.error('Error closing ticket:', error);
  }
}

export async function sendTicketTranscript(guild, ticket) {
  try {
    const logChannelId = config.channels.ticketLog;
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const { EmbedBuilder } = await import('discord.js');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 TICKET TRANSCRIPT')
      .addFields(
        { name: '🆔 Ticket ID', value: `\`${ticket.ticket_id}\``, inline: true },
        { name: '👤 User ID', value: `\`${ticket.user_id}\``, inline: true },
        { name: '👤 Username', value: `\`${ticket.username}\``, inline: true },
        { name: '📅 Dibuat', value: `\`${ticket.created_at}\``, inline: true },
        { name: '📅 Ditutup', value: `\`${new Date().toISOString()}\``, inline: true },
      )
      .setFooter({ text: '⚡ PTPT ORDER SYSTEM • Ticket Log' })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('Error sending ticket transcript:', error);
  }
}

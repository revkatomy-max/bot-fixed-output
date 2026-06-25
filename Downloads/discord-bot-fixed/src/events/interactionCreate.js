// src/events/interactionCreate.js
import { handleButton } from '../handlers/buttonHandler.js';
import { handleModal } from '../handlers/modalHandler.js';
import { handleSelectMenu } from '../handlers/selectMenuHandler.js';
import logger from '../utils/logger.js';

export default {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // ===== SLASH COMMANDS =====
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction);
        } catch (error) {
          logger.error(`Command error [/${interaction.commandName}]:`, error);
          const reply = { content: '> ❌ Terjadi error saat menjalankan command.', flags: 64 };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        }
        return;
      }

      // ===== BUTTONS =====
      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }

      // ===== MODALS =====
      if (interaction.isModalSubmit()) {
        await handleModal(interaction);
        return;
      }

      // ===== SELECT MENUS =====
      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
        return;
      }

    } catch (error) {
      logger.error('Unhandled interaction error:', error);
    }
  }
};

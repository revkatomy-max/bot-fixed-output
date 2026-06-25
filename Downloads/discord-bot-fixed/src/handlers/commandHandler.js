// src/handlers/commandHandler.js
import { Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = join(__dirname, '../commands');
  const commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const module = await import(`../commands/${file}`);

      // Handle both default and named exports
      const exports = Object.values(module);

      for (const cmd of exports) {
        if (cmd && cmd.data && cmd.execute) {
          client.commands.set(cmd.data.name, cmd);
          logger.info(`✅ Loaded command: ${cmd.data.name}`);
        }
      }
    } catch (err) {
      logger.error(`Failed to load command file ${file}:`, err);
    }
  }

  logger.info(`📦 Total commands loaded: ${client.commands.size}`);
}

// src/deploy-commands.js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const module = await import(`./commands/${file}`);
  const exports = Object.values(module);
  for (const cmd of exports) {
    if (cmd && cmd.data) {
      commands.push(cmd.data.toJSON());
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`🔄 Deploying ${commands.length} slash commands...`);

  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);

  await rest.put(route, { body: commands });

  console.log(`✅ Successfully deployed ${commands.length} commands!`);
  commands.forEach(cmd => console.log(`  - /${cmd.name}`));
} catch (error) {
  console.error('❌ Deploy failed:', error);
  process.exit(1);
}

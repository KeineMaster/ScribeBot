require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const cron = require('node-cron');
const tracker = require('./tracker');
const reporter = require('./reporter');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', async () => {
  console.log(`📜 Scribe-Bot is online as ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [{ name: "les chroniques de l'auberge", type: ActivityType.Watching }],
  });

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set([
      {
        name: 'scribe',
        description: "Déclenche le rapport de l'auberge immédiatement",
      },
    ]);
    console.log('✅ Commande /scribe enregistrée');
  } else {
    console.error(`❌ Serveur introuvable. Vérifie GUILD_ID dans .env`);
  }

  // Rapport automatique chaque lundi à 9h
  cron.schedule('0 9 * * 1', () => {
    reporter.sendReport(client);
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'scribe') {
    await interaction.deferReply();
    try {
      await reporter.sendReport(client);
      await interaction.editReply('📜 Rapport envoyé !');
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Erreur lors de la génération du rapport.');
    }
  }
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  tracker.trackMessage(message);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err.message);
  process.exit(1);
});

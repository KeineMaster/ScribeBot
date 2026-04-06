require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
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
        description: "Génère le rapport des 7 derniers jours",
      },
    ]);
    console.log('✅ Commande /scribe enregistrée');
  } else {
    console.error('❌ Serveur introuvable. Vérifie GUILD_ID dans .env');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'scribe') return;

  await interaction.deferReply();
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    await reporter.sendReport(guild, interaction);
  } catch (err) {
    console.error(err);
    await interaction.editReply('❌ Erreur lors de la génération du rapport.');
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err.message);
  process.exit(1);
});

const { EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');
const { fetchMessages } = require('./fetcher');
const { getTopMembers, getTopChannels } = require('./stats');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function getTopicSummary(messages, days) {
  if (messages.length === 0) return null;

  const formatted = messages
    .filter(m => m.content && m.content.trim().length > 0)
    .map(m => `[#${m.channelName}] ${m.username}: ${m.content}`)
    .join('\n');

  if (!formatted) return null;

  const completion = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Tu es un analyste de discussions Discord. Tu analyses les messages d'un serveur et tu identifies le sujet principal discuté. Tu comprends le français et l'argot en ligne.`,
      },
      {
        role: 'user',
        content: `Voici les ${messages.length} derniers messages du serveur sur les ${days} derniers jours.\n\nIdentifie le sujet le plus discuté et fournis un résumé concis. Réponds exactement dans ce format:\n**Sujet :** [Nom court du sujet]\n**Résumé :** [2 à 3 phrases maximum]\n\nMessages :\n${formatted}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.5,
  });

  return completion.choices[0]?.message?.content ?? null;
}

async function sendReport(guild, interaction) {
  const days = parseInt(process.env.REPORT_INTERVAL_DAYS || '7', 10);

  // Fetch messages with progress updates
  const messages = await fetchMessages(guild, days, async (percent, current, total) => {
    await interaction.editReply(`📡 Récupération des messages... ${percent}% (${current}/${total} channels)`);
  });

  await interaction.editReply(`📊 Analyse IA en cours... (${messages.length} messages récupérés)`);

  const topMembers = getTopMembers(messages);
  const topChannels = getTopChannels(messages);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  const membersText = topMembers
    .map((m, i) => `${medals[i]} **${m.username}** — ${m.total} messages`)
    .join('\n');

  const channelsText = topChannels
    .map((c, i) => `${medals[i]} **#${c.channelName}** — ${c.total} messages`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📜 The Scribe has spoken!')
    .setDescription(`*Voici les chroniques de l'auberge pour les ${days} derniers jours...*`)
    .setColor(0x5865F2)
    .addFields(
      { name: '🏆 Membres les plus actifs', value: membersText || 'Aucune donnée.' },
      { name: '💬 Channels les plus actifs', value: channelsText || 'Aucune donnée.' },
    )
    .setFooter({ text: "Scribe-Bot • L'Auberge des Streamers" })
    .setTimestamp();

  // Analyse IA du sujet le plus discuté
  if (process.env.GROQ_API_KEY) {
    try {
      const topicSummary = await getTopicSummary(messages, days);
      if (topicSummary) {
        embed.addFields({ name: '🔥 Sujet le plus discuté', value: topicSummary });
      }
    } catch (err) {
      console.error("Erreur lors de l'analyse IA :", err.message);
    }
  }

  const reportChannel = await guild.channels.fetch(process.env.REPORT_CHANNEL_ID);
  await reportChannel.send({ embeds: [embed] });

  await interaction.editReply('📜 Rapport envoyé !');
}

module.exports = { sendReport };

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

  // Limit to 500 messages max to stay within Groq free tier token limits (~8000 tokens)
  const sample = messages
    .filter(m => m.content && m.content.trim().length > 0)
    .slice(-500);

  if (sample.length === 0) return null;

  const formatted = sample
    .map(m => `[#${m.channelName}|${m.channelId}] ${m.username}: ${m.content}`)
    .join('\n')
    .slice(0, 28000); // ~7000 tokens safety cap

  if (!formatted) return null;

  const completion = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Tu es le Scribe de L'Auberge des Streamers, un serveur Discord. Tu analyses les messages et identifies les sujets qui ont généré le plus d'échanges. Tu comprends le français, l'anglais et l'argot en ligne.`,
      },
      {
        role: 'user',
        content: `Voici ${sample.length} messages du serveur Discord sur les ${days} derniers jours. Chaque message est au format [#nomChannel|channelId].\n\nIdentifie les 3 sujets CONCRETS et DISTINCTS qui ont généré le plus de messages (évite les thèmes vagues — sois précis : ex: "Le nouveau GPU RTX 5090", "La série Fallout sur Amazon"). Pour chaque sujet, note le channelId où la discussion a eu lieu.\n\nRéponds UNIQUEMENT dans ce format exact, sans intro ni conclusion :\n🔥 **Sujet :** [Sujet précis]\n**Où :** <#[channelId]>\n**Résumé :** [1-2 phrases sur ce qui a été dit/débattu]\n\n🔥 **Sujet :** [Sujet précis]\n**Où :** <#[channelId]>\n**Résumé :** [1-2 phrases sur ce qui a été dit/débattu]\n\n🔥 **Sujet :** [Sujet précis]\n**Où :** <#[channelId]>\n**Résumé :** [1-2 phrases sur ce qui a été dit/débattu]\n\nMessages :\n${formatted}`,
      },
    ],
    max_tokens: 500,
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
    .map((m, i) => `${medals[i]} <@${m.userId}> — ${m.total} messages`)
    .join('\n');

  const channelsText = topChannels
    .map((c, i) => `${medals[i]} <#${c.channelId}> — ${c.total} messages`)
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
        embed.addFields({ name: '🔥 Le Scribe a identifié 3 sujets chauds !', value: topicSummary });
      } else {
        embed.addFields({ name: '🔥 Sujets chauds', value: '*Aucun contenu textuel suffisant pour l\'analyse.*' });
      }
    } catch (err) {
      console.error("Erreur lors de l'analyse IA :", err.message, err.status, JSON.stringify(err.error ?? err.cause ?? ''));
      embed.addFields({ name: '🔥 Sujets chauds', value: `*Erreur IA : ${err.message}*` });
    }
  } else {
    embed.addFields({ name: '🔥 Sujets chauds', value: '*GROQ_API_KEY manquante dans .env*' });
  }

  const reportChannel = await guild.channels.fetch(process.env.REPORT_CHANNEL_ID);
  await reportChannel.send({ embeds: [embed] });

  await interaction.editReply('📜 Rapport envoyé !');
}

module.exports = { sendReport };

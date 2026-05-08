const OpenAI = require('openai');
const { fetchMessages } = require('./fetcher');
const { getTopMembers, getTopChannels, getTopEmojis } = require('./stats');

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
        content: `Tu es le Scribe de L'Auberge des Streamers, un serveur Discord québécois. Tu analyses les messages et identifies les sujets qui ont généré le plus d'échanges. Tu réponds en français québécois. Tu comprends le joual, l'argot québécois et l'argot en ligne.`,
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
    await interaction.editReply(`📡 Récupération des messages... ${percent}% (${current}/${total} salons)`);
  });

  await interaction.editReply(`📊 Analyse en cours par le Scribe... (${messages.length} messages récupérés)`);

  const topMembers = getTopMembers(messages);
  const topChannels = getTopChannels(messages);
  const topEmojis = getTopEmojis(messages);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  const membersText = topMembers
    .map((m, i) => `${medals[i]} <@${m.userId}> — ${m.total} messages`)
    .join('\n');

  const channelsText = topChannels
    .map((c, i) => `${medals[i]} <#${c.channelId}> — ${c.total} messages`)
    .join('\n');

  const emojisText = topEmojis.length > 0
    ? topEmojis.map((e, i) => `${medals[i]} ${e.emoji} — ${e.total} fois`).join('\n')
    : '*Aucune donnée.*';

  // Analyse IA du sujet le plus discuté
  let topicSection = '';
  if (process.env.GROQ_API_KEY) {
    try {
      const topicSummary = await getTopicSummary(messages, days);
      topicSection = topicSummary
        ? `\n🔥 **Le Scribe a identifié 3 sujets chauds cette semaine !**\n${topicSummary}`
        : '\n🔥 *Pas assez de contenu textuel pour faire une analyse.*';
    } catch (err) {
      console.error("Erreur lors de l'analyse IA :", err.message, err.status, JSON.stringify(err.error ?? err.cause ?? ''));
      topicSection = `\n🔥 *Erreur IA : ${err.message}*`;
    }
  }

  const report = [
    `📜 **Le Scribe a levé les yeux de ses parchemins...**`,
    `*Voici les chroniques de l'auberge pour les ${days} derniers jours...*`,
    ``,
    `🏆 **Membres les plus actifs**`,
    membersText || '*Aucune donnée.*',
    ``,
    `💬 **Salons les plus actifs**`,
    channelsText || '*Aucune donnée.*',
    ``,
    `😂 **Emojis les plus utilisés**`,
    emojisText,
    topicSection,
  ].join('\n');

  await interaction.channel.send(report);

  await interaction.editReply('📜 Les chroniques ont été déposées !');
}

module.exports = { sendReport };

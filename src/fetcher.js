function getExcludedChannels() {
  return (process.env.EXCLUDED_CHANNEL_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

async function fetchMessages(guild, days, onProgress) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const excluded = getExcludedChannels();

  const channels = guild.channels.cache
    .filter(c => c.isTextBased() && !c.isVoiceBased() && !excluded.includes(c.id))
    .toJSON();

  const messages = [];
  let lastReportedPercent = 0;

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const percent = Math.round(((i + 1) / channels.length) * 100);

    // Mise à jour tous les 10% pour éviter le rate limit Discord
    if (percent >= lastReportedPercent + 10) {
      lastReportedPercent = percent;
      await onProgress(percent, i + 1, channels.length);
    }

    try {
      let lastId = null;
      while (true) {
        const batch = await channel.messages.fetch({
          limit: 100,
          ...(lastId && { before: lastId }),
        });

        if (batch.size === 0) break;

        let reachedLimit = false;
        for (const msg of batch.values()) {
          if (msg.createdTimestamp < since) {
            reachedLimit = true;
            break;
          }
          if (!msg.author.bot) {
            messages.push({
              userId: msg.author.id,
              username: msg.author.username,
              channelId: channel.id,
              channelName: channel.name,
              content: msg.content,
            });
          }
        }

        if (reachedLimit || batch.size < 100) break;
        lastId = batch.last().id;
      }
    } catch (_) {
      // Channel inaccessible, on passe
    }
  }

  return messages;
}

module.exports = { fetchMessages };

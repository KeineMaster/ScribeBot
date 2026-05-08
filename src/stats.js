function getTopMembers(messages) {
  const counts = {};
  for (const msg of messages) {
    if (!counts[msg.userId]) counts[msg.userId] = { userId: msg.userId, username: msg.username, total: 0 };
    counts[msg.userId].total++;
  }
  return Object.values(counts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function getTopChannels(messages) {
  const counts = {};
  for (const msg of messages) {
    if (!counts[msg.channelId]) counts[msg.channelId] = { channelId: msg.channelId, channelName: msg.channelName, total: 0 };
    counts[msg.channelId].total++;
  }
  return Object.values(counts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function getTopEmojis(messages) {
  const counts = {};

  for (const msg of messages) {
    // Emojis custom Discord dans le contenu : <:name:id> ou <a:name:id>
    const customMatches = (msg.content || '').match(/<a?:\w+:\d+>/g) || [];
    for (const emoji of customMatches) {
      counts[emoji] = (counts[emoji] || 0) + 1;
    }

    // Emojis Unicode dans le contenu
    const unicodeMatches = (msg.content || '').match(/\p{Extended_Pictographic}/gu) || [];
    for (const emoji of unicodeMatches) {
      counts[emoji] = (counts[emoji] || 0) + 1;
    }

    // Réactions
    for (const reaction of (msg.reactions || [])) {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + reaction.count;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji, total]) => ({ emoji, total }));
}

module.exports = { getTopMembers, getTopChannels, getTopEmojis };

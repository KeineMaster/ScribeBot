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

module.exports = { getTopMembers, getTopChannels };

const Database = require('better-sqlite3');
const db = new Database('./data/scribe.db');

function getExcludedChannels() {
  return (process.env.EXCLUDED_CHANNEL_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

function getTopMembers(days = 7) {
  const excluded = getExcludedChannels();
  let query = `
    SELECT username, COUNT(*) as total
    FROM messages
    WHERE created_at >= datetime('now', '-${days} days')
  `;
  if (excluded.length > 0) {
    query += ` AND channel_id NOT IN (${excluded.map(() => '?').join(', ')})`;
  }
  query += `
    GROUP BY user_id
    ORDER BY total DESC
    LIMIT 5
  `;
  return db.prepare(query).all(excluded);
}

function getTopChannels(days = 7) {
  const excluded = getExcludedChannels();
  let query = `
    SELECT channel_name, COUNT(*) as total
    FROM messages
    WHERE created_at >= datetime('now', '-${days} days')
  `;
  if (excluded.length > 0) {
    query += ` AND channel_id NOT IN (${excluded.map(() => '?').join(', ')})`;
  }
  query += `
    GROUP BY channel_id
    ORDER BY total DESC
    LIMIT 5
  `;
  return db.prepare(query).all(excluded);
}

function getMessagesForAI(days = 7) {
  return db.prepare(`
    SELECT username, channel_name, content
    FROM messages
    WHERE created_at >= datetime('now', '-${days} days')
      AND content IS NOT NULL
      AND content != ''
    ORDER BY created_at DESC
    LIMIT 400
  `).all();
}

module.exports = { getTopMembers, getTopChannels, getMessagesForAI };

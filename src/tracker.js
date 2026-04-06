const Database = require('better-sqlite3');
const db = new Database('./data/scribe.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    username TEXT,
    channel_id TEXT,
    channel_name TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: ajoute la colonne content si elle n'existe pas déjà
try {
  db.exec(`ALTER TABLE messages ADD COLUMN content TEXT`);
} catch (_) {
  // Colonne déjà existante, rien à faire
}

function trackMessage(message) {
  const stmt = db.prepare(`
    INSERT INTO messages (user_id, username, channel_id, channel_name, content)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    message.author.id,
    message.author.username,
    message.channel.id,
    message.channel.name,
    message.content
  );
}

module.exports = { trackMessage };

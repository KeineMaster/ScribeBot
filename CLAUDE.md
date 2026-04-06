# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the bot

```bash
node src/index.js
# or
npm start
```

Run in PowerShell — Git Bash has output buffering issues that hide event logs.

## Environment variables

Copy `.env.example` to `.env` and fill in all values:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `GUILD_ID` | Discord server (guild) ID |
| `REPORT_CHANNEL_ID` | Channel where the report embed is posted |
| `REPORT_INTERVAL_DAYS` | How many days back to fetch (default: 7) |
| `EXCLUDED_CHANNEL_IDS` | Comma-separated channel IDs to exclude from stats |
| `GROQ_API_KEY` | Groq API key (free tier at console.groq.com) |

## Architecture

ScribeBot is a single-guild Discord bot with one slash command: `/scribe`. There is no persistent storage — all data is fetched on demand and discarded after the report is sent.

**Data flow on `/scribe`:**
1. `index.js` — receives the interaction, calls `reporter.sendReport(guild, interaction)`
2. `fetcher.js` — paginates through all text channels via Discord API, collecting messages from the last N days; calls `onProgress` every 10% for live updates via `interaction.editReply()`
3. `stats.js` — computes top 5 members and top 5 channels from the in-memory messages array
4. `reporter.js` — orchestrates the above, calls Groq AI for topic analysis, builds and sends the Discord embed to `REPORT_CHANNEL_ID`

**Key implementation details:**
- Uses `ready` event (not `clientReady`) — discord.js v14.14.1 has a bug where `clientReady` never fires
- All three privileged Gateway Intents must be enabled in the Discord Developer Portal: Guilds, GuildMessages, MessageContent
- The bot must be invited with both `bot` and `applications.commands` OAuth2 scopes
- Groq is accessed via the OpenAI SDK with `baseURL: 'https://api.groq.com/openai/v1'` and model `llama-3.3-70b-versatile`
- Groq free tier limit is 12,000 TPM — messages sent to AI are capped at 500 messages / 28,000 chars
- Members are displayed as `<@userId>` (mention) and channels as `<#channelId>` (link) in the embed

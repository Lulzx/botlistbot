# BotListBot

A community-curated Telegram bot directory powered by Cloudflare Workers. Originally a Python bot, now rewritten as a TypeScript monorepo with Grammy + Hono + Cloudflare D1.

## Project Structure

```
apps/
  api/          # Hono REST API with Cloudflare D1 (SQLite)
  bot/          # Grammy Telegram bot (Cloudflare Worker)
packages/
  shared/       # Shared constants (categories, types)
```

## Features

### Bot Commands (User-Facing)

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with deep linking support (`?start=search`, `favorites`, `rules`, `contributing`, `examples`) |
| `/help` | List all available commands |
| `/category` | Browse 28 bot categories with inline keyboard |
| `/explore` | Discover random bots with "Show More" and "Add to Favorites" |
| `/search <query>` | Full-text search by name, username, description, and keywords |
| `/favorites` | View favorite bots with paginated keyboard (remove, add, navigate) |
| `/favorite @bot` | Add a bot to favorites |
| `/new @bot [description]` | Submit a new bot for review (supports `🔎` for inline queries) |
| `/spam @bot` | Report a spammy bot |
| `/offline @bot` | Report an offline bot |
| `/suggest @bot` | Suggest edits (name, description, category, offline, spam, inline queries, keywords) |
| `/newbots` | View recently added bots |
| `/bestbots` | View top-rated bots |
| `/mybots` | View your submitted bots with stats |
| `/subscribe` | Subscribe to BotList update notifications |
| `/unsubscribe` | Unsubscribe from notifications |
| `/rules` | View BotListChat community rules |
| `/easteregg` | Generate fun random bot name ideas |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/broadcast [message]` | Send announcement to all subscribers (with preview/confirm flow) |
| `/review` | Review pending bot submissions (approve/reject) |
| `/suggestions` | Review pending community suggestions (accept/reject) |
| `/stats` | View activity statistics and summaries |
| `/userinfo <userId>` | View user profile, submissions, and reports |
| `/ban <userId>` | Ban a user from contributing |
| `/unban <userId>` | Unban a user |
| `/addbot @user \| Name \| Description \| categoryId` | Add a bot directly |
| `/updatebot @user \| Name \| Description \| categoryId` | Update bot info |
| `/addkeyword @bot keyword` | Add a search keyword to a bot |
| `/removekeyword @bot keyword` | Remove a keyword from a bot |

### Inline Queries

Type `@botlistbot <query>` in any Telegram chat to:
- Search bots by name, username, or description
- Browse categories (empty query)
- Share bot links inline
- Paginated results (20 per page)

### Group Chat Features (Hints)

Hashtag triggers for group chats (e.g. @BotListChat):

| Hashtag | Response |
|---------|----------|
| `#inline [query]` | Suggest using inline search with the given query |
| `#rules` | Display community rules |
| `#private` | Redirect to private chat |
| `#manybot` | Policy on Manybot-built bots |
| `#userbot` | Clarify bot vs user distinction |
| `#devlist` | Link to bot developers channel |

### Suggestion System

Users can suggest edits to any bot via `/suggest @botname`:
- Change name, description, or category
- Mark as offline or spam
- Toggle inline queries support
- Add or remove search keywords

Admins review and accept/reject suggestions from the admin panel.

### Activity Tracking

All user actions (search, explore, favorites, submissions, admin actions) are logged to the statistics API with configurable log levels for audit trails and analytics.

## API Endpoints

Full API documentation available at the `/docs` endpoint.

### Public

- `GET /categories` — List all 28 bot categories
- `GET /search?name=&username=&description=` — Search bots (also searches keywords)
- `GET /keywords/search?q=` — Search bots by keyword
- `GET /bots/random?limit=` — Random bots for exploration
- `GET /bots/new?limit=` — Recently added bots
- `GET /bots/best?limit=` — Top-rated bots
- `GET /bots/category/:id` — Bots in a category
- `GET /bots/username/:username` — Single bot detail
- `GET /bots/:id/keywords` — Keywords for a bot
- `GET /countries` — List of supported languages/regions

### User

- `POST /users` — Create or get user
- `GET /users/:telegramId` — Get user by Telegram ID
- `GET /users/:telegramId/favorites` — Get favorites
- `POST /users/:telegramId/favorites` — Add favorite
- `DELETE /users/:telegramId/favorites/:botUsername` — Remove favorite
- `GET /users/:telegramId/submissions` — Get user's submissions
- `POST /submissions` — Submit new bot
- `POST /spam-reports` — Report spam
- `POST /offline-reports` — Report offline bot
- `POST /suggestions` — Create suggestion
- `POST /subscriptions` — Subscribe
- `DELETE /subscriptions/:chatId` — Unsubscribe
- `POST /statistics` — Log activity

### Admin

- `GET /admin/submissions/pending` — Pending submissions
- `POST /admin/submissions/:id/approve` — Approve submission
- `POST /admin/submissions/:id/reject` — Reject submission
- `POST /admin/bots` — Add bot directly
- `PUT /admin/bots/username/:username` — Update bot
- `GET /admin/suggestions/pending` — Pending suggestions
- `POST /admin/suggestions/:id/accept` — Accept suggestion
- `POST /admin/suggestions/:id/reject` — Reject suggestion
- `GET /admin/statistics` — Activity logs
- `GET /admin/statistics/summary` — Stats summary
- `POST /admin/ban` — Ban user
- `POST /admin/unban` — Unban user
- `GET /admin/userinfo/:userId` — User profile
- `GET /admin/check/:telegramId` — Check admin status

## Database Schema

10 tables: `users`, `bots`, `bot_submissions`, `favorites`, `subscriptions`, `spam_reports`, `keywords`, `suggestions`, `statistics`, `countries`

Auto-migrating — schema is created/upgraded on first request.

## Prerequisites

- [Bun](https://bun.sh)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with D1 access

## Setup

```bash
# Install dependencies
bun install

# Create D1 database
wrangler d1 create botlist-db
# Copy database_id to apps/api/wrangler.jsonc

# Set bot token
wrangler secret put BOT_TOKEN --cwd apps/bot
```

## Development

```bash
bun run dev          # Both api and bot
bun run dev:api      # API only
bun run dev:bot      # Bot only (local polling)
```

## Deployment

```bash
bun run deploy       # Both apps
bun run deploy:api   # API only
bun run deploy:bot   # Bot only
```

### Webhook Setup

```bash
cd apps/bot && bun run webhook
```

## What's Left To Do

### Not Yet Ported from Old Bot

- **BotList Channel Transmission** — Publishing the full categorized bot list to the @BotList Telegram channel (old: `components/botlist.py`). This was a major feature that generates and sends category-organized messages to a public channel.
- **Bot Checker Worker** — Background worker that pings bots to check if they're online/offline (old: `botcheckerworker/`).
- **Forward/Reply Routing** — Handle forwarded bot messages and replies to detect @usernames and auto-lookup (old: `routing.py`).
- **Rating System** — `rating_count`/`rating_sum` columns exist in schema but no endpoints to submit ratings. Old bot had a rating flow.

### Known Issues

- **Categories duplication** — ~~Hardcoded in both `apps/api` and `apps/bot`~~ Fixed: now shared via `@botlistbot/shared` package.
- **Ratings unused** — `rating_count`/`rating_sum`/`avg_rating` exist but are never written to. Need rating submission endpoints and bot-side UI.

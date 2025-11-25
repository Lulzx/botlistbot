# botlist

A Telegram bot directory powered by Cloudflare Workers.

## Project Structure

```
apps/
  api/    # Hono API with D1 database
  bot/    # Grammy Telegram bot
```

## Prerequisites

- [Bun](https://bun.sh) or Node.js
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Set up the API (D1 Database)

```bash
# Create D1 database
wrangler d1 create botlist-db

# Copy the database_id from output and update apps/api/wrangler.jsonc
# Uncomment the d1_databases section and add your database_id
```

### 3. Set up the Bot

```bash
# Set your Telegram bot token as a secret
wrangler secret put BOT_TOKEN --cwd apps/bot
```

## Development

```bash
# Run both api and bot in dev mode
bun run dev

# Run only api
bun run dev:api

# Run only bot
bun run dev:bot
```

## Deployment

```bash
# Deploy both apps
bun run deploy

# Deploy only api
bun run deploy:api

# Deploy only bot
bun run deploy:bot
```

### After deploying the bot

Set up the Telegram webhook:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://botlist-bot.<YOUR_SUBDOMAIN>.workers.dev/<BOT_TOKEN>"
```

Or use the webhook script:

```bash
cd apps/bot && bun run webhook
```

## Worker URLs

After deployment, your workers will be available at:

- **API**: `https://botlist-api.<your-subdomain>.workers.dev`
- **Bot**: `https://botlist-bot.<your-subdomain>.workers.dev`

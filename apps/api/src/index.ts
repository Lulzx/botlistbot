import { Hono } from "hono";
import { CATEGORIES } from "@botlistbot/shared";
import type { HonoContext, Bot, User, Subscription, BotSubmission, Keyword, Suggestion, Statistic, Country } from "./types";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    banned INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    submitted_by INTEGER REFERENCES users(id),
    approved INTEGER DEFAULT 1,
    offline INTEGER DEFAULT 0,
    spam INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    country_id INTEGER REFERENCES countries(id),
    inlinequeries INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bot_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER NOT NULL DEFAULT 1,
    submitted_by INTEGER NOT NULL REFERENCES users(id),
    inlinequeries INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bot_id INTEGER NOT NULL REFERENCES bots(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, bot_id)
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS spam_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER NOT NULL REFERENCES bots(id),
    reported_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, reported_by)
  )`,
  `CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bot_id INTEGER NOT NULL REFERENCES bots(id),
    action TEXT NOT NULL CHECK(action IN ('name','description','category','offline','spam','inlinequeries','add_keyword','remove_keyword')),
    value TEXT,
    executed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity TEXT,
    level INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bot_id INTEGER NOT NULL REFERENCES bots(id),
    value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, bot_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_bot ON ratings(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bots_category ON bots(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bots_username ON bots(username)`,
  `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_chat ON subscriptions(chat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_spam_reports_bot ON spam_reports(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_keywords_bot ON keywords(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_keywords_name ON keywords(name)`,
  `CREATE INDEX IF NOT EXISTS idx_suggestions_bot ON suggestions(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_suggestions_pending ON suggestions(executed) WHERE executed = 0`,
  `CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_statistics_action ON statistics(action)`,
  // Admin users are seeded dynamically from ADMIN_IDS env var in ensureDatabase
  `INSERT OR IGNORE INTO bots (name, username, description, category_id) VALUES
    ('Bot Store Bot', 'storebot', 'The bot that started this store', 1),
    ('File Converter Bot', 'fileconverterbot', 'Convert files between different formats', 19),
    ('Music Bot', 'musicbot', 'Play and discover music', 13),
    ('Weather Bot', 'weatherbot', 'Get weather forecasts', 15),
    ('Gaming Bot', 'gamingbot', 'Play games and compete with friends', 6),
    ('Humor Bot', 'humorbot', 'Get jokes and funny content', 5),
    ('News Bot', 'newsbot', 'Latest news and updates', 16),
    ('Photo Editor Bot', 'photoeditorbot', 'Edit and enhance your photos', 12),
    ('Translation Bot', 'translatebot', 'Translate text between languages', 21),
    ('Reminder Bot', 'reminderbot', 'Set reminders and organize tasks', 27)`,
  `INSERT OR IGNORE INTO countries (name, emoji) VALUES
    ('English', '🇬🇧'),
    ('Spanish', '🇪🇸'),
    ('French', '🇫🇷'),
    ('German', '🇩🇪'),
    ('Italian', '🇮🇹'),
    ('Portuguese', '🇧🇷'),
    ('Russian', '🇷🇺'),
    ('Chinese', '🇨🇳'),
    ('Japanese', '🇯🇵'),
    ('Korean', '🇰🇷'),
    ('Arabic', '🇸🇦'),
    ('Hindi', '🇮🇳'),
    ('Turkish', '🇹🇷'),
    ('Dutch', '🇳🇱'),
    ('Polish', '🇵🇱'),
    ('Persian', '🇮🇷'),
    ('Indonesian', '🇮🇩'),
    ('Ukrainian', '🇺🇦'),
    ('Thai', '🇹🇭'),
    ('Vietnamese', '🇻🇳')`
];

// Migration statements for existing databases that need new tables/columns
const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bot_id INTEGER NOT NULL REFERENCES bots(id),
    action TEXT NOT NULL CHECK(action IN ('name','description','category','offline','spam','inlinequeries','add_keyword','remove_keyword')),
    value TEXT,
    executed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity TEXT,
    level INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_keywords_bot ON keywords(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_keywords_name ON keywords(name)`,
  `CREATE INDEX IF NOT EXISTS idx_suggestions_bot ON suggestions(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_suggestions_pending ON suggestions(executed) WHERE executed = 0`,
  `CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_statistics_action ON statistics(action)`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bot_id INTEGER NOT NULL REFERENCES bots(id),
    value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, bot_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_bot ON ratings(bot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id)`,
  `INSERT OR IGNORE INTO countries (name, emoji) VALUES
    ('English', '🇬🇧'),
    ('Spanish', '🇪🇸'),
    ('French', '🇫🇷'),
    ('German', '🇩🇪'),
    ('Italian', '🇮🇹'),
    ('Portuguese', '🇧🇷'),
    ('Russian', '🇷🇺'),
    ('Chinese', '🇨🇳'),
    ('Japanese', '🇯🇵'),
    ('Korean', '🇰🇷'),
    ('Arabic', '🇸🇦'),
    ('Hindi', '🇮🇳'),
    ('Turkish', '🇹🇷'),
    ('Dutch', '🇳🇱'),
    ('Polish', '🇵🇱'),
    ('Persian', '🇮🇷'),
    ('Indonesian', '🇮🇩'),
    ('Ukrainian', '🇺🇦'),
    ('Thai', '🇹🇭'),
    ('Vietnamese', '🇻🇳')`
];

let dbInitPromise: Promise<void> | null = null;

const ensureDatabase = (env: { DB: D1Database; ADMIN_IDS?: string }) => {
  if (dbInitPromise) return dbInitPromise;

  const db = env.DB;

  dbInitPromise = (async () => {
    const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (existing) {
      // Run migrations for new tables on existing databases
      for (const statement of MIGRATION_STATEMENTS) {
        try {
          const trimmed = statement.trim().replace(/;$/, "");
          await db.prepare(`${trimmed};`).run();
        } catch (err) {
          // Ignore errors for already-existing objects
          console.debug('Migration statement (may already exist):', err);
        }
      }
      // Add new columns to bots table if missing
      try {
        await db.prepare("SELECT country_id FROM bots LIMIT 1").first();
      } catch {
        try { await db.prepare("ALTER TABLE bots ADD COLUMN country_id INTEGER REFERENCES countries(id)").run(); } catch { /* already exists */ }
        try { await db.prepare("ALTER TABLE bots ADD COLUMN inlinequeries INTEGER DEFAULT 0").run(); } catch { /* already exists */ }
      }
      // Add rating columns to bots table if missing
      try {
        await db.prepare("SELECT rating_count FROM bots LIMIT 1").first();
      } catch {
        try { await db.prepare("ALTER TABLE bots ADD COLUMN rating_count INTEGER DEFAULT 0").run(); } catch { /* already exists */ }
        try { await db.prepare("ALTER TABLE bots ADD COLUMN rating_sum INTEGER DEFAULT 0").run(); } catch { /* already exists */ }
      }
      // Add inlinequeries column to bot_submissions if missing
      try {
        await db.prepare("SELECT inlinequeries FROM bot_submissions LIMIT 1").first();
      } catch {
        try { await db.prepare("ALTER TABLE bot_submissions ADD COLUMN inlinequeries INTEGER DEFAULT 0").run(); } catch { /* already exists */ }
      }
    } else {
      // Initialize schema sequentially; use prepare/run to avoid parser quirks in exec.
      for (const statement of SCHEMA_STATEMENTS) {
        try {
          const trimmed = statement.trim().replace(/;$/, "");
          await db.prepare(`${trimmed};`).run();
        } catch (err) {
          console.error('Schema exec failed for statement:', statement);
          throw err;
        }
      }
    }

    // Seed admin users from ADMIN_IDS env var
    if (env.ADMIN_IDS) {
      const adminIds = env.ADMIN_IDS.split(',').map(id => Number.parseInt(id.trim(), 10)).filter(id => !Number.isNaN(id));
      for (const adminId of adminIds) {
        try {
          await db.prepare(
            "INSERT OR IGNORE INTO users (telegram_id, username, banned, is_admin, created_at) VALUES (?, NULL, 0, 1, datetime('now'))"
          ).bind(adminId).run();
          // Ensure existing users are marked as admin
          await db.prepare(
            "UPDATE users SET is_admin = 1 WHERE telegram_id = ?"
          ).bind(adminId).run();
        } catch { /* ignore */ }
      }
    }
  })().catch((err) => {
    dbInitPromise = null;
    throw err;
  });

  return dbInitPromise;
};

const app = new Hono<HonoContext>();

app.use("*", async (c, next) => {
  await ensureDatabase(c.env);
  await next();
});

// Helper to get or create user
async function getOrCreateUser(db: D1Database, telegramId: number, username?: string, firstName?: string): Promise<User> {
  let user = await db.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(telegramId).first<User>();

  if (!user) {
    await db.prepare(
      "INSERT INTO users (telegram_id, username, first_name, banned, is_admin, created_at) VALUES (?, ?, ?, 0, 0, datetime('now'))"
    ).bind(telegramId, username || null, firstName || null).run();
    user = await db.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(telegramId).first<User>();
  }

  return user!;
}

const sanitizeUsername = (username: string) => username.replace(/^@+/, '').trim();

async function getAdminUser(db: D1Database, adminTelegramId: number): Promise<User | null> {
  if (!adminTelegramId) return null;

  const admin = await db.prepare(
    "SELECT * FROM users WHERE telegram_id = ?"
  ).bind(adminTelegramId).first<User>();

  if (!admin || !admin.is_admin) {
    return null;
  }

  return admin;
}

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

app.get("/", (c) => {
  return c.text("GET /search?username=file&name=convert&description=audio");
});

app.get("/docs", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BotListBot API Documentation</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; background: #f8f9fa; padding: 2rem; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1.3rem; margin: 2rem 0 1rem; padding-bottom: 0.3rem; border-bottom: 2px solid #e0e0e0; }
  p.subtitle { color: #666; margin-bottom: 2rem; }
  .endpoint { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 0.75rem; padding: 0.75rem 1rem; display: flex; align-items: baseline; gap: 0.75rem; }
  .method { font-weight: 700; font-size: 0.8rem; padding: 0.15rem 0.5rem; border-radius: 4px; min-width: 52px; text-align: center; display: inline-block; }
  .get { background: #e7f5e7; color: #1b7a1b; }
  .post { background: #e7ecf5; color: #1b4a7a; }
  .put { background: #f5f0e7; color: #7a5a1b; }
  .delete { background: #f5e7e7; color: #7a1b1b; }
  .path { font-family: "SF Mono", "Fira Code", monospace; font-size: 0.9rem; }
  .desc { color: #666; font-size: 0.85rem; margin-left: auto; }
</style>
</head>
<body>
<h1>BotListBot API</h1>
<p class="subtitle">REST API for the BotList Telegram bot directory</p>

<h2>Public</h2>
<div class="endpoint"><span class="method get">GET</span><span class="path">/categories</span><span class="desc">List all bot categories</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/search?name=&amp;username=&amp;description=</span><span class="desc">Search bots (also searches keywords)</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/keywords/search?q=</span><span class="desc">Search bots by keyword</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/random?limit=</span><span class="desc">Random bots for exploration</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/new?limit=</span><span class="desc">Recently added bots</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/best?limit=</span><span class="desc">Top-rated bots</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/category/:id</span><span class="desc">Bots in a category</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/username/:username</span><span class="desc">Get bot by username</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/:id/keywords</span><span class="desc">Keywords for a bot</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/countries</span><span class="desc">Supported languages/regions</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/gimme</span><span class="desc">Get all bots</span></div>

<h2>Users</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/users</span><span class="desc">Create or get user { telegram_id, username?, first_name? }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/users/:telegramId</span><span class="desc">Get user by Telegram ID</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/users/:telegramId/banned</span><span class="desc">Check if user is banned</span></div>

<h2>Favorites</h2>
<div class="endpoint"><span class="method get">GET</span><span class="path">/users/:telegramId/favorites</span><span class="desc">Get user's favorite bots</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/users/:telegramId/favorites</span><span class="desc">Add favorite { bot_username }</span></div>
<div class="endpoint"><span class="method delete">DELETE</span><span class="path">/users/:telegramId/favorites/:botUsername</span><span class="desc">Remove from favorites</span></div>

<h2>Subscriptions</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/subscriptions</span><span class="desc">Subscribe { chat_id, telegram_id }</span></div>
<div class="endpoint"><span class="method delete">DELETE</span><span class="path">/subscriptions/:chatId</span><span class="desc">Unsubscribe</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/subscriptions/:chatId</span><span class="desc">Check subscription status</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/subscriptions</span><span class="desc">All active subscribers</span></div>

<h2>Submissions</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/submissions</span><span class="desc">Submit new bot { username, name, description, category_id, telegram_id, inlinequeries? }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/users/:telegramId/submissions</span><span class="desc">User's submissions (approved + pending)</span></div>

<h2>Reports</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/spam-reports</span><span class="desc">Report spam { bot_username, telegram_id, reason? }</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/offline-reports</span><span class="desc">Report offline { bot_username, telegram_id }</span></div>

<h2>Suggestions</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/suggestions</span><span class="desc">Create suggestion { telegram_id, bot_username, action, value? }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/:id/suggestions</span><span class="desc">Pending suggestions for a bot</span></div>

<h2>Statistics</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/statistics</span><span class="desc">Log activity { telegram_id?, action, entity?, level? }</span></div>

<h2>Keywords (Admin)</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/bots/:id/keywords</span><span class="desc">Add keyword { name, admin_telegram_id }</span></div>
<div class="endpoint"><span class="method delete">DELETE</span><span class="path">/bots/:id/keywords/:name?admin_id=</span><span class="desc">Remove keyword</span></div>

<h2>Ratings</h2>
<div class="endpoint"><span class="method post">POST</span><span class="path">/bots/username/:username/rate</span><span class="desc">Rate a bot { telegram_id, value (1-5) }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/username/:username/rating</span><span class="desc">Get bot's average rating and count</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/bots/username/:username/rate/:telegramId</span><span class="desc">Get user's rating for a bot</span></div>

<h2>Admin</h2>
<div class="endpoint"><span class="method get">GET</span><span class="path">/admin/submissions/pending?admin_id=</span><span class="desc">Pending submissions</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/submissions/:id/approve</span><span class="desc">Approve { admin_telegram_id, name?, description?, category_id? }</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/submissions/:id/reject</span><span class="desc">Reject { admin_telegram_id }</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/bots</span><span class="desc">Add bot { username, name, description, category_id, admin_telegram_id }</span></div>
<div class="endpoint"><span class="method put">PUT</span><span class="path">/admin/bots/username/:username</span><span class="desc">Update bot { admin_telegram_id, name?, description?, category_id?, country_id?, inlinequeries? }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/admin/suggestions/pending?admin_id=</span><span class="desc">Pending suggestions</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/suggestions/:id/accept</span><span class="desc">Accept suggestion { admin_telegram_id }</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/suggestions/:id/reject</span><span class="desc">Reject suggestion { admin_telegram_id }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/admin/statistics?admin_id=&amp;limit=&amp;level=</span><span class="desc">Activity logs</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/admin/statistics/summary?admin_id=</span><span class="desc">Stats summary</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/ban</span><span class="desc">Ban user { user_id, admin_telegram_id }</span></div>
<div class="endpoint"><span class="method post">POST</span><span class="path">/admin/unban</span><span class="desc">Unban user { user_id, admin_telegram_id }</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/admin/userinfo/:userId?admin_id=</span><span class="desc">User profile &amp; activity</span></div>
<div class="endpoint"><span class="method get">GET</span><span class="path">/admin/check/:telegramId</span><span class="desc">Check if user is admin</span></div>
</body>
</html>`;
  return c.html(html);
});

app.get("/categories", (c) => {
  return c.json(CATEGORIES);
});

app.get("/gimme", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM bots").all<Bot>()

  return c.json(results);
});

app.get("/bots/category/:id", async (c) => {
  const categoryId = parseInt(c.req.param('id'), 10);

  if (isNaN(categoryId)) {
    return c.json({ error: 'Invalid category ID provided.' }, 400);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM bots WHERE category_id = ?"
  ).bind(categoryId).all<Bot>();

  return c.json(results);
});

app.get("/search", async (c) => {
  const rawName = c.req.query("name");
  const rawUsername = c.req.query("username");
  const rawDescription = c.req.query("description");

  const name = rawName?.trim();
  const username = rawUsername ? rawUsername.replace(/^@+/, "").trim() : undefined;
  const description = rawDescription?.trim();

  // Validate input lengths
  if ((name && name.length < 3) || (username && username.length < 3) || (description && description.length < 3)) {
    return c.json({ error: "minimum query length allowed is 3." }, 400);
  }

  if (username?.toLowerCase() === "bot") {
    return c.json({ error: "hmm... bot? be specific please!" }, 400);
  }

  if (!name && !username && !description) {
    return c.json([]);
  }

  // Build dynamic query with keyword search included
  const conditions = [];
  const params = [];

  if (name) {
    conditions.push("LOWER(b.name) LIKE LOWER(?)");
    params.push(`%${name}%`);
  }

  if (username) {
    conditions.push("LOWER(b.username) LIKE LOWER(?)");
    params.push(`%${username}%`);
  }

  if (description) {
    conditions.push("LOWER(b.description) LIKE LOWER(?)");
    params.push(`%${description}%`);
  }

  // Also search keywords for any of the query terms
  const anyTerm = name || username || description;
  if (anyTerm) {
    conditions.push("EXISTS (SELECT 1 FROM keywords k WHERE k.bot_id = b.id AND LOWER(k.name) LIKE LOWER(?))");
    params.push(`%${anyTerm}%`);
  }

  const query = `SELECT DISTINCT b.* FROM bots b WHERE ${conditions.map((condition) => `(${condition})`).join(' OR ')}`;

  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all<Bot>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get random bots for /explore
app.get("/bots/random", async (c) => {
  const limit = parseInt(c.req.query('limit') || '5', 10);
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM bots ORDER BY RANDOM() LIMIT ?"
    ).bind(safeLimit).all<Bot>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get newly added bots for /newbots
app.get("/bots/new", async (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM bots ORDER BY created_at DESC LIMIT ?"
    ).bind(safeLimit).all<Bot>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get best rated bots for /bestbots
app.get("/bots/best", async (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT *, CASE WHEN rating_count > 0 THEN rating_sum * 1.0 / rating_count ELSE 0 END as avg_rating FROM bots WHERE rating_count > 0 ORDER BY avg_rating DESC, rating_count DESC LIMIT ?"
    ).bind(safeLimit).all<Bot>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get a single bot by username
app.get("/bots/username/:username", async (c) => {
  const username = c.req.param('username').replace('@', '');

  try {
    const bot = await c.env.DB.prepare(
      "SELECT * FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first<Bot>();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }
    return c.json(bot);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== KEYWORDS ENDPOINTS ====================

// Get keywords for a bot
app.get("/bots/:id/keywords", async (c) => {
  const botId = parseInt(c.req.param('id'), 10);

  if (isNaN(botId)) {
    return c.json({ error: 'Invalid bot ID' }, 400);
  }

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM keywords WHERE bot_id = ? ORDER BY name"
    ).bind(botId).all<Keyword>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add keyword to a bot (admin only)
app.post("/bots/:id/keywords", async (c) => {
  const botId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json<{ name: string; admin_telegram_id: number }>();

  if (!body.name || !body.admin_telegram_id) {
    return c.json({ error: 'name and admin_telegram_id are required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const bot = await c.env.DB.prepare("SELECT id FROM bots WHERE id = ?").bind(botId).first();
    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    const keyword = body.name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    if (!keyword || keyword.length < 2) {
      return c.json({ error: 'Invalid keyword (min 2 chars, alphanumeric)' }, 400);
    }

    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO keywords (name, bot_id, created_at) VALUES (?, ?, datetime('now'))"
    ).bind(keyword, botId).run();

    return c.json({ success: true, message: 'Keyword added' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Remove keyword from a bot (admin only)
app.delete("/bots/:id/keywords/:name", async (c) => {
  const botId = parseInt(c.req.param('id'), 10);
  const name = c.req.param('name');
  const adminId = parseInt(c.req.query('admin_id') || '0', 10);

  try {
    const admin = await getAdminUser(c.env.DB, adminId);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await c.env.DB.prepare(
      "DELETE FROM keywords WHERE bot_id = ? AND name = ?"
    ).bind(botId, name).run();

    return c.json({ success: true, message: 'Keyword removed' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Search bots by keyword
app.get("/keywords/search", async (c) => {
  const q = c.req.query('q')?.trim();

  if (!q || q.length < 2) {
    return c.json({ error: 'Query too short (min 2 chars)' }, 400);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT DISTINCT b.* FROM bots b
      INNER JOIN keywords k ON b.id = k.bot_id
      WHERE LOWER(k.name) LIKE LOWER(?)
    `).bind(`%${q}%`).all<Bot>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== USER ENDPOINTS ====================

// Get or create user
app.post("/users", async (c) => {
  const body = await c.req.json<{ telegram_id: number; username?: string; first_name?: string }>();

  if (!body.telegram_id) {
    return c.json({ error: 'telegram_id is required' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id, body.username, body.first_name);
    return c.json(user);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user by telegram ID
app.get("/users/:telegramId", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);

  try {
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE telegram_id = ?"
    ).bind(telegramId).first<User>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(user);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if user is banned
app.get("/users/:telegramId/banned", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);

  try {
    const user = await c.env.DB.prepare(
      "SELECT banned FROM users WHERE telegram_id = ?"
    ).bind(telegramId).first<{ banned: number }>();

    return c.json({ banned: user?.banned === 1 });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== FAVORITES ENDPOINTS ====================

// Get user's favorites
app.get("/users/:telegramId/favorites", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT b.* FROM bots b
      INNER JOIN favorites f ON b.id = f.bot_id
      INNER JOIN users u ON f.user_id = u.id
      WHERE u.telegram_id = ?
      ORDER BY f.created_at DESC
    `).bind(telegramId).all<Bot>();

    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add bot to favorites
app.post("/users/:telegramId/favorites", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);
  const body = await c.req.json<{ bot_username: string }>();

  if (!body.bot_username) {
    return c.json({ error: 'bot_username is required' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, telegramId);
    const bot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(body.bot_username.replace('@', '')).first<{ id: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found in the database' }, 404);
    }

    // Check if already favorited
    const existing = await c.env.DB.prepare(
      "SELECT id FROM favorites WHERE user_id = ? AND bot_id = ?"
    ).bind(user.id, bot.id).first();

    if (existing) {
      return c.json({ error: 'Bot already in favorites' }, 400);
    }

    await c.env.DB.prepare(
      "INSERT INTO favorites (user_id, bot_id, created_at) VALUES (?, ?, datetime('now'))"
    ).bind(user.id, bot.id).run();

    return c.json({ success: true, message: 'Bot added to favorites' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Remove bot from favorites
app.delete("/users/:telegramId/favorites/:botUsername", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);
  const botUsername = c.req.param('botUsername').replace('@', '');

  try {
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE telegram_id = ?"
    ).bind(telegramId).first<{ id: number }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const bot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(botUsername).first<{ id: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    await c.env.DB.prepare(
      "DELETE FROM favorites WHERE user_id = ? AND bot_id = ?"
    ).bind(user.id, bot.id).run();

    return c.json({ success: true, message: 'Bot removed from favorites' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== SUBSCRIPTION ENDPOINTS ====================

// Subscribe to updates
app.post("/subscriptions", async (c) => {
  const body = await c.req.json<{ chat_id: number; telegram_id: number }>();

  if (!body.chat_id || !body.telegram_id) {
    return c.json({ error: 'chat_id and telegram_id are required' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id);

    // Check existing subscription
    const existing = await c.env.DB.prepare(
      "SELECT id, active FROM subscriptions WHERE chat_id = ?"
    ).bind(body.chat_id).first<{ id: number; active: number }>();

    if (existing) {
      if (existing.active === 1) {
        return c.json({ error: 'Already subscribed' }, 400);
      }
      // Reactivate subscription
      await c.env.DB.prepare(
        "UPDATE subscriptions SET active = 1 WHERE id = ?"
      ).bind(existing.id).run();
    } else {
      await c.env.DB.prepare(
        "INSERT INTO subscriptions (chat_id, user_id, active, created_at) VALUES (?, ?, 1, datetime('now'))"
      ).bind(body.chat_id, user.id).run();
    }

    return c.json({ success: true, message: 'Subscribed to updates' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unsubscribe from updates
app.delete("/subscriptions/:chatId", async (c) => {
  const chatId = parseInt(c.req.param('chatId'), 10);

  try {
    const result = await c.env.DB.prepare(
      "UPDATE subscriptions SET active = 0 WHERE chat_id = ?"
    ).bind(chatId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'No active subscription found' }, 404);
    }

    return c.json({ success: true, message: 'Unsubscribed from updates' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check subscription status
app.get("/subscriptions/:chatId", async (c) => {
  const chatId = parseInt(c.req.param('chatId'), 10);

  try {
    const sub = await c.env.DB.prepare(
      "SELECT * FROM subscriptions WHERE chat_id = ? AND active = 1"
    ).bind(chatId).first<Subscription>();

    return c.json({ subscribed: !!sub });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all active subscribers (for notifications)
app.get("/subscriptions", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT chat_id FROM subscriptions WHERE active = 1"
    ).all<{ chat_id: number }>();

    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== BOT SUBMISSION ENDPOINTS ====================

// Submit a new bot
app.post("/submissions", async (c) => {
  const body = await c.req.json<{
    username: string;
    name: string;
    description: string;
    category_id: number;
    telegram_id: number;
    inlinequeries?: number;
  }>();

  if (!body.username || !body.telegram_id) {
    return c.json({ error: 'username and telegram_id are required' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id);

    if (user.banned) {
      return c.json({ error: 'You are banned from submitting bots' }, 403);
    }

    // Check if bot already exists
    const existingBot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(body.username.replace('@', '')).first();

    if (existingBot) {
      return c.json({ error: 'This bot is already in the BotList' }, 400);
    }

    // Check if already submitted and pending
    const existingSubmission = await c.env.DB.prepare(
      "SELECT id FROM bot_submissions WHERE LOWER(username) = LOWER(?) AND status = 'pending'"
    ).bind(body.username.replace('@', '')).first();

    if (existingSubmission) {
      return c.json({ error: 'This bot has already been submitted and is pending review' }, 400);
    }

    await c.env.DB.prepare(`
      INSERT INTO bot_submissions (username, name, description, category_id, submitted_by, inlinequeries, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      body.username.replace('@', ''),
      body.name || body.username,
      body.description || '',
      body.category_id || 1,
      user.id,
      body.inlinequeries ? 1 : 0
    ).run();

    return c.json({ success: true, message: 'Bot submitted for review' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user's submissions for /mybots
app.get("/users/:telegramId/submissions", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);

  try {
    // Get bots submitted by user (both approved and in submissions)
    const { results: approvedBots } = await c.env.DB.prepare(`
      SELECT b.*, 'approved' as status FROM bots b
      INNER JOIN users u ON b.submitted_by = u.id
      WHERE u.telegram_id = ?
    `).bind(telegramId).all<Bot & { status: string }>();

    const { results: pendingBots } = await c.env.DB.prepare(`
      SELECT s.*, 'pending' as bot_status FROM bot_submissions s
      INNER JOIN users u ON s.submitted_by = u.id
      WHERE u.telegram_id = ? AND s.status = 'pending'
    `).bind(telegramId).all<BotSubmission & { bot_status: string }>();

    return c.json({
      approved: approvedBots,
      pending: pendingBots
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== SPAM REPORT ENDPOINTS ====================

// Report a bot as spam
app.post("/spam-reports", async (c) => {
  const body = await c.req.json<{
    bot_username: string;
    telegram_id: number;
    reason?: string;
  }>();

  if (!body.bot_username || !body.telegram_id) {
    return c.json({ error: 'bot_username and telegram_id are required' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id);

    if (user.banned) {
      return c.json({ error: 'You are banned from reporting' }, 403);
    }

    const bot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(body.bot_username.replace('@', '')).first<{ id: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found in the database' }, 404);
    }

    // Check if already reported by this user
    const existing = await c.env.DB.prepare(
      "SELECT id FROM spam_reports WHERE bot_id = ? AND reported_by = ?"
    ).bind(bot.id, user.id).first();

    if (existing) {
      return c.json({ error: 'You have already reported this bot' }, 400);
    }

    await c.env.DB.prepare(
      "INSERT INTO spam_reports (bot_id, reported_by, reason, created_at) VALUES (?, ?, ?, datetime('now'))"
    ).bind(bot.id, user.id, body.reason || null).run();

    return c.json({ success: true, message: 'Spam report submitted' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== OFFLINE REPORT ENDPOINTS ====================

// Report a bot as offline
app.post("/offline-reports", async (c) => {
  const body = await c.req.json<{
    bot_username: string;
    telegram_id: number;
  }>();

  if (!body.bot_username || !body.telegram_id) {
    return c.json({ error: 'bot_username and telegram_id are required' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id);

    if (user.banned) {
      return c.json({ error: 'You are banned from reporting' }, 403);
    }

    const bot = await c.env.DB.prepare(
      "SELECT id, offline FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(body.bot_username.replace('@', '')).first<{ id: number; offline: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found in the database' }, 404);
    }

    if (bot.offline === 1) {
      return c.json({ error: 'This bot has already been reported as offline' }, 400);
    }

    // Mark bot as offline
    await c.env.DB.prepare(
      "UPDATE bots SET offline = 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(bot.id).run();

    return c.json({ success: true, message: 'Bot reported as offline' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== SUGGESTIONS ENDPOINTS ====================

// Create suggestion
app.post("/suggestions", async (c) => {
  const body = await c.req.json<{
    telegram_id: number;
    bot_username: string;
    action: string;
    value?: string;
  }>();

  if (!body.telegram_id || !body.bot_username || !body.action) {
    return c.json({ error: 'telegram_id, bot_username, and action are required' }, 400);
  }

  const validActions = ['name', 'description', 'category', 'offline', 'spam', 'inlinequeries', 'add_keyword', 'remove_keyword'];
  if (!validActions.includes(body.action)) {
    return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id);
    if (user.banned) {
      return c.json({ error: 'You are banned' }, 403);
    }

    const bot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(body.bot_username.replace('@', '')).first<{ id: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    await c.env.DB.prepare(
      "INSERT INTO suggestions (user_id, bot_id, action, value, executed, created_at) VALUES (?, ?, ?, ?, 0, datetime('now'))"
    ).bind(user.id, bot.id, body.action, body.value || null).run();

    return c.json({ success: true, message: 'Suggestion submitted' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get pending suggestions (admin)
app.get("/admin/suggestions/pending", async (c) => {
  const adminId = parseInt(c.req.query('admin_id') || '0', 10);
  const limitRaw = parseInt(c.req.query('limit') || '10', 10);
  const limit = clampNumber(Number.isNaN(limitRaw) ? 10 : limitRaw, 1, 25);

  try {
    const admin = await getAdminUser(c.env.DB, adminId);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT s.*, b.username as bot_username, b.name as bot_name, u.telegram_id as user_telegram_id, u.username
      FROM suggestions s
      LEFT JOIN bots b ON s.bot_id = b.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.executed = 0
      ORDER BY s.created_at ASC
      LIMIT ?
    `).bind(limit).all<Suggestion>();

    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Accept suggestion (admin)
app.post("/admin/suggestions/:id/accept", async (c) => {
  const suggestionId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json<{ admin_telegram_id: number }>();

  if (!body.admin_telegram_id) {
    return c.json({ error: 'admin_telegram_id is required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const suggestion = await c.env.DB.prepare(
      "SELECT * FROM suggestions WHERE id = ?"
    ).bind(suggestionId).first<Suggestion>();

    if (!suggestion) {
      return c.json({ error: 'Suggestion not found' }, 404);
    }

    if (suggestion.executed !== 0) {
      return c.json({ error: 'Suggestion already processed' }, 400);
    }

    // Apply the suggestion based on action type
    switch (suggestion.action) {
      case 'name':
        if (suggestion.value) {
          await c.env.DB.prepare("UPDATE bots SET name = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(suggestion.value, suggestion.bot_id).run();
        }
        break;
      case 'description':
        if (suggestion.value) {
          await c.env.DB.prepare("UPDATE bots SET description = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(suggestion.value, suggestion.bot_id).run();
        }
        break;
      case 'category':
        if (suggestion.value) {
          const catId = parseInt(suggestion.value, 10);
          if (!isNaN(catId) && CATEGORIES.some(cat => cat.id === catId)) {
            await c.env.DB.prepare("UPDATE bots SET category_id = ?, updated_at = datetime('now') WHERE id = ?")
              .bind(catId, suggestion.bot_id).run();
          }
        }
        break;
      case 'offline':
        await c.env.DB.prepare("UPDATE bots SET offline = 1, updated_at = datetime('now') WHERE id = ?")
          .bind(suggestion.bot_id).run();
        break;
      case 'spam':
        await c.env.DB.prepare("UPDATE bots SET spam = 1, updated_at = datetime('now') WHERE id = ?")
          .bind(suggestion.bot_id).run();
        break;
      case 'inlinequeries':
        await c.env.DB.prepare("UPDATE bots SET inlinequeries = 1, updated_at = datetime('now') WHERE id = ?")
          .bind(suggestion.bot_id).run();
        break;
      case 'add_keyword':
        if (suggestion.value) {
          await c.env.DB.prepare("INSERT OR IGNORE INTO keywords (name, bot_id, created_at) VALUES (?, ?, datetime('now'))")
            .bind(suggestion.value.toLowerCase(), suggestion.bot_id).run();
        }
        break;
      case 'remove_keyword':
        if (suggestion.value) {
          await c.env.DB.prepare("DELETE FROM keywords WHERE name = ? AND bot_id = ?")
            .bind(suggestion.value.toLowerCase(), suggestion.bot_id).run();
        }
        break;
    }

    await c.env.DB.prepare("UPDATE suggestions SET executed = 1 WHERE id = ?")
      .bind(suggestionId).run();

    return c.json({ success: true, message: 'Suggestion accepted and applied' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reject suggestion (admin)
app.post("/admin/suggestions/:id/reject", async (c) => {
  const suggestionId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json<{ admin_telegram_id: number }>();

  if (!body.admin_telegram_id) {
    return c.json({ error: 'admin_telegram_id is required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const suggestion = await c.env.DB.prepare(
      "SELECT executed FROM suggestions WHERE id = ?"
    ).bind(suggestionId).first<{ executed: number }>();

    if (!suggestion) {
      return c.json({ error: 'Suggestion not found' }, 404);
    }

    if (suggestion.executed !== 0) {
      return c.json({ error: 'Suggestion already processed' }, 400);
    }

    // Mark as executed (rejected) with value -1 to distinguish from accepted
    await c.env.DB.prepare("UPDATE suggestions SET executed = -1 WHERE id = ?")
      .bind(suggestionId).run();

    return c.json({ success: true, message: 'Suggestion rejected' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get pending suggestions for a bot
app.get("/bots/:id/suggestions", async (c) => {
  const botId = parseInt(c.req.param('id'), 10);

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT s.*, u.telegram_id as user_telegram_id, u.username
      FROM suggestions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.bot_id = ? AND s.executed = 0
      ORDER BY s.created_at ASC
    `).bind(botId).all<Suggestion>();

    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== STATISTICS ENDPOINTS ====================

// Log an activity
app.post("/statistics", async (c) => {
  const body = await c.req.json<{
    telegram_id?: number;
    action: string;
    entity?: string;
    level?: number;
  }>();

  if (!body.action) {
    return c.json({ error: 'action is required' }, 400);
  }

  try {
    let userId: number | null = null;
    if (body.telegram_id) {
      const user = await c.env.DB.prepare(
        "SELECT id FROM users WHERE telegram_id = ?"
      ).bind(body.telegram_id).first<{ id: number }>();
      userId = user?.id ?? null;
    }

    await c.env.DB.prepare(
      "INSERT INTO statistics (user_id, action, entity, level, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).bind(userId, body.action, body.entity || null, body.level ?? 20).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get recent activity (admin)
app.get("/admin/statistics", async (c) => {
  const adminId = parseInt(c.req.query('admin_id') || '0', 10);
  const limitRaw = parseInt(c.req.query('limit') || '20', 10);
  const limit = clampNumber(Number.isNaN(limitRaw) ? 20 : limitRaw, 1, 100);
  const minLevel = parseInt(c.req.query('level') || '0', 10);

  try {
    const admin = await getAdminUser(c.env.DB, adminId);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT s.*, u.telegram_id as user_telegram_id, u.username
      FROM statistics s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.level >= ?
      ORDER BY s.created_at DESC
      LIMIT ?
    `).bind(minLevel, limit).all<Statistic & { user_telegram_id?: number; username?: string }>();

    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get statistics summary (admin)
app.get("/admin/statistics/summary", async (c) => {
  const adminId = parseInt(c.req.query('admin_id') || '0', 10);

  try {
    const admin = await getAdminUser(c.env.DB, adminId);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT action, COUNT(*) as count
      FROM statistics
      GROUP BY action
      ORDER BY count DESC
    `).all<{ action: string; count: number }>();

    const totalBots = await c.env.DB.prepare("SELECT COUNT(*) as count FROM bots").first<{ count: number }>();
    const totalUsers = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
    const totalFavorites = await c.env.DB.prepare("SELECT COUNT(*) as count FROM favorites").first<{ count: number }>();
    const pendingSuggestions = await c.env.DB.prepare("SELECT COUNT(*) as count FROM suggestions WHERE executed = 0").first<{ count: number }>();

    return c.json({
      actions: results,
      totals: {
        bots: totalBots?.count ?? 0,
        users: totalUsers?.count ?? 0,
        favorites: totalFavorites?.count ?? 0,
        pending_suggestions: pendingSuggestions?.count ?? 0,
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== COUNTRIES ENDPOINTS ====================

app.get("/countries", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM countries ORDER BY name"
    ).all<Country>();
    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== RATINGS ENDPOINTS ====================

// Rate a bot (1-5 stars)
app.post("/bots/username/:username/rate", async (c) => {
  const username = c.req.param('username').replace('@', '');
  const body = await c.req.json<{ telegram_id: number; value: number }>();

  if (!body.telegram_id || !body.value) {
    return c.json({ error: 'telegram_id and value (1-5) are required' }, 400);
  }

  const value = Math.round(body.value);
  if (value < 1 || value > 5) {
    return c.json({ error: 'Rating must be between 1 and 5' }, 400);
  }

  try {
    const user = await getOrCreateUser(c.env.DB, body.telegram_id);

    if (user.banned) {
      return c.json({ error: 'You are banned' }, 403);
    }

    const bot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first<{ id: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    // Upsert rating
    await c.env.DB.prepare(`
      INSERT INTO ratings (user_id, bot_id, value, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, bot_id) DO UPDATE SET value = excluded.value, created_at = datetime('now')
    `).bind(user.id, bot.id, value).run();

    // Recalculate bot's aggregate rating
    const agg = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt, SUM(value) as total FROM ratings WHERE bot_id = ?"
    ).bind(bot.id).first<{ cnt: number; total: number }>();

    await c.env.DB.prepare(
      "UPDATE bots SET rating_count = ?, rating_sum = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(agg?.cnt ?? 0, agg?.total ?? 0, bot.id).run();

    const avg = (agg?.cnt && agg?.total) ? (agg.total / agg.cnt) : 0;

    return c.json({ success: true, message: 'Rating submitted', rating: { value, avg: Math.round(avg * 10) / 10, count: agg?.cnt ?? 0 } });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get a bot's rating info
app.get("/bots/username/:username/rating", async (c) => {
  const username = c.req.param('username').replace('@', '');

  try {
    const bot = await c.env.DB.prepare(
      "SELECT id, rating_count, rating_sum FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first<{ id: number; rating_count: number; rating_sum: number }>();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    const avg = bot.rating_count > 0 ? Math.round((bot.rating_sum / bot.rating_count) * 10) / 10 : 0;

    return c.json({ avg, count: bot.rating_count });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get a user's rating for a specific bot
app.get("/bots/username/:username/rate/:telegramId", async (c) => {
  const username = c.req.param('username').replace('@', '');
  const telegramId = parseInt(c.req.param('telegramId'), 10);

  try {
    const row = await c.env.DB.prepare(`
      SELECT r.value FROM ratings r
      INNER JOIN users u ON r.user_id = u.id
      INNER JOIN bots b ON r.bot_id = b.id
      WHERE LOWER(b.username) = LOWER(?) AND u.telegram_id = ?
    `).bind(username, telegramId).first<{ value: number }>();

    return c.json({ value: row?.value ?? null });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== ADMIN ENDPOINTS ====================

// List pending submissions for review
app.get("/admin/submissions/pending", async (c) => {
  const adminId = parseInt(c.req.query('admin_id') || '0', 10);
  const limitRaw = parseInt(c.req.query('limit') || '10', 10);
  const limit = clampNumber(Number.isNaN(limitRaw) ? 10 : limitRaw, 1, 25);

  try {
    const admin = await getAdminUser(c.env.DB, adminId);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT s.*, u.telegram_id as submitter_telegram_id, u.username as submitter_username
      FROM bot_submissions s
      LEFT JOIN users u ON s.submitted_by = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC
      LIMIT ?
    `).bind(limit).all<BotSubmission>();

    return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Approve a submission and add the bot to the catalog
app.post("/admin/submissions/:id/approve", async (c) => {
  const submissionId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json<{
    admin_telegram_id: number;
    name?: string;
    description?: string;
    category_id?: number;
    username?: string;
  }>();

  if (!body.admin_telegram_id) {
    return c.json({ error: 'admin_telegram_id is required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const submission = await c.env.DB.prepare(
      "SELECT * FROM bot_submissions WHERE id = ?"
    ).bind(submissionId).first<BotSubmission>();

    if (!submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    if (submission.status !== 'pending') {
      return c.json({ error: 'Submission already processed' }, 400);
    }

    const username = sanitizeUsername(body.username || submission.username);
    const name = (body.name || submission.name || username).trim();
    const description = (body.description ?? submission.description ?? '').trim();
    const categoryId = body.category_id ?? submission.category_id ?? 1;

    const categoryExists = CATEGORIES.some((cat) => cat.id === categoryId);
    if (!categoryExists) {
      return c.json({ error: 'Invalid category_id' }, 400);
    }

    const existingBot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first();

    if (existingBot) {
      return c.json({ error: 'This bot is already in the BotList' }, 400);
    }

    const inlinequeries = (submission as BotSubmission & { inlinequeries?: number }).inlinequeries ? 1 : 0;

    await c.env.DB.prepare(
      `INSERT INTO bots (name, username, description, category_id, submitted_by, approved, offline, spam, rating_count, rating_sum, inlinequeries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, 0, ?, datetime('now'), datetime('now'))`
    ).bind(name, username, description, categoryId, submission.submitted_by, inlinequeries).run();

    await c.env.DB.prepare(
      "UPDATE bot_submissions SET status = 'approved' WHERE id = ?"
    ).bind(submissionId).run();

    const bot = await c.env.DB.prepare(
      "SELECT * FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first<Bot>();

    return c.json(bot);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reject a pending submission
app.post("/admin/submissions/:id/reject", async (c) => {
  const submissionId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json<{ admin_telegram_id: number }>();

  if (!body.admin_telegram_id) {
    return c.json({ error: 'admin_telegram_id is required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const submission = await c.env.DB.prepare(
      "SELECT status FROM bot_submissions WHERE id = ?"
    ).bind(submissionId).first<{ status: string }>();

    if (!submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    if (submission.status !== 'pending') {
      return c.json({ error: 'Submission already processed' }, 400);
    }

    await c.env.DB.prepare(
      "UPDATE bot_submissions SET status = 'rejected' WHERE id = ?"
    ).bind(submissionId).run();

    return c.json({ success: true, message: 'Submission rejected' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add a new bot directly (admin only)
app.post("/admin/bots", async (c) => {
  const body = await c.req.json<{
    username: string;
    name: string;
    description: string;
    category_id: number;
    admin_telegram_id: number;
  }>();

  if (!body.username || !body.name || !body.description || !body.category_id || !body.admin_telegram_id) {
    return c.json({ error: 'username, name, description, category_id and admin_telegram_id are required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const username = sanitizeUsername(body.username);
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const categoryExists = CATEGORIES.some((cat) => cat.id === body.category_id);
    if (!categoryExists) {
      return c.json({ error: 'Invalid category_id' }, 400);
    }

    const existingBot = await c.env.DB.prepare(
      "SELECT id FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first();

    if (existingBot) {
      return c.json({ error: 'This bot is already in the BotList' }, 400);
    }

    const adminUser = await getOrCreateUser(c.env.DB, body.admin_telegram_id);

    await c.env.DB.prepare(
      `INSERT INTO bots (name, username, description, category_id, submitted_by, approved, offline, spam, rating_count, rating_sum, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, 0, datetime('now'), datetime('now'))`
    ).bind(body.name.trim(), username, body.description.trim(), body.category_id, adminUser.id).run();

    const bot = await c.env.DB.prepare(
      "SELECT * FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(username).first<Bot>();

    return c.json(bot);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update an existing bot (admin only)
app.put("/admin/bots/username/:username", async (c) => {
  const targetUsername = sanitizeUsername(c.req.param('username'));
  const body = await c.req.json<{
    admin_telegram_id: number;
    name?: string;
    description?: string;
    category_id?: number;
    new_username?: string;
    country_id?: number;
    inlinequeries?: number;
  }>();

  if (!body.admin_telegram_id) {
    return c.json({ error: 'admin_telegram_id is required' }, 400);
  }

  try {
    const admin = await getAdminUser(c.env.DB, body.admin_telegram_id);
    if (!admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const bot = await c.env.DB.prepare(
      "SELECT * FROM bots WHERE LOWER(username) = LOWER(?)"
    ).bind(targetUsername).first<Bot>();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.name) {
      updates.push("name = ?");
      params.push(body.name.trim());
    }

    if (body.description !== undefined) {
      updates.push("description = ?");
      params.push((body.description ?? '').trim());
    }

    if (body.category_id !== undefined) {
      const categoryId = Number(body.category_id);
      const categoryExists = CATEGORIES.some((cat) => cat.id === categoryId);
      if (!categoryExists) {
        return c.json({ error: 'Invalid category_id' }, 400);
      }
      updates.push("category_id = ?");
      params.push(categoryId);
    }

    if (body.new_username) {
      const newUsername = sanitizeUsername(body.new_username);
      const conflict = await c.env.DB.prepare(
        "SELECT id FROM bots WHERE LOWER(username) = LOWER(?) AND id != ?"
      ).bind(newUsername, bot.id).first();

      if (conflict) {
        return c.json({ error: 'Username already exists' }, 400);
      }

      updates.push("username = ?");
      params.push(newUsername);
    }

    if (body.country_id !== undefined) {
      if (body.country_id === null) {
        updates.push("country_id = NULL");
      } else {
        updates.push("country_id = ?");
        params.push(body.country_id);
      }
    }

    if (body.inlinequeries !== undefined) {
      updates.push("inlinequeries = ?");
      params.push(body.inlinequeries ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No changes provided' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(bot.id);

    await c.env.DB.prepare(
      `UPDATE bots SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const updatedBot = await c.env.DB.prepare(
      "SELECT * FROM bots WHERE id = ?"
    ).bind(bot.id).first<Bot>();

    return c.json(updatedBot);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Ban a user
app.post("/admin/ban", async (c) => {
  const body = await c.req.json<{ user_id: number; admin_telegram_id: number }>();

  if (!body.user_id || !body.admin_telegram_id) {
    return c.json({ error: 'user_id and admin_telegram_id are required' }, 400);
  }

  try {
    // Verify admin
    const admin = await c.env.DB.prepare(
      "SELECT is_admin FROM users WHERE telegram_id = ?"
    ).bind(body.admin_telegram_id).first<{ is_admin: number }>();

    if (!admin || !admin.is_admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get or create the user to ban
    let user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE telegram_id = ?"
    ).bind(body.user_id).first<{ id: number }>();

    if (!user) {
      await c.env.DB.prepare(
        "INSERT INTO users (telegram_id, banned, is_admin, created_at) VALUES (?, 1, 0, datetime('now'))"
      ).bind(body.user_id).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE users SET banned = 1 WHERE telegram_id = ?"
      ).bind(body.user_id).run();
    }

    return c.json({ success: true, message: 'User banned' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unban a user
app.post("/admin/unban", async (c) => {
  const body = await c.req.json<{ user_id: number; admin_telegram_id: number }>();

  if (!body.user_id || !body.admin_telegram_id) {
    return c.json({ error: 'user_id and admin_telegram_id are required' }, 400);
  }

  try {
    // Verify admin
    const admin = await c.env.DB.prepare(
      "SELECT is_admin FROM users WHERE telegram_id = ?"
    ).bind(body.admin_telegram_id).first<{ is_admin: number }>();

    if (!admin || !admin.is_admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const result = await c.env.DB.prepare(
      "UPDATE users SET banned = 0 WHERE telegram_id = ?"
    ).bind(body.user_id).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ success: true, message: 'User unbanned' });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user info for admin
app.get("/admin/userinfo/:userId", async (c) => {
  const userId = parseInt(c.req.param('userId'), 10);
  const adminId = parseInt(c.req.query('admin_id') || '0', 10);

  try {
    // Verify admin
    const admin = await c.env.DB.prepare(
      "SELECT is_admin FROM users WHERE telegram_id = ?"
    ).bind(adminId).first<{ is_admin: number }>();

    if (!admin || !admin.is_admin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE telegram_id = ?"
    ).bind(userId).first<User>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's submitted bots
    const { results: submittedBots } = await c.env.DB.prepare(`
      SELECT * FROM bots WHERE submitted_by = ?
    `).bind(user.id).all<Bot>();

    // Get user's pending submissions
    const { results: pendingSubmissions } = await c.env.DB.prepare(`
      SELECT * FROM bot_submissions WHERE submitted_by = ? AND status = 'pending'
    `).bind(user.id).all<BotSubmission>();

    // Get spam reports made by user
    const { results: spamReports } = await c.env.DB.prepare(`
      SELECT sr.*, b.username as bot_username FROM spam_reports sr
      INNER JOIN bots b ON sr.bot_id = b.id
      WHERE sr.reported_by = ?
    `).bind(user.id).all();

    return c.json({
      user,
      submitted_bots: submittedBots,
      pending_submissions: pendingSubmissions,
      spam_reports: spamReports
    });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if user is admin
app.get("/admin/check/:telegramId", async (c) => {
  const telegramId = parseInt(c.req.param('telegramId'), 10);

  try {
    const user = await c.env.DB.prepare(
      "SELECT is_admin FROM users WHERE telegram_id = ?"
    ).bind(telegramId).first<{ is_admin: number }>();

    return c.json({ is_admin: user?.is_admin === 1 });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

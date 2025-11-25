import { Hono } from "hono";
import type { HonoContext, Category, Bot, User, Subscription, BotSubmission } from "./types";

const CATEGORIES: Category[] = [
    { id: 1, name: "🌿 Miscellaneous" },
    { id: 2, name: "👥 Social" },
    { id: 3, name: "🙋‍♂️ Promoting" },
    { id: 4, name: "🛍 Shopping" },
    { id: 5, name: "😂 Humor" },
    { id: 6, name: "🎮 Gaming" },
    { id: 7, name: "🏋️‍♂️ HTML5 Games" },
    { id: 8, name: "🤖 Bot creating" },
    { id: 9, name: "⚒ Sticker pack creation" },
    { id: 10, name: "🧸 Stickers & Gif's" },
    { id: 11, name: "🍟 Video" },
    { id: 12, name: "📸 Photography" },
    { id: 13, name: "🎧 Music" },
    { id: 14, name: "⚽ Sports" },
    { id: 15, name: "☔️ Weather" },
    { id: 16, name: "📰 News" },
    { id: 17, name: "✈️ Places & Traveling" },
    { id: 18, name: "📞 Android & Tech News" },
    { id: 19, name: "📲 Apps & software" },
    { id: 20, name: "📚 Books & Magazines" },
    { id: 21, name: "📓 Translation and dictionaries" },
    { id: 22, name: "💳 Public ID's" },
    { id: 23, name: "📝 Text Formatting" },
    { id: 24, name: "📦 Multiuse" },
    { id: 25, name: "🛠️ Group & channel tools" },
    { id: 26, name: "🍃 Inline Web Search" },
    { id: 27, name: "⏰ Organization and reminders" },
    { id: 28, name: "⚙️ Tools" }
  ];

// Local development often boots with an empty D1; prime it with the schema if needed.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  banned INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bots (
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id INTEGER NOT NULL DEFAULT 1,
  submitted_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bot_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spam_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  reported_by INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bot_id, reported_by)
);

CREATE INDEX IF NOT EXISTS idx_bots_category ON bots(category_id);
CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bots_username ON bots(username);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_chat ON subscriptions(chat_id);
CREATE INDEX IF NOT EXISTS idx_spam_reports_bot ON spam_reports(bot_id);

INSERT OR IGNORE INTO users (telegram_id, username, banned, is_admin, created_at) VALUES
(691609650, NULL, 0, 1, datetime('now')),
(62056065, NULL, 0, 1, datetime('now'));

INSERT OR IGNORE INTO bots (name, username, description, category_id) VALUES
('Bot Store Bot', 'storebot', 'The bot that started this store', 1),
('File Converter Bot', 'fileconverterbot', 'Convert files between different formats', 19),
('Music Bot', 'musicbot', 'Play and discover music', 13),
('Weather Bot', 'weatherbot', 'Get weather forecasts', 15),
('Gaming Bot', 'gamingbot', 'Play games and compete with friends', 6),
('Humor Bot', 'humorbot', 'Get jokes and funny content', 5),
('News Bot', 'newsbot', 'Latest news and updates', 16),
('Photo Editor Bot', 'photoeditorbot', 'Edit and enhance your photos', 12),
('Translation Bot', 'translatebot', 'Translate text between languages', 21),
('Reminder Bot', 'reminderbot', 'Set reminders and organize tasks', 27);
`;

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
  `CREATE INDEX IF NOT EXISTS idx_bots_category ON bots(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bots_username ON bots(username)`,
  `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_chat ON subscriptions(chat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_spam_reports_bot ON spam_reports(bot_id)`,
  `INSERT OR IGNORE INTO users (telegram_id, username, banned, is_admin, created_at) VALUES
    (691609650, NULL, 0, 1, datetime('now')),
    (62056065, NULL, 0, 1, datetime('now'))`,
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
    ('Reminder Bot', 'reminderbot', 'Set reminders and organize tasks', 27)`
];

let dbInitPromise: Promise<void> | null = null;

const ensureDatabase = (db: D1Database) => {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (existing) return;

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
  })().catch((err) => {
    dbInitPromise = null;
    throw err;
  });

  return dbInitPromise;
};

const app = new Hono<HonoContext>();

app.use("*", async (c, next) => {
  await ensureDatabase(c.env.DB);
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

app.get("/", (c) => {
  return c.text("GET /search?username=file&name=convert&description=audio");
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

  // Build dynamic query with proper parameter binding
  const conditions = [];
  const params = [];

  if (name) {
    conditions.push("LOWER(name) LIKE LOWER(?)");
    params.push(`%${name}%`);
  }
  
  if (username) {
    conditions.push("LOWER(username) LIKE LOWER(?)");
    params.push(`%${username}%`);
  }
  
  if (description) {
    conditions.push("LOWER(description) LIKE LOWER(?)");
    params.push(`%${description}%`);
  }

  const query = `SELECT * FROM bots WHERE ${conditions.map((condition) => `(${condition})`).join(' OR ')}`;

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
      INSERT INTO bot_submissions (username, name, description, category_id, submitted_by, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      body.username.replace('@', ''),
      body.name || body.username,
      body.description || '',
      body.category_id || 1,
      user.id
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

// ==================== ADMIN ENDPOINTS ====================

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
    
    if (!admin || admin.is_admin !== 1) {
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
    
    if (!admin || admin.is_admin !== 1) {
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
    
    if (!admin || admin.is_admin !== 1) {
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

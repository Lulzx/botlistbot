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
    telegram_id INTEGER,
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
	`CREATE INDEX IF NOT EXISTS idx_statistics_telegram_id ON statistics(telegram_id)`,
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
    ('Vietnamese', '🇻🇳')`,
];

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
    telegram_id INTEGER,
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
	`CREATE INDEX IF NOT EXISTS idx_statistics_telegram_id ON statistics(telegram_id)`,
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
    ('Vietnamese', '🇻🇳')`,
];

// Bump this when adding migrations so warm isolates re-run them
const SCHEMA_VERSION = 2;
let dbInitPromise: Promise<void> | null = null;
let initSchemaVersion: number | null = null;

export function ensureDatabase(env: { DB: D1Database; ADMIN_IDS?: string }): Promise<void> {
	if (dbInitPromise && initSchemaVersion === SCHEMA_VERSION) return dbInitPromise;

	const db = env.DB;

	dbInitPromise = null;
	initSchemaVersion = null;

	dbInitPromise = (async () => {
		const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
		if (existing) {
			for (const statement of MIGRATION_STATEMENTS) {
				try {
					const trimmed = statement.trim().replace(/;$/, '');
					await db.prepare(`${trimmed};`).run();
				} catch (err) {
					console.debug('Migration statement (may already exist):', err);
				}
			}
			try {
				await db.prepare('SELECT country_id FROM bots LIMIT 1').first();
			} catch {
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN country_id INTEGER REFERENCES countries(id)').run();
				} catch {
					/* already exists */
				}
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN inlinequeries INTEGER DEFAULT 0').run();
				} catch {
					/* already exists */
				}
			}
			try {
				await db.prepare('SELECT rating_count FROM bots LIMIT 1').first();
			} catch {
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN rating_count INTEGER DEFAULT 0').run();
				} catch {
					/* already exists */
				}
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN rating_sum INTEGER DEFAULT 0').run();
				} catch {
					/* already exists */
				}
			}
			try {
				await db.prepare('SELECT inlinequeries FROM bot_submissions LIMIT 1').first();
			} catch {
				try {
					await db.prepare('ALTER TABLE bot_submissions ADD COLUMN inlinequeries INTEGER DEFAULT 0').run();
				} catch {
					/* already exists */
				}
			}
			// Add missing bots columns (approved, spam, offline, submitted_by)
			try {
				await db.prepare('SELECT approved FROM bots LIMIT 1').first();
			} catch {
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN approved INTEGER DEFAULT 1').run();
				} catch {
					/* already exists */
				}
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN spam INTEGER DEFAULT 0').run();
				} catch {
					/* already exists */
				}
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN offline INTEGER DEFAULT 0').run();
				} catch {
					/* already exists */
				}
				try {
					await db.prepare('ALTER TABLE bots ADD COLUMN submitted_by INTEGER REFERENCES users(id)').run();
				} catch {
					/* already exists */
				}
			}
			try {
				await db.prepare('SELECT telegram_id FROM statistics LIMIT 1').first();
			} catch {
				try {
					await db.prepare('ALTER TABLE statistics ADD COLUMN telegram_id INTEGER').run();
				} catch {
					/* already exists */
				}
				try {
					await db.prepare('CREATE INDEX IF NOT EXISTS idx_statistics_telegram_id ON statistics(telegram_id)').run();
				} catch {
					/* already exists */
				}
			}
		} else {
			for (const statement of SCHEMA_STATEMENTS) {
				try {
					const trimmed = statement.trim().replace(/;$/, '');
					await db.prepare(`${trimmed};`).run();
				} catch (err) {
					console.error('Schema exec failed for statement:', statement);
					throw err;
				}
			}
		}

		if (env.ADMIN_IDS) {
			const adminIds = env.ADMIN_IDS.split(',')
				.map((id) => Number.parseInt(id.trim(), 10))
				.filter((id) => !Number.isNaN(id));
			for (const adminId of adminIds) {
				try {
					await db
						.prepare(
							"INSERT OR IGNORE INTO users (telegram_id, username, banned, is_admin, created_at) VALUES (?, NULL, 0, 1, datetime('now'))",
						)
						.bind(adminId)
						.run();
					await db.prepare('UPDATE users SET is_admin = 1 WHERE telegram_id = ?').bind(adminId).run();
				} catch {
					/* ignore */
				}
			}
		}
	})().catch((err) => {
		dbInitPromise = null;
		initSchemaVersion = null;
		throw err;
	});

	initSchemaVersion = SCHEMA_VERSION;
	return dbInitPromise;
}

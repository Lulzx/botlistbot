import type { Bot } from './types';

const MAX_QUERY_LENGTH = 100;

export async function searchBots(
	db: D1Database,
	opts: { name?: string; username?: string; description?: string },
): Promise<Bot[]> {
	const name = opts.name?.trim().slice(0, MAX_QUERY_LENGTH);
	const username = opts.username ? opts.username.replace(/^@+/, '').trim().slice(0, MAX_QUERY_LENGTH) : undefined;
	const description = opts.description?.trim().slice(0, MAX_QUERY_LENGTH);

	if (!name && !username && !description) return [];

	const conditions: string[] = [];
	const params: string[] = [];

	if (name) {
		conditions.push('LOWER(b.name) LIKE LOWER(?)');
		params.push(`%${name}%`);
	}
	if (username) {
		conditions.push('LOWER(b.username) LIKE LOWER(?)');
		params.push(`%${username}%`);
	}
	if (description) {
		conditions.push('LOWER(b.description) LIKE LOWER(?)');
		params.push(`%${description}%`);
	}

	const anyTerm = name || username || description;
	if (anyTerm) {
		conditions.push('EXISTS (SELECT 1 FROM keywords k WHERE k.bot_id = b.id AND LOWER(k.name) LIKE LOWER(?))');
		params.push(`%${anyTerm}%`);
	}

	if (conditions.length === 0) return [];

	const query = `SELECT DISTINCT b.* FROM bots b WHERE ${conditions.map((c) => `(${c})`).join(' OR ')}`;
	const { results } = await db.prepare(query).bind(...params).all<Bot>();
	return results;
}

export async function getRandomBots(db: D1Database, limit = 5): Promise<Bot[]> {
	const safeLimit = Math.min(Math.max(limit, 1), 20);
	const { results } = await db.prepare('SELECT * FROM bots ORDER BY RANDOM() LIMIT ?').bind(safeLimit).all<Bot>();
	return results;
}

export async function getNewBots(db: D1Database, limit = 10): Promise<Bot[]> {
	const safeLimit = Math.min(Math.max(limit, 1), 50);
	const { results } = await db
		.prepare('SELECT * FROM bots ORDER BY created_at DESC LIMIT ?')
		.bind(safeLimit)
		.all<Bot>();
	return results;
}

export async function getBestBots(db: D1Database, limit = 10): Promise<Bot[]> {
	const safeLimit = Math.min(Math.max(limit, 1), 50);
	const { results } = await db
		.prepare(
			'SELECT *, CASE WHEN rating_count > 0 THEN rating_sum * 1.0 / rating_count ELSE 0 END as avg_rating FROM bots WHERE rating_count > 0 ORDER BY avg_rating DESC, rating_count DESC LIMIT ?',
		)
		.bind(safeLimit)
		.all<Bot>();
	return results;
}

export async function getBotByUsername(db: D1Database, username: string): Promise<Bot | null> {
	const clean = username.replace(/^@+/, '');
	return db.prepare('SELECT * FROM bots WHERE LOWER(username) = LOWER(?)').bind(clean).first<Bot>();
}

export async function getBotsByCategory(db: D1Database, categoryId: number): Promise<Bot[]> {
	const { results } = await db.prepare('SELECT * FROM bots WHERE category_id = ?').bind(categoryId).all<Bot>();
	return results;
}

export async function getAllBots(db: D1Database): Promise<Bot[]> {
	const { results } = await db.prepare('SELECT * FROM bots').all<Bot>();
	return results;
}

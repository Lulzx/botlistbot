import type { ApiResponse, Bot, Keyword } from './types';
import { getAdminUser } from './users';

export async function getKeywordsForBot(db: D1Database, botId: number): Promise<Keyword[]> {
	const { results } = await db
		.prepare('SELECT * FROM keywords WHERE bot_id = ? ORDER BY name')
		.bind(botId)
		.all<Keyword>();
	return results;
}

export async function searchByKeyword(db: D1Database, query: string): Promise<Bot[]> {
	const q = query.trim();
	if (!q || q.length < 2) return [];

	const { results } = await db
		.prepare(
			`SELECT DISTINCT b.* FROM bots b
      INNER JOIN keywords k ON b.id = k.bot_id
      WHERE LOWER(k.name) LIKE LOWER(?)`,
		)
		.bind(`%${q}%`)
		.all<Bot>();
	return results;
}

export async function addKeyword(
	db: D1Database,
	botId: number,
	name: string,
	adminTelegramId: number,
): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const bot = await db.prepare('SELECT id FROM bots WHERE id = ?').bind(botId).first();
	if (!bot) return { error: 'Bot not found' };

	const keyword = name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
	if (!keyword || keyword.length < 2 || keyword.length > 50) {
		return { error: 'Invalid keyword (2-50 chars, alphanumeric)' };
	}

	await db
		.prepare("INSERT OR IGNORE INTO keywords (name, bot_id, created_at) VALUES (?, ?, datetime('now'))")
		.bind(keyword, botId)
		.run();

	return { success: true, message: 'Keyword added' };
}

export async function removeKeyword(
	db: D1Database,
	botId: number,
	name: string,
	adminTelegramId: number,
): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	await db.prepare('DELETE FROM keywords WHERE bot_id = ? AND name = ?').bind(botId, name).run();

	return { success: true, message: 'Keyword removed' };
}

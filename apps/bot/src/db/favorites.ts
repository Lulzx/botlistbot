import type { ApiResponse, Bot } from './types';
import { getOrCreateUser } from './users';

export async function getUserFavorites(db: D1Database, telegramId: number): Promise<Bot[]> {
	const { results } = await db
		.prepare(
			`SELECT b.* FROM bots b
      INNER JOIN favorites f ON b.id = f.bot_id
      INNER JOIN users u ON f.user_id = u.id
      WHERE u.telegram_id = ?
      ORDER BY f.created_at DESC`,
		)
		.bind(telegramId)
		.all<Bot>();
	return results;
}

export async function addFavorite(db: D1Database, telegramId: number, botUsername: string): Promise<ApiResponse> {
	const user = await getOrCreateUser(db, telegramId);
	const bot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(botUsername.replace('@', ''))
		.first<{ id: number }>();

	if (!bot) return { error: 'Bot not found in the database' };

	const existing = await db
		.prepare('SELECT id FROM favorites WHERE user_id = ? AND bot_id = ?')
		.bind(user.id, bot.id)
		.first();

	if (existing) return { error: 'Bot already in favorites' };

	await db
		.prepare("INSERT INTO favorites (user_id, bot_id, created_at) VALUES (?, ?, datetime('now'))")
		.bind(user.id, bot.id)
		.run();

	return { success: true, message: 'Bot added to favorites' };
}

export async function removeFavorite(db: D1Database, telegramId: number, botUsername: string): Promise<ApiResponse> {
	const user = await db
		.prepare('SELECT id FROM users WHERE telegram_id = ?')
		.bind(telegramId)
		.first<{ id: number }>();

	if (!user) return { error: 'User not found' };

	const bot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(botUsername.replace('@', ''))
		.first<{ id: number }>();

	if (!bot) return { error: 'Bot not found' };

	await db.prepare('DELETE FROM favorites WHERE user_id = ? AND bot_id = ?').bind(user.id, bot.id).run();

	return { success: true, message: 'Bot removed from favorites' };
}

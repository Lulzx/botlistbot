import type { ApiResponse } from './types';
import { getOrCreateUser } from './users';

export interface RateResult extends ApiResponse {
	rating?: { value: number; avg: number; count: number };
}

export async function rateBot(
	db: D1Database,
	username: string,
	telegramId: number,
	value: number,
): Promise<RateResult> {
	const cleanUsername = username.replace(/^@+/, '');
	const roundedValue = Math.round(value);
	if (roundedValue < 1 || roundedValue > 5) return { error: 'Rating must be between 1 and 5' };

	const user = await getOrCreateUser(db, telegramId);
	if (user.banned) return { error: 'You are banned' };

	const bot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(cleanUsername)
		.first<{ id: number }>();

	if (!bot) return { error: 'Bot not found' };

	await db.batch([
		db
			.prepare(
				`INSERT INTO ratings (user_id, bot_id, value, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, bot_id) DO UPDATE SET value = excluded.value, created_at = datetime('now')`,
			)
			.bind(user.id, bot.id, roundedValue),
		db
			.prepare(
				"UPDATE bots SET rating_count = (SELECT COUNT(*) FROM ratings WHERE bot_id = ?), rating_sum = (SELECT COALESCE(SUM(value), 0) FROM ratings WHERE bot_id = ?), updated_at = datetime('now') WHERE id = ?",
			)
			.bind(bot.id, bot.id, bot.id),
	]);

	const updated = await db
		.prepare('SELECT rating_count, rating_sum FROM bots WHERE id = ?')
		.bind(bot.id)
		.first<{ rating_count: number; rating_sum: number }>();

	const count = updated?.rating_count ?? 0;
	const avg = count > 0 ? updated!.rating_sum / count : 0;

	return {
		success: true,
		message: 'Rating submitted',
		rating: { value: roundedValue, avg: Math.round(avg * 10) / 10, count },
	};
}

export async function getBotRating(
	db: D1Database,
	username: string,
): Promise<{ avg: number; count: number } | null> {
	const cleanUsername = username.replace(/^@+/, '');
	const bot = await db
		.prepare('SELECT id, rating_count, rating_sum FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(cleanUsername)
		.first<{ id: number; rating_count: number; rating_sum: number }>();

	if (!bot) return null;

	const avg = bot.rating_count > 0 ? Math.round((bot.rating_sum / bot.rating_count) * 10) / 10 : 0;
	return { avg, count: bot.rating_count };
}

export async function getUserRating(
	db: D1Database,
	username: string,
	telegramId: number,
): Promise<number | null> {
	const cleanUsername = username.replace(/^@+/, '');
	const row = await db
		.prepare(
			`SELECT r.value FROM ratings r
      INNER JOIN users u ON r.user_id = u.id
      INNER JOIN bots b ON r.bot_id = b.id
      WHERE LOWER(b.username) = LOWER(?) AND u.telegram_id = ?`,
		)
		.bind(cleanUsername, telegramId)
		.first<{ value: number }>();

	return row?.value ?? null;
}

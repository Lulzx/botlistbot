import type { ApiResponse } from './types';
import { getOrCreateUser } from './users';

export async function reportSpam(
	db: D1Database,
	botUsername: string,
	telegramId: number,
	reason?: string,
): Promise<ApiResponse> {
	const user = await getOrCreateUser(db, telegramId);

	if (user.banned) return { error: 'You are banned from reporting' };

	const bot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(botUsername.replace(/^@+/, ''))
		.first<{ id: number }>();

	if (!bot) return { error: 'Bot not found in the database' };

	const existing = await db
		.prepare('SELECT id FROM spam_reports WHERE bot_id = ? AND reported_by = ?')
		.bind(bot.id, user.id)
		.first();

	if (existing) return { error: 'You have already reported this bot' };

	await db
		.prepare("INSERT INTO spam_reports (bot_id, reported_by, reason, created_at) VALUES (?, ?, ?, datetime('now'))")
		.bind(bot.id, user.id, reason || null)
		.run();

	return { success: true, message: 'Spam report submitted' };
}

export async function reportOffline(db: D1Database, botUsername: string, telegramId: number): Promise<ApiResponse> {
	const user = await getOrCreateUser(db, telegramId);

	if (user.banned) return { error: 'You are banned from reporting' };

	const bot = await db
		.prepare('SELECT id, offline FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(botUsername.replace(/^@+/, ''))
		.first<{ id: number; offline: number }>();

	if (!bot) return { error: 'Bot not found in the database' };

	if (bot.offline === 1) return { error: 'This bot has already been reported as offline' };

	await db
		.prepare("UPDATE bots SET offline = 1, updated_at = datetime('now') WHERE id = ?")
		.bind(bot.id)
		.run();

	return { success: true, message: 'Bot reported as offline' };
}

import { CATEGORIES } from '@botlistbot/shared';
import type { ApiResponse, Suggestion } from './types';
import { getAdminUser, getOrCreateUser } from './users';

export async function createSuggestion(
	db: D1Database,
	telegramId: number,
	botUsername: string,
	action: string,
	value?: string,
): Promise<ApiResponse> {
	const validActions = ['name', 'description', 'category', 'offline', 'spam', 'inlinequeries', 'add_keyword', 'remove_keyword'];
	if (!validActions.includes(action)) {
		return { error: `Invalid action. Must be one of: ${validActions.join(', ')}` };
	}

	const user = await getOrCreateUser(db, telegramId);
	if (user.banned) return { error: 'You are banned' };

	const bot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(botUsername.replace('@', ''))
		.first<{ id: number }>();

	if (!bot) return { error: 'Bot not found' };

	await db
		.prepare(
			"INSERT INTO suggestions (user_id, bot_id, action, value, executed, created_at) VALUES (?, ?, ?, ?, 0, datetime('now'))",
		)
		.bind(user.id, bot.id, action, value || null)
		.run();

	return { success: true, message: 'Suggestion submitted' };
}

export async function getPendingSuggestions(
	db: D1Database,
	adminTelegramId: number,
	limit = 10,
): Promise<Suggestion[]> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return [];

	const safeLimit = Math.min(Math.max(Number.isNaN(limit) ? 10 : limit, 1), 25);
	const { results } = await db
		.prepare(
			`SELECT s.*, b.username as bot_username, b.name as bot_name, u.telegram_id as user_telegram_id, u.username
      FROM suggestions s
      LEFT JOIN bots b ON s.bot_id = b.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.executed = 0
      ORDER BY s.created_at ASC
      LIMIT ?`,
		)
		.bind(safeLimit)
		.all<Suggestion>();

	return results;
}

export async function acceptSuggestion(db: D1Database, suggestionId: number, adminTelegramId: number): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const suggestion = await db.prepare('SELECT * FROM suggestions WHERE id = ?').bind(suggestionId).first<Suggestion>();
	if (!suggestion) return { error: 'Suggestion not found' };
	if (suggestion.executed !== 0) return { error: 'Suggestion already processed' };

	switch (suggestion.action) {
		case 'name':
			if (suggestion.value) {
				await db
					.prepare("UPDATE bots SET name = ?, updated_at = datetime('now') WHERE id = ?")
					.bind(suggestion.value, suggestion.bot_id)
					.run();
			}
			break;
		case 'description':
			if (suggestion.value) {
				await db
					.prepare("UPDATE bots SET description = ?, updated_at = datetime('now') WHERE id = ?")
					.bind(suggestion.value, suggestion.bot_id)
					.run();
			}
			break;
		case 'category':
			if (suggestion.value) {
				const catId = parseInt(suggestion.value, 10);
				if (!isNaN(catId) && CATEGORIES.some((cat) => cat.id === catId)) {
					await db
						.prepare("UPDATE bots SET category_id = ?, updated_at = datetime('now') WHERE id = ?")
						.bind(catId, suggestion.bot_id)
						.run();
				}
			}
			break;
		case 'offline':
			await db
				.prepare("UPDATE bots SET offline = 1, updated_at = datetime('now') WHERE id = ?")
				.bind(suggestion.bot_id)
				.run();
			break;
		case 'spam':
			await db
				.prepare("UPDATE bots SET spam = 1, updated_at = datetime('now') WHERE id = ?")
				.bind(suggestion.bot_id)
				.run();
			break;
		case 'inlinequeries':
			await db
				.prepare("UPDATE bots SET inlinequeries = 1, updated_at = datetime('now') WHERE id = ?")
				.bind(suggestion.bot_id)
				.run();
			break;
		case 'add_keyword':
			if (suggestion.value) {
				await db
					.prepare("INSERT OR IGNORE INTO keywords (name, bot_id, created_at) VALUES (?, ?, datetime('now'))")
					.bind(suggestion.value.toLowerCase(), suggestion.bot_id)
					.run();
			}
			break;
		case 'remove_keyword':
			if (suggestion.value) {
				await db
					.prepare('DELETE FROM keywords WHERE name = ? AND bot_id = ?')
					.bind(suggestion.value.toLowerCase(), suggestion.bot_id)
					.run();
			}
			break;
	}

	await db.prepare('UPDATE suggestions SET executed = 1 WHERE id = ?').bind(suggestionId).run();
	return { success: true, message: 'Suggestion accepted and applied' };
}

export async function rejectSuggestion(db: D1Database, suggestionId: number, adminTelegramId: number): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const suggestion = await db
		.prepare('SELECT executed FROM suggestions WHERE id = ?')
		.bind(suggestionId)
		.first<{ executed: number }>();

	if (!suggestion) return { error: 'Suggestion not found' };
	if (suggestion.executed !== 0) return { error: 'Suggestion already processed' };

	await db.prepare('UPDATE suggestions SET executed = -1 WHERE id = ?').bind(suggestionId).run();
	return { success: true, message: 'Suggestion rejected' };
}

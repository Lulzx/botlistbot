import type { ApiResponse } from './types';
import { getAdminUser, getOrCreateUser } from './users';

export async function subscribe(db: D1Database, chatId: number, telegramId: number): Promise<ApiResponse> {
	const user = await getOrCreateUser(db, telegramId);

	const existing = await db
		.prepare('SELECT id, active FROM subscriptions WHERE chat_id = ?')
		.bind(chatId)
		.first<{ id: number; active: number }>();

	if (existing) {
		if (existing.active === 1) return { error: 'Already subscribed' };
		await db.prepare('UPDATE subscriptions SET active = 1 WHERE id = ?').bind(existing.id).run();
	} else {
		await db
			.prepare("INSERT INTO subscriptions (chat_id, user_id, active, created_at) VALUES (?, ?, 1, datetime('now'))")
			.bind(chatId, user.id)
			.run();
	}

	return { success: true, message: 'Subscribed to updates' };
}

export async function unsubscribe(db: D1Database, chatId: number): Promise<ApiResponse> {
	const result = await db.prepare('UPDATE subscriptions SET active = 0 WHERE chat_id = ?').bind(chatId).run();

	if (result.meta.changes === 0) return { error: 'No active subscription found' };

	return { success: true, message: 'Unsubscribed from updates' };
}

export async function getAllActiveSubscribers(
	db: D1Database,
	adminTelegramId: number,
): Promise<Array<{ chat_id: number }>> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return [];

	const { results } = await db
		.prepare('SELECT chat_id FROM subscriptions WHERE active = 1')
		.all<{ chat_id: number }>();
	return results;
}

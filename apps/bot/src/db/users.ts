import type { User } from './types';

export async function getOrCreateUser(
	db: D1Database,
	telegramId: number,
	username?: string,
	firstName?: string,
): Promise<User> {
	let user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(telegramId).first<User>();

	if (!user) {
		await db
			.prepare(
				"INSERT INTO users (telegram_id, username, first_name, banned, is_admin, created_at) VALUES (?, ?, ?, 0, 0, datetime('now'))",
			)
			.bind(telegramId, username || null, firstName || null)
			.run();
		user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(telegramId).first<User>();
		if (!user) throw new Error(`Failed to create user for telegram_id ${telegramId}`);
	} else if (username || firstName) {
		const updates: string[] = [];
		const params: unknown[] = [];
		if (username && user.username !== username) {
			updates.push('username = ?');
			params.push(username);
		}
		if (firstName && user.first_name !== firstName) {
			updates.push('first_name = ?');
			params.push(firstName);
		}
		if (updates.length > 0) {
			params.push(telegramId);
			await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE telegram_id = ?`).bind(...params).run();
			user = { ...user, username: username || user.username, first_name: firstName || user.first_name };
		}
	}

	return user;
}

export async function getUserByTelegramId(db: D1Database, telegramId: number): Promise<User | null> {
	return db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(telegramId).first<User>();
}

export async function isUserAdmin(db: D1Database, telegramId: number): Promise<boolean> {
	const user = await db
		.prepare('SELECT is_admin FROM users WHERE telegram_id = ?')
		.bind(telegramId)
		.first<{ is_admin: number }>();
	return user?.is_admin === 1;
}

export async function isUserBanned(db: D1Database, telegramId: number, adminTelegramId: number): Promise<boolean | null> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return null;

	const user = await db
		.prepare('SELECT banned FROM users WHERE telegram_id = ?')
		.bind(telegramId)
		.first<{ banned: number }>();

	return user?.banned === 1;
}

const adminCache = new Map<number, { user: User | null; expiry: number }>();
const ADMIN_CACHE_TTL = 60_000; // 1 minute

export async function getAdminUser(db: D1Database, adminTelegramId: number): Promise<User | null> {
	if (!adminTelegramId) return null;

	const cached = adminCache.get(adminTelegramId);
	if (cached && Date.now() < cached.expiry) return cached.user;

	const admin = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(adminTelegramId).first<User>();
	const result = admin && admin.is_admin === 1 ? admin : null;

	adminCache.set(adminTelegramId, { user: result, expiry: Date.now() + ADMIN_CACHE_TTL });
	return result;
}

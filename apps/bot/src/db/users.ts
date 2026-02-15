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

export async function getAdminUser(db: D1Database, adminTelegramId: number): Promise<User | null> {
	if (!adminTelegramId) return null;
	const admin = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(adminTelegramId).first<User>();
	if (!admin || admin.is_admin !== 1) return null;
	return admin;
}

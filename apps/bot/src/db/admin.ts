import { CATEGORIES } from '@botlistbot/shared';
import type { ApiResponse, Bot, BotSubmission, UserInfo } from './types';
import { getAdminUser } from './users';

const sanitizeUsername = (username: string) => username.replace(/^@+/, '').trim();

export async function getPendingSubmissions(
	db: D1Database,
	adminTelegramId: number,
	limit = 10,
): Promise<BotSubmission[]> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return [];

	const safeLimit = Math.min(Math.max(Number.isNaN(limit) ? 10 : limit, 1), 25);
	const { results } = await db
		.prepare(
			`SELECT s.*, u.telegram_id as submitter_telegram_id, u.username as submitter_username
      FROM bot_submissions s
      LEFT JOIN users u ON s.submitted_by = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC
      LIMIT ?`,
		)
		.bind(safeLimit)
		.all<BotSubmission>();

	return results;
}

export async function approveSubmission(
	db: D1Database,
	submissionId: number,
	adminTelegramId: number,
	overrides?: { name?: string; description?: string; category_id?: number; username?: string },
): Promise<Bot | ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const submission = await db
		.prepare('SELECT * FROM bot_submissions WHERE id = ?')
		.bind(submissionId)
		.first<BotSubmission>();

	if (!submission) return { error: 'Submission not found' };
	if (submission.status !== 'pending') return { error: 'Submission already processed' };

	const username = sanitizeUsername(overrides?.username || submission.username);
	const name = (overrides?.name || submission.name || username).trim();
	const description = (overrides?.description ?? submission.description ?? '').trim();
	const categoryId = overrides?.category_id ?? submission.category_id ?? 1;

	if (!CATEGORIES.some((cat) => cat.id === categoryId)) {
		return { error: 'Invalid category_id' };
	}

	const existingBot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(username)
		.first();

	if (existingBot) return { error: 'This bot is already in the BotList' };

	const inlinequeries = submission.inlinequeries ? 1 : 0;

	await db.batch([
		db
			.prepare(
				`INSERT INTO bots (name, username, description, category_id, submitted_by, approved, offline, spam, rating_count, rating_sum, inlinequeries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, 0, ?, datetime('now'), datetime('now'))`,
			)
			.bind(name, username, description, categoryId, submission.submitted_by, inlinequeries),
		db.prepare("UPDATE bot_submissions SET status = 'approved' WHERE id = ?").bind(submissionId),
	]);

	const bot = await db
		.prepare('SELECT * FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(username)
		.first<Bot>();

	if (!bot) return { error: 'Failed to create bot' };
	return bot;
}

export async function rejectSubmission(
	db: D1Database,
	submissionId: number,
	adminTelegramId: number,
): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const submission = await db
		.prepare('SELECT status FROM bot_submissions WHERE id = ?')
		.bind(submissionId)
		.first<{ status: string }>();

	if (!submission) return { error: 'Submission not found' };
	if (submission.status !== 'pending') return { error: 'Submission already processed' };

	await db.prepare("UPDATE bot_submissions SET status = 'rejected' WHERE id = ?").bind(submissionId).run();

	return { success: true, message: 'Submission rejected' };
}

export async function addBot(
	db: D1Database,
	opts: { username: string; name: string; description: string; category_id: number; admin_telegram_id: number },
): Promise<Bot | ApiResponse> {
	const admin = await getAdminUser(db, opts.admin_telegram_id);
	if (!admin) return { error: 'Unauthorized' };

	const username = sanitizeUsername(opts.username);
	if (!username) return { error: 'Invalid username' };
	if (opts.name.length > 200) return { error: 'Name is too long (max 200 chars)' };
	if (opts.description.length > 1000) return { error: 'Description is too long (max 1000 chars)' };

	if (!CATEGORIES.some((cat) => cat.id === opts.category_id)) {
		return { error: 'Invalid category_id' };
	}

	const existingBot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(username)
		.first();

	if (existingBot) return { error: 'This bot is already in the BotList' };

	await db
		.prepare(
			`INSERT INTO bots (name, username, description, category_id, submitted_by, approved, offline, spam, rating_count, rating_sum, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, 0, datetime('now'), datetime('now'))`,
		)
		.bind(opts.name.trim(), username, opts.description.trim(), opts.category_id, admin.id)
		.run();

	const bot = await db
		.prepare('SELECT * FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(username)
		.first<Bot>();

	if (!bot) return { error: 'Failed to create bot' };
	return bot;
}

export async function updateBot(
	db: D1Database,
	targetUsername: string,
	adminTelegramId: number,
	updates: {
		name?: string;
		description?: string;
		category_id?: number;
		new_username?: string;
		country_id?: number | null;
		inlinequeries?: number;
	},
): Promise<Bot | ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const cleanUsername = sanitizeUsername(targetUsername);
	const bot = await db
		.prepare('SELECT * FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(cleanUsername)
		.first<Bot>();

	if (!bot) return { error: 'Bot not found' };

	const setClauses: string[] = [];
	const params: unknown[] = [];

	if (updates.name) {
		setClauses.push('name = ?');
		params.push(updates.name.trim());
	}

	if (updates.description !== undefined) {
		setClauses.push('description = ?');
		params.push((updates.description ?? '').trim());
	}

	if (updates.category_id !== undefined) {
		const categoryId = Number(updates.category_id);
		if (!CATEGORIES.some((cat) => cat.id === categoryId)) {
			return { error: 'Invalid category_id' };
		}
		setClauses.push('category_id = ?');
		params.push(categoryId);
	}

	if (updates.new_username) {
		const newUsername = sanitizeUsername(updates.new_username);
		const conflict = await db
			.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?) AND id != ?')
			.bind(newUsername, bot.id)
			.first();

		if (conflict) return { error: 'Username already exists' };

		setClauses.push('username = ?');
		params.push(newUsername);
	}

	if (updates.country_id !== undefined) {
		if (updates.country_id === null) {
			setClauses.push('country_id = NULL');
		} else {
			setClauses.push('country_id = ?');
			params.push(updates.country_id);
		}
	}

	if (updates.inlinequeries !== undefined) {
		setClauses.push('inlinequeries = ?');
		params.push(updates.inlinequeries ? 1 : 0);
	}

	if (setClauses.length === 0) return { error: 'No changes provided' };

	setClauses.push("updated_at = datetime('now')");
	params.push(bot.id);

	await db.prepare(`UPDATE bots SET ${setClauses.join(', ')} WHERE id = ?`).bind(...params).run();

	const updatedBot = await db.prepare('SELECT * FROM bots WHERE id = ?').bind(bot.id).first<Bot>();
	if (!updatedBot) return { error: 'Failed to update bot' };
	return updatedBot;
}

export async function banUser(db: D1Database, userId: number, adminTelegramId: number): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const user = await db
		.prepare('SELECT id FROM users WHERE telegram_id = ?')
		.bind(userId)
		.first<{ id: number }>();

	if (!user) {
		await db
			.prepare("INSERT INTO users (telegram_id, banned, is_admin, created_at) VALUES (?, 1, 0, datetime('now'))")
			.bind(userId)
			.run();
	} else {
		await db.prepare('UPDATE users SET banned = 1 WHERE telegram_id = ?').bind(userId).run();
	}

	return { success: true, message: 'User banned' };
}

export async function unbanUser(db: D1Database, userId: number, adminTelegramId: number): Promise<ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const result = await db.prepare('UPDATE users SET banned = 0 WHERE telegram_id = ?').bind(userId).run();

	if (result.meta.changes === 0) return { error: 'User not found' };

	return { success: true, message: 'User unbanned' };
}

export async function getUserInfo(db: D1Database, telegramId: number, adminTelegramId: number): Promise<UserInfo | ApiResponse> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return { error: 'Unauthorized' };

	const user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(telegramId).first<import('./types').User>();
	if (!user) return { error: 'User not found' };

	const { results: submittedBots } = await db
		.prepare('SELECT * FROM bots WHERE submitted_by = ?')
		.bind(user.id)
		.all<Bot>();

	const { results: pendingSubmissions } = await db
		.prepare("SELECT * FROM bot_submissions WHERE submitted_by = ? AND status = 'pending'")
		.bind(user.id)
		.all<BotSubmission>();

	const { results: spamReports } = await db
		.prepare(
			`SELECT sr.*, b.username as bot_username FROM spam_reports sr
      INNER JOIN bots b ON sr.bot_id = b.id
      WHERE sr.reported_by = ?`,
		)
		.bind(user.id)
		.all();

	return {
		user,
		submitted_bots: submittedBots,
		pending_submissions: pendingSubmissions,
		spam_reports: spamReports as UserInfo['spam_reports'],
	};
}

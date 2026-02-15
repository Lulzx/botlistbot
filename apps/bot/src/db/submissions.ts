import type { ApiResponse, Bot, BotSubmission, UserSubmissions } from './types';
import { getOrCreateUser } from './users';

export async function submitBot(
	db: D1Database,
	opts: {
		username: string;
		name: string;
		description: string;
		category_id: number;
		telegram_id: number;
		inlinequeries?: number;
	},
): Promise<ApiResponse> {
	const user = await getOrCreateUser(db, opts.telegram_id);

	if (user.banned) return { error: 'You are banned from submitting bots' };

	const existingBot = await db
		.prepare('SELECT id FROM bots WHERE LOWER(username) = LOWER(?)')
		.bind(opts.username.replace('@', ''))
		.first();

	if (existingBot) return { error: 'This bot is already in the BotList' };

	const existingSubmission = await db
		.prepare("SELECT id FROM bot_submissions WHERE LOWER(username) = LOWER(?) AND status = 'pending'")
		.bind(opts.username.replace('@', ''))
		.first();

	if (existingSubmission) return { error: 'This bot has already been submitted and is pending review' };

	await db
		.prepare(
			`INSERT INTO bot_submissions (username, name, description, category_id, submitted_by, inlinequeries, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
		)
		.bind(
			opts.username.replace('@', ''),
			opts.name || opts.username,
			opts.description || '',
			opts.category_id || 1,
			user.id,
			opts.inlinequeries ? 1 : 0,
		)
		.run();

	return { success: true, message: 'Bot submitted for review' };
}

export async function getUserSubmissions(db: D1Database, telegramId: number): Promise<UserSubmissions> {
	const { results: approvedBots } = await db
		.prepare(
			`SELECT b.*, 'approved' as status FROM bots b
      INNER JOIN users u ON b.submitted_by = u.id
      WHERE u.telegram_id = ?`,
		)
		.bind(telegramId)
		.all<Bot & { status: string }>();

	const { results: pendingBots } = await db
		.prepare(
			`SELECT s.*, 'pending' as bot_status FROM bot_submissions s
      INNER JOIN users u ON s.submitted_by = u.id
      WHERE u.telegram_id = ? AND s.status = 'pending'`,
		)
		.bind(telegramId)
		.all<BotSubmission & { bot_status: string }>();

	return { approved: approvedBots, pending: pendingBots };
}

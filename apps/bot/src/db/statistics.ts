import type { StatisticsSummary } from './types';
import { getAdminUser } from './users';

export async function logActivity(
	db: D1Database,
	opts: { telegram_id?: number; action: string; entity?: string; level?: number },
): Promise<void> {
	let userId: number | null = null;
	if (opts.telegram_id) {
		const user = await db
			.prepare('SELECT id FROM users WHERE telegram_id = ?')
			.bind(opts.telegram_id)
			.first<{ id: number }>();
		userId = user?.id ?? null;
	}

	await db
		.prepare("INSERT INTO statistics (user_id, action, entity, level, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
		.bind(userId, opts.action, opts.entity || null, opts.level ?? 20)
		.run();
}

export async function getStatisticsSummary(db: D1Database, adminTelegramId: number): Promise<StatisticsSummary | null> {
	const admin = await getAdminUser(db, adminTelegramId);
	if (!admin) return null;

	const [actionsResult, totalBots, totalUsers, totalFavorites, pendingSuggestions] = await Promise.all([
		db
			.prepare('SELECT action, COUNT(*) as count FROM statistics GROUP BY action ORDER BY count DESC')
			.all<{ action: string; count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM bots').first<{ count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM favorites').first<{ count: number }>(),
		db
			.prepare('SELECT COUNT(*) as count FROM suggestions WHERE executed = 0')
			.first<{ count: number }>(),
	]);

	return {
		actions: actionsResult.results,
		totals: {
			bots: totalBots?.count ?? 0,
			users: totalUsers?.count ?? 0,
			favorites: totalFavorites?.count ?? 0,
			pending_suggestions: pendingSuggestions?.count ?? 0,
		},
	};
}

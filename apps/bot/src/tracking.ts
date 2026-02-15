import { logActivity } from './db';
import type { MyContext } from './types';

/**
 * Fire-and-forget activity tracking. Logs an action to the statistics DB.
 * Never throws or blocks the caller.
 */
export function trackActivity(ctx: MyContext, action: string, entity?: string, level = 20): void {
	const telegramId = ctx.from?.id;
	logActivity(ctx.env.DB, {
		telegram_id: telegramId,
		action,
		entity,
		level,
	}).catch((err) => console.error('trackActivity failed:', err));
}

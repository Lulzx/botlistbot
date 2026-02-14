import { type ApiResponse, postToApi } from './api';
import type { MyContext } from './types';

/**
 * Fire-and-forget activity tracking. Logs an action to the statistics API.
 * Never throws or blocks the caller.
 */
export function trackActivity(ctx: MyContext, action: string, entity?: string, level = 20): void {
	const telegramId = ctx.from?.id;
	postToApi<ApiResponse>(
		'/statistics',
		{
			telegram_id: telegramId,
			action,
			entity,
			level,
		},
		ctx.env.API_BASE_URL,
		ctx.env.API,
	).catch((err) => console.error('trackActivity failed:', err));
}

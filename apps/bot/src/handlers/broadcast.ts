import { Composer } from 'grammy/web';
import { fetchFromApi } from '../api';
import { isAdminId } from '../config';
import { MESSAGES } from '../constants';
import { createConfirmKeyboard } from '../keyboards';
import { trackActivity } from '../tracking';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

// Pending broadcast messages (keyed by admin user id)
const pendingBroadcasts = new Map<number, string>();

// /broadcast command
composer.command('broadcast', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId || !isAdminId(adminId, ctx.env)) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const text = ctx.match?.trim();

	if (!text) {
		await ctx.reply(MESSAGES.BROADCAST_PROMPT, { parse_mode: 'HTML' });
		// Set a flag so the next text message from this admin is treated as broadcast text
		pendingBroadcasts.set(adminId, '__awaiting__');
		return;
	}

	// Show preview
	pendingBroadcasts.set(adminId, text);
	await ctx.reply(MESSAGES.BROADCAST_CONFIRM.replace('{text}', text), {
		parse_mode: 'HTML',
		reply_markup: createConfirmKeyboard('broadcast_confirm', 'broadcast_cancel'),
	});
});

// Handle text input for broadcast (when admin sent /broadcast without text)
composer.on('message:text', async (ctx, next) => {
	const adminId = ctx.from?.id;
	if (!adminId || !isAdminId(adminId, ctx.env)) {
		return next();
	}

	const pending = pendingBroadcasts.get(adminId);
	if (pending !== '__awaiting__') {
		return next();
	}

	const text = ctx.message.text;
	if (text.startsWith('/')) {
		// User sent another command, cancel
		pendingBroadcasts.delete(adminId);
		return next();
	}

	pendingBroadcasts.set(adminId, text);
	await ctx.reply(MESSAGES.BROADCAST_CONFIRM.replace('{text}', text), {
		parse_mode: 'HTML',
		reply_markup: createConfirmKeyboard('broadcast_confirm', 'broadcast_cancel'),
	});
});

// Confirm broadcast callback
composer.callbackQuery('broadcast_confirm', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId || !isAdminId(adminId, ctx.env)) {
		await ctx.answerCallbackQuery({ text: 'Unauthorized' });
		return;
	}

	const text = pendingBroadcasts.get(adminId);
	if (!text || text === '__awaiting__') {
		await ctx.answerCallbackQuery({ text: 'No message to broadcast' });
		return;
	}

	pendingBroadcasts.delete(adminId);
	await ctx.answerCallbackQuery({ text: 'Broadcasting...' });

	try {
		const subscribers = await fetchFromApi<Array<{ chat_id: number }>>('/subscriptions', ctx.env.API_BASE_URL, ctx.env.API);

		let sentCount = 0;
		for (const sub of subscribers) {
			try {
				await ctx.api.sendMessage(sub.chat_id, text, { parse_mode: 'HTML' });
				sentCount++;
			} catch (err) {
				console.error(`Failed to send broadcast to ${sub.chat_id}:`, err);
			}
		}

		trackActivity(ctx, 'broadcast', `sent to ${sentCount} subscribers`, 30);

		await ctx.editMessageText(MESSAGES.BROADCAST_SENT.replace('{count}', String(sentCount)), {
			parse_mode: 'HTML',
		});
	} catch (error) {
		console.error('Error broadcasting:', error);
		await ctx.reply('Failed to broadcast. Please try again.');
	}
});

// Cancel broadcast callback
composer.callbackQuery('broadcast_cancel', async (ctx) => {
	const adminId = ctx.from?.id;
	if (adminId) {
		pendingBroadcasts.delete(adminId);
	}
	await ctx.answerCallbackQuery({ text: 'Cancelled' });
	await ctx.editMessageText(MESSAGES.BROADCAST_CANCELLED);
});

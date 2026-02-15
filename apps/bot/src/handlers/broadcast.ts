import { GrammyError } from 'grammy';
import { Composer } from 'grammy/web';
import { getAllActiveSubscribers } from '../db';
import { isAdminId } from '../config';
import { MESSAGES } from '../constants';
import { createConfirmKeyboard } from '../keyboards';
import { trackActivity } from '../tracking';
import type { MyContext } from '../types';

const BROADCAST_BATCH_SIZE = 25;
const BROADCAST_BATCH_DELAY_MS = 1000;

export const composer = new Composer<MyContext>();

export default composer;

// /broadcast command — requires text inline with the command
composer.command('broadcast', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId || !isAdminId(adminId, ctx.env)) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const text = ctx.match?.trim();

	if (!text) {
		await ctx.reply('📢 <b>Broadcast</b>\n\nUsage: <code>/broadcast Your message here</code>', { parse_mode: 'HTML' });
		return;
	}

	// Show preview with confirm/cancel buttons
	await ctx.reply(MESSAGES.BROADCAST_CONFIRM.replace('{text}', text), {
		parse_mode: 'HTML',
		reply_markup: createConfirmKeyboard('broadcast_confirm', 'broadcast_cancel'),
	});
});

// Confirm broadcast callback — extract text from the preview message
composer.callbackQuery('broadcast_confirm', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId || !isAdminId(adminId, ctx.env)) {
		await ctx.answerCallbackQuery({ text: 'Unauthorized' });
		return;
	}

	// Extract broadcast text from the preview message
	const messageText = ctx.callbackQuery.message?.text;
	const PREFIX = '📢 Preview:\n\n';
	const SUFFIX = '\n\nSend to all subscribers?';

	if (!messageText || !messageText.startsWith(PREFIX) || !messageText.endsWith(SUFFIX)) {
		await ctx.answerCallbackQuery({ text: 'Could not parse broadcast text' });
		return;
	}

	const text = messageText.slice(PREFIX.length, messageText.length - SUFFIX.length);
	if (!text) {
		await ctx.answerCallbackQuery({ text: 'No message to broadcast' });
		return;
	}

	await ctx.answerCallbackQuery({ text: 'Broadcasting...' });

	try {
		const subscribers = await getAllActiveSubscribers(ctx.env.DB, adminId);

		let sentCount = 0;
		for (let i = 0; i < subscribers.length; i++) {
			const sub = subscribers[i];
			try {
				await ctx.api.sendMessage(sub.chat_id, text, { parse_mode: 'HTML' });
				sentCount++;
			} catch (err) {
				console.error(`Failed to send broadcast to ${sub.chat_id}:`, err);
				// Deactivate subscription if user blocked the bot or chat is gone
				if (err instanceof GrammyError && (err.error_code === 403 || err.error_code === 400)) {
					ctx.env.DB.prepare('UPDATE subscriptions SET active = 0 WHERE chat_id = ?')
						.bind(sub.chat_id)
						.run()
						.catch(() => console.error(`Failed to deactivate subscription for ${sub.chat_id}`));
				}
			}
			// Rate limit: pause after every batch to avoid Telegram limits
			if ((i + 1) % BROADCAST_BATCH_SIZE === 0 && i + 1 < subscribers.length) {
				await new Promise((resolve) => setTimeout(resolve, BROADCAST_BATCH_DELAY_MS));
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
	if (!adminId || !isAdminId(adminId, ctx.env)) {
		await ctx.answerCallbackQuery({ text: 'Unauthorized' });
		return;
	}
	await ctx.answerCallbackQuery({ text: 'Cancelled' });
	await ctx.editMessageText(MESSAGES.BROADCAST_CANCELLED);
});

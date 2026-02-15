import { Composer } from 'grammy/web';
import { getAllActiveSubscribers } from '../db';
import { isAdminId } from '../config';
import { MESSAGES } from '../constants';
import { createConfirmKeyboard } from '../keyboards';
import { trackActivity } from '../tracking';
import type { MyContext } from '../types';

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
	if (!messageText) {
		await ctx.answerCallbackQuery({ text: 'Could not retrieve broadcast text' });
		return;
	}

	const prefix = '📢 Preview:\n\n';
	const suffix = '\n\nSend to all subscribers?';
	const startIdx = messageText.indexOf(prefix);
	const endIdx = messageText.lastIndexOf(suffix);

	if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
		await ctx.answerCallbackQuery({ text: 'Could not parse broadcast text' });
		return;
	}

	const text = messageText.slice(startIdx + prefix.length, endIdx);
	if (!text) {
		await ctx.answerCallbackQuery({ text: 'No message to broadcast' });
		return;
	}

	await ctx.answerCallbackQuery({ text: 'Broadcasting...' });

	try {
		const subscribers = await getAllActiveSubscribers(ctx.env.DB, adminId);

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
	await ctx.answerCallbackQuery({ text: 'Cancelled' });
	await ctx.editMessageText(MESSAGES.BROADCAST_CANCELLED);
});

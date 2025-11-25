import { Composer } from 'grammy/web';
import { InlineKeyboard } from 'grammy';
import { type ApiResponse, type Bot, type BotSubmission, type UserInfo, fetchFromApi, postToApi, putToApi } from '../api';
import { isAdminId } from '../config';
import { CATEGORIES, CATEGORY_NAMES, MESSAGES } from '../constants';
import { createAdminKeyboard } from '../keyboards';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

// Helper to check if user is admin (checks config first, then database)
async function isAdmin(ctx: MyContext): Promise<boolean> {
	const userId = ctx.from?.id;
	if (!userId) return false;

	// Check config first (hardcoded admins)
	if (isAdminId(userId)) {
		return true;
	}

	// Fall back to database check
	try {
		const result = await fetchFromApi<{ is_admin: boolean }>(`/admin/check/${userId}`, ctx.env.API_BASE_URL, ctx.env.API);
		return result.is_admin;
	} catch {
		return false;
	}
}

const PENDING_LIMIT = 5;

const resolveCategoryId = (input: string): number | null => {
	const trimmed = input.trim();

	if (!trimmed) return null;

	const numeric = Number.parseInt(trimmed, 10);
	if (!Number.isNaN(numeric) && CATEGORY_NAMES[numeric]) {
		return numeric;
	}

	const normalized = trimmed.toLowerCase();
	const match = CATEGORIES.find((cat) => cat.name.toLowerCase().includes(normalized));
	return match?.id ?? null;
};

const formatSubmissionText = (submission: BotSubmission, index: number) => {
	const category = CATEGORY_NAMES[submission.category_id] || 'Uncategorized';
	const submitter =
		submission.submitter_username != null
			? `@${submission.submitter_username}`
			: submission.submitter_telegram_id
				? `ID ${submission.submitter_telegram_id}`
				: 'Unknown';
	const description =
		submission.description && submission.description.length > 180
			? `${submission.description.slice(0, 177)}...`
			: submission.description || 'No description provided.';

	return `${index + 1}) <b>${submission.name}</b> (@${submission.username})\nCategory: ${category}\nFrom: ${submitter}\n${description}`;
};

const buildSubmissionsKeyboard = (submissions: BotSubmission[]) => {
	const keyboard = new InlineKeyboard();

	for (const submission of submissions) {
		keyboard.row(
			{ text: `✅ @${submission.username}`, callback_data: `admin:approve:${submission.id}:${submission.username}` },
			{ text: '❌ Reject', callback_data: `admin:reject:${submission.id}:${submission.username}` },
		);
	}

	keyboard.row({ text: '🔄 Refresh', callback_data: 'admin:review' }, { text: '⬅️ Back', callback_data: 'admin:panel' });

	return keyboard;
};

const renderPendingSubmissions = async (ctx: MyContext, adminId: number, preferEdit = false) => {
	try {
		const submissions = await fetchFromApi<BotSubmission[]>(
			`/admin/submissions/pending?admin_id=${adminId}&limit=${PENDING_LIMIT}`,
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		const hasPending = submissions.length > 0;
		const keyboard = hasPending ? buildSubmissionsKeyboard(submissions) : createAdminKeyboard();

		const listText = hasPending
			? `${MESSAGES.ADMIN_REVIEW_INTRO}\n\n${submissions
					.map((submission, index) => formatSubmissionText(submission, index))
					.join('\n\n')}\n\nShowing up to ${PENDING_LIMIT} pending items.`
			: MESSAGES.ADMIN_REVIEW_EMPTY;

		if (preferEdit) {
			try {
				await ctx.editMessageText(listText, {
					parse_mode: 'HTML',
					reply_markup: keyboard,
				});
			} catch (error) {
				console.debug('Falling back to sending new message for pending submissions:', error);
				await ctx.reply(listText, {
					parse_mode: 'HTML',
					reply_markup: keyboard,
				});
			}
		} else {
			await ctx.reply(listText, {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
		}
	} catch (error) {
		console.error('Error fetching pending submissions:', error);

		if (preferEdit) {
			await ctx.answerCallbackQuery({ text: 'Failed to load submissions', show_alert: true });
		} else {
			await ctx.reply("Sorry, I couldn't load pending submissions. Please try again later.");
		}
	}
};

const handleSubmissionDecision = async (
	ctx: MyContext,
	decision: 'approve' | 'reject',
	submissionId: number,
	adminId: number,
	usernameHint?: string,
) => {
	try {
		if (decision === 'approve') {
			const result = await postToApi<Bot | ApiResponse>(
				`/admin/submissions/${submissionId}/approve`,
				{ admin_telegram_id: adminId },
				ctx.env.API_BASE_URL,
				ctx.env.API,
			);

			if ('error' in result) {
				await ctx.answerCallbackQuery({ text: result.error, show_alert: true });
				if (result.error.toLowerCase().includes('processed') || result.error.toLowerCase().includes('not found')) {
					await renderPendingSubmissions(ctx, adminId, true);
				}
				return;
			}

			const bot = result as Bot;

			await ctx.answerCallbackQuery({ text: 'Approved ✅' });

			await ctx.reply(
				`${MESSAGES.ADMIN_APPROVE_SUCCESS}\n<b>${bot.name}</b> (@${bot.username})\nCategory: ${CATEGORY_NAMES[bot.category_id] || 'Uncategorized'}`,
				{ parse_mode: 'HTML' },
			);

			await renderPendingSubmissions(ctx, adminId, true);
		} else {
			const result = await postToApi<ApiResponse>(
				`/admin/submissions/${submissionId}/reject`,
				{ admin_telegram_id: adminId },
				ctx.env.API_BASE_URL,
				ctx.env.API,
			);

			if (result.error) {
				await ctx.answerCallbackQuery({ text: result.error, show_alert: true });
				if (result.error.toLowerCase().includes('processed') || result.error.toLowerCase().includes('not found')) {
					await renderPendingSubmissions(ctx, adminId, true);
				}
				return;
			}

			await ctx.answerCallbackQuery({ text: 'Rejected ❌' });
			await ctx.reply(`${MESSAGES.ADMIN_REJECT_SUCCESS}${usernameHint ? ` (@${usernameHint})` : ''}`);
			await renderPendingSubmissions(ctx, adminId, true);
		}
	} catch (error) {
		console.error(`Error while processing submission ${decision}:`, error);
		await ctx.answerCallbackQuery({ text: 'Action failed', show_alert: true });
	}
};

// /admin command - Admin panel entrypoint
composer.command('admin', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	await ctx.reply(MESSAGES.ADMIN_PANEL, {
		parse_mode: 'HTML',
		reply_markup: createAdminKeyboard(),
	});
});

composer.callbackQuery(/^admin:(.+)$/, async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.answerCallbackQuery({ text: 'No user found', show_alert: true });
		return;
	}

	if (!(await isAdmin(ctx))) {
		await ctx.answerCallbackQuery({ text: 'Admins only', show_alert: true });
		return;
	}

	const action = ctx.match?.[1] ?? '';

	if (action.startsWith('approve:') || action.startsWith('reject:')) {
		const [, idPart, usernameHint] = action.split(':');
		const submissionId = Number.parseInt(idPart, 10);

		if (Number.isNaN(submissionId)) {
			await ctx.answerCallbackQuery({ text: 'Invalid submission', show_alert: true });
			return;
		}

		await handleSubmissionDecision(ctx, action.startsWith('approve:') ? 'approve' : 'reject', submissionId, adminId, usernameHint);
		return;
	}

	const replyWithPanel = async (text: string) => {
		await ctx.reply(text, {
			parse_mode: 'HTML',
			reply_markup: createAdminKeyboard(),
		});
	};

	switch (action) {
		case 'panel':
			await replyWithPanel(MESSAGES.ADMIN_PANEL);
			break;
		case 'userinfo':
			await replyWithPanel('Send <code>/userinfo &lt;userId&gt;</code> to view a user profile and their submissions.');
			break;
		case 'ban':
			await replyWithPanel('Send <code>/ban &lt;userId&gt;</code> to ban a user.');
			break;
		case 'unban':
			await replyWithPanel('Send <code>/unban &lt;userId&gt;</code> to unban a user.');
			break;
		case 'addbot':
			await replyWithPanel(
				`${MESSAGES.ADMIN_ADD_USAGE}\nUse "|" to separate fields. Example:\n<code>/addbot @mybot | My Bot | Does awesome things | 1</code>`,
			);
			break;
		case 'updatebot':
			await replyWithPanel(
				`${MESSAGES.ADMIN_UPDATE_USAGE}\nUse "-" to keep a field unchanged. Example:\n<code>/updatebot @mybot | - | Updated description | 2</code>`,
			);
			break;
		case 'review':
			await renderPendingSubmissions(ctx, adminId, true);
			await ctx.answerCallbackQuery();
			return;
		default:
			await ctx.answerCallbackQuery({ text: 'Unknown admin action', show_alert: true });
			return;
	}

	await ctx.answerCallbackQuery();
});

// /addbot command
composer.command('addbot', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const input = ctx.match?.trim();
	if (!input) {
		await ctx.reply(MESSAGES.ADMIN_ADD_USAGE);
		return;
	}

	const parts = input.split('|').map((part) => part.trim()).filter(Boolean);

	if (parts.length < 4) {
		await ctx.reply(MESSAGES.ADMIN_ADD_USAGE);
		return;
	}

	const [rawUsername, name, description, categoryInput] = parts;
	const username = rawUsername.replace(/^@+/, '');

	if (!username || !name || !description || !categoryInput) {
		await ctx.reply(MESSAGES.ADMIN_ADD_USAGE);
		return;
	}

	const categoryId = resolveCategoryId(categoryInput);
	if (!categoryId) {
		await ctx.reply(MESSAGES.ADMIN_CATEGORY_INVALID);
		return;
	}

	try {
		const result = await postToApi<Bot | ApiResponse>(
			'/admin/bots',
			{
				username,
				name,
				description,
				category_id: categoryId,
				admin_telegram_id: adminId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if ('error' in result) {
			if (result.error.includes('already in the BotList') || result.error.includes('already exists')) {
				await ctx.reply(MESSAGES.ADMIN_ADD_EXISTS);
			} else if (result.error.toLowerCase().includes('category')) {
				await ctx.reply(MESSAGES.ADMIN_CATEGORY_INVALID);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(
			`${MESSAGES.ADMIN_ADD_SUCCESS}\n<b>${result.name}</b> (@${result.username})\nCategory: ${CATEGORY_NAMES[result.category_id] || 'Uncategorized'}`,
			{ parse_mode: 'HTML' },
		);
	} catch (error) {
		console.error('Error in /addbot command:', error);
		await ctx.reply("Sorry, I couldn't add the bot. Please try again later.");
	}
});

// /updatebot command
composer.command('updatebot', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const input = ctx.match?.trim();
	if (!input) {
		await ctx.reply(MESSAGES.ADMIN_UPDATE_USAGE);
		return;
	}

	const parts = input.split('|').map((part) => part.trim());
	if (parts.length < 2) {
		await ctx.reply(MESSAGES.ADMIN_UPDATE_USAGE);
		return;
	}

	const [rawUsername, name, description, categoryInput] = parts;
	const username = rawUsername.replace(/^@+/, '');

	if (!username) {
		await ctx.reply(MESSAGES.ADMIN_UPDATE_USAGE);
		return;
	}

	const payload: Record<string, unknown> = {
		admin_telegram_id: adminId,
	};

	if (name && name !== '-') {
		payload.name = name;
	}

	if (description !== undefined && description !== '-') {
		payload.description = description || '';
	}

	if (categoryInput && categoryInput !== '-') {
		const categoryId = resolveCategoryId(categoryInput);
		if (!categoryId) {
			await ctx.reply(MESSAGES.ADMIN_CATEGORY_INVALID);
			return;
		}
		payload.category_id = categoryId;
	}

	if (Object.keys(payload).length === 1) {
		await ctx.reply(MESSAGES.ADMIN_UPDATE_NO_CHANGES);
		return;
	}

	try {
		const result = await putToApi<Bot | ApiResponse>(
			`/admin/bots/username/${username}`,
			payload,
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if ('error' in result) {
			if (result.error.toLowerCase().includes('not found')) {
				await ctx.reply('❌ Bot not found.');
			} else if (result.error.toLowerCase().includes('category')) {
				await ctx.reply(MESSAGES.ADMIN_CATEGORY_INVALID);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(
			`${MESSAGES.ADMIN_UPDATE_SUCCESS}\n<b>${result.name}</b> (@${result.username})\nCategory: ${CATEGORY_NAMES[result.category_id] || 'Uncategorized'}`,
			{ parse_mode: 'HTML' },
		);
	} catch (error) {
		console.error('Error in /updatebot command:', error);
		await ctx.reply("Sorry, I couldn't update the bot. Please try again later.");
	}
});

// /review command - show pending submissions
composer.command('review', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	await renderPendingSubmissions(ctx, adminId);
});

// /ban command
composer.command('ban', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	// Check if user is admin
	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const userIdStr = ctx.match?.trim();
	if (!userIdStr) {
		await ctx.reply(MESSAGES.ADMIN_BAN_USAGE);
		return;
	}

	const userId = Number.parseInt(userIdStr, 10);
	if (Number.isNaN(userId)) {
		await ctx.reply(MESSAGES.ADMIN_BAN_USAGE);
		return;
	}

	try {
		const result = await postToApi<ApiResponse>(
			'/admin/ban',
			{
				user_id: userId,
				admin_telegram_id: adminId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if (result.error) {
			await ctx.reply(`Error: ${result.error}`);
			return;
		}

		await ctx.reply(`${MESSAGES.ADMIN_BAN_SUCCESS}\nUser ID: <code>${userId}</code>`, {
			parse_mode: 'HTML',
		});
	} catch (error) {
		console.error('Error in /ban command:', error);
		await ctx.reply("Sorry, I couldn't ban the user. Please try again later.");
	}
});

// /unban command
composer.command('unban', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	// Check if user is admin
	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const userIdStr = ctx.match?.trim();
	if (!userIdStr) {
		await ctx.reply(MESSAGES.ADMIN_UNBAN_USAGE);
		return;
	}

	const userId = Number.parseInt(userIdStr, 10);
	if (Number.isNaN(userId)) {
		await ctx.reply(MESSAGES.ADMIN_UNBAN_USAGE);
		return;
	}

	try {
		const result = await postToApi<ApiResponse>(
			'/admin/unban',
			{
				user_id: userId,
				admin_telegram_id: adminId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if (result.error) {
			if (result.error.includes('not found')) {
				await ctx.reply(MESSAGES.ADMIN_UNBAN_NOT_FOUND);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(`${MESSAGES.ADMIN_UNBAN_SUCCESS}\nUser ID: <code>${userId}</code>`, {
			parse_mode: 'HTML',
		});
	} catch (error) {
		console.error('Error in /unban command:', error);
		await ctx.reply("Sorry, I couldn't unban the user. Please try again later.");
	}
});

// /userinfo command
composer.command('userinfo', async (ctx) => {
	const adminId = ctx.from?.id;
	if (!adminId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	// Check if user is admin
	if (!(await isAdmin(ctx))) {
		await ctx.reply(MESSAGES.ADMIN_UNAUTHORIZED);
		return;
	}

	const userIdStr = ctx.match?.trim();
	if (!userIdStr) {
		await ctx.reply(MESSAGES.ADMIN_USERINFO_USAGE);
		return;
	}

	const userId = Number.parseInt(userIdStr, 10);
	if (Number.isNaN(userId)) {
		await ctx.reply(MESSAGES.ADMIN_USERINFO_USAGE);
		return;
	}

	try {
		const result = await fetchFromApi<UserInfo | { error: string }>(
			`/admin/userinfo/${userId}?admin_id=${adminId}`,
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if ('error' in result) {
			if (result.error.includes('not found')) {
				await ctx.reply(MESSAGES.ADMIN_USERINFO_NOT_FOUND);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		const { user, submitted_bots, pending_submissions, spam_reports } = result;

		let message = '<b>User Info</b>\n\n';
		message += `<b>Telegram ID:</b> <code>${user.telegram_id}</code>\n`;
		message += `<b>Username:</b> ${user.username ? `@${user.username}` : 'Not set'}\n`;
		message += `<b>First Name:</b> ${user.first_name || 'Not set'}\n`;
		message += `<b>Status:</b> ${user.banned ? 'Banned' : 'Active'}\n`;
		message += `<b>Admin:</b> ${user.is_admin ? 'Yes' : 'No'}\n`;
		message += `<b>Joined:</b> ${user.created_at}\n\n`;

		message += `<b>Submitted Bots (${submitted_bots.length}):</b>\n`;
		if (submitted_bots.length > 0) {
			message += submitted_bots.map((bot) => `• @${bot.username}`).join('\n');
		} else {
			message += 'None';
		}
		message += '\n\n';

		message += `<b>Pending Submissions (${pending_submissions.length}):</b>\n`;
		if (pending_submissions.length > 0) {
			message += pending_submissions.map((bot) => `• @${bot.username}`).join('\n');
		} else {
			message += 'None';
		}
		message += '\n\n';

		message += `<b>Spam Reports Made (${spam_reports.length}):</b>\n`;
		if (spam_reports.length > 0) {
			message += spam_reports.map((report) => `• @${report.bot_username}`).join('\n');
		} else {
			message += 'None';
		}

		await ctx.reply(message, {
			parse_mode: 'HTML',
		});
	} catch (error) {
		console.error('Error in /userinfo command:', error);
		await ctx.reply("Sorry, I couldn't fetch user info. Please try again later.");
	}
});

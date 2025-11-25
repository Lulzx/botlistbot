import { Composer } from 'grammy/web';
import { type ApiResponse, type UserInfo, fetchFromApi, postToApi } from '../api';
import { isAdminId } from '../config';
import { MESSAGES } from '../constants';
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

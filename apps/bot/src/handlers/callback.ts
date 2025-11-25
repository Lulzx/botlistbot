import { Composer } from 'grammy/web';
import { GrammyError } from 'grammy';
import { type ApiResponse, type Bot, deleteFromApi, fetchFromApi } from '../api';
import type { MyContext } from '../types';
import { CATEGORY_NAMES, MESSAGES } from './../constants';
import {
	createCategoriesKeyboard,
	createEmptyFavoritesKeyboard,
	createExploreKeyboard,
	createFavoritesKeyboard,
	createMainKeyboard,
} from './../keyboards';

export const composer = new Composer<MyContext>();

export default composer;

const safeEditMessageText = async (ctx: MyContext, text: string, options?: Parameters<MyContext['editMessageText']>[1]) => {
	try {
		await ctx.editMessageText(text, options);
	} catch (error) {
		if (error instanceof GrammyError && error.description?.includes('message is not modified')) {
			console.debug('editMessageText skipped: message not modified');
			return;
		}
		throw error;
	}
};

composer.on('callback_query:data', async (ctx) => {
	try {
		const data = ctx.callbackQuery.data;

		if (data.startsWith('category:')) {
			await ctx.answerCallbackQuery();
			const categoryId = Number.parseInt(data.split(':')[1], 10);

			if (Number.isNaN(categoryId)) {
				await ctx.reply('Invalid category selection. Please try again.');
				return;
			}

			if (!(categoryId in CATEGORY_NAMES)) {
				await ctx.reply('Category not found. Please try again.');
				return;
			}

			try {
				await ctx.reply('⏳ Fetching bots...');

				const categoryName = CATEGORY_NAMES[categoryId];

				const bots = await fetchFromApi<Bot[]>(`/bots/category/${categoryId}`, ctx.env.API_BASE_URL, ctx.env.API);

				if (bots.length === 0) {
					await ctx.reply(`🤷 No bots found in ${categoryName}.`);
				} else {
					const botList = bots.map((bot) => `• @${bot.username} - ${bot.name}`).join('\n');
					await ctx.reply(`🤖 Bots in ${categoryName} (${bots.length} found):\n\n${botList}`);
				}
			} catch (fetchError) {
				console.error(`Failed to fetch bots for category ${categoryId}:`, fetchError);
				await ctx.reply("Sorry, I couldn't fetch the bots for this category. Please try again later.");
			}
			return;
		}

		// Handle show_categories callback
		if (data === 'show_categories') {
			const keyboard = await createCategoriesKeyboard(ctx);
			await safeEditMessageText(ctx, '📂 <b>Bot Categories</b>\n\nSelect a category to browse bots:', {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
			await ctx.answerCallbackQuery();
			return;
		}

		// Handle favorites callbacks
		if (data === 'fav_refresh') {
			const userId = ctx.from?.id;
			if (!userId) {
				await ctx.answerCallbackQuery({ text: 'Could not identify user' });
				return;
			}

			const favorites = await fetchFromApi<Bot[]>(`/users/${userId}/favorites`, ctx.env.API_BASE_URL, ctx.env.API);

			if (favorites.length === 0) {
				await safeEditMessageText(ctx, MESSAGES.FAVORITES_EMPTY, {
					parse_mode: 'HTML',
					reply_markup: createEmptyFavoritesKeyboard(),
				});
			} else {
				const botList = favorites.map((bot) => `• <b>@${bot.username}</b> - ${bot.name}`).join('\n');
				await safeEditMessageText(ctx, `${MESSAGES.FAVORITES_INTRO}\n\n${botList}`, {
					parse_mode: 'HTML',
					reply_markup: createFavoritesKeyboard(favorites),
				});
			}
			await ctx.answerCallbackQuery({ text: 'Refreshed!' });
			return;
		}

		if (data === 'fav_add') {
			await ctx.answerCallbackQuery();
			await ctx.reply(`${MESSAGES.FAVORITES_ADD_PROMPT}\n\nUse /favorite @username to add one instantly.`);
			return;
		}

		if (data.startsWith('fav_remove:')) {
			const botUsername = data.split(':')[1];
			const userId = ctx.from?.id;

			if (!userId) {
				await ctx.answerCallbackQuery({ text: 'Could not identify user' });
				return;
			}

			const result = await deleteFromApi<ApiResponse>(`/users/${userId}/favorites/${botUsername}`, ctx.env.API_BASE_URL, ctx.env.API);

			if (result.error) {
				await ctx.answerCallbackQuery({ text: result.error });
				return;
			}

			// Refresh the favorites list
			const favorites = await fetchFromApi<Bot[]>(`/users/${userId}/favorites`, ctx.env.API_BASE_URL, ctx.env.API);

			if (favorites.length === 0) {
				await safeEditMessageText(ctx, MESSAGES.FAVORITES_EMPTY, {
					parse_mode: 'HTML',
					reply_markup: createEmptyFavoritesKeyboard(),
				});
			} else {
				const botList = favorites.map((bot) => `• <b>@${bot.username}</b> - ${bot.name}`).join('\n');
				await safeEditMessageText(ctx, `${MESSAGES.FAVORITES_INTRO}\n\n${botList}`, {
					parse_mode: 'HTML',
					reply_markup: createFavoritesKeyboard(favorites),
				});
			}

			await ctx.answerCallbackQuery({ text: MESSAGES.FAVORITES_REMOVED });
			return;
		}

		// Handle explore callbacks
		if (data === 'explore_more') {
			const bots = await fetchFromApi<Bot[]>('/bots/random?limit=5', ctx.env.API_BASE_URL, ctx.env.API);

			if (bots.length === 0) {
				await ctx.answerCallbackQuery({ text: 'No bots available' });
				return;
			}

			const botList = bots
				.map(
					(bot) =>
						`• <b>@${bot.username}</b> - ${bot.name}\n  ${bot.description?.slice(0, 100) || 'No description'}${bot.description && bot.description.length > 100 ? '...' : ''}`,
				)
				.join('\n\n');

			await safeEditMessageText(ctx, `${MESSAGES.EXPLORE_INTRO}\n\n${botList}`, {
				parse_mode: 'HTML',
				reply_markup: createExploreKeyboard(bots),
			});
			await ctx.answerCallbackQuery();
			return;
		}

		if (data === 'explore_fav') {
			await ctx.answerCallbackQuery({ text: 'Send me @username to add to favorites' });
			await ctx.reply(`${MESSAGES.FAVORITES_ADD_PROMPT}\n\nUse /favorite @username to add one instantly.`);
			return;
		}

		if (data === 'search_more') {
			const messageText = ctx.callbackQuery.message?.text;
			const queryMatch = messageText?.match(/for "(.+?)":/);
			const query = queryMatch?.[1];

			if (!query) {
				await ctx.answerCallbackQuery({ text: 'Could not find your search query. Please run /search again.' });
				return;
			}

			const searchParams = new URLSearchParams();
			searchParams.append('name', query);
			searchParams.append('description', query);

			const bots = await fetchFromApi<Bot[]>(`/search?${searchParams.toString()}`, ctx.env.API_BASE_URL, ctx.env.API);

			if (bots.length <= 10) {
				await ctx.answerCallbackQuery({ text: 'No more results' });
				return;
			}

			const remaining = bots.slice(10, 30);
			const botList = remaining
				.map((bot, index) => `${index + 11}. <b>@${bot.username}</b> - ${bot.name}`)
				.join('\n');

			const leftoverCount = bots.length - 10 - remaining.length;
			const extraNote = leftoverCount > 0 ? `\n\n...and ${leftoverCount} more. Refine your query to narrow results.` : '';

			try {
				await ctx.editMessageReplyMarkup();
			} catch (error) {
				console.debug('Failed to clear inline keyboard for search results:', error);
			}

			await ctx.reply(`More results for "<b>${query}</b>":\n\n${botList}${extraNote}`, {
				parse_mode: 'HTML',
			});
			await ctx.answerCallbackQuery();
			return;
		}

		// Handle cancel action
		if (data === 'cancel_action') {
			await ctx.deleteMessage();
			await ctx.answerCallbackQuery({ text: 'Cancelled' });
			return;
		}

		const messageMap = {
			help: MESSAGES.HELP,
			contributing: MESSAGES.CONTRIBUTING,
			examples: MESSAGES.EXAMPLES,
			try_inline: MESSAGES.TRY_INLINE,
		} as const;

		const message = messageMap[data as keyof typeof messageMap];

		if (message) {
			await safeEditMessageText(ctx, message, {
				parse_mode: 'HTML',
				reply_markup: createMainKeyboard(),
			});
			await ctx.answerCallbackQuery();
		} else {
			await ctx.answerCallbackQuery({ text: 'Unknown action' });
		}
	} catch (error) {
		console.error('Error in callback query handler:', error);
		await ctx.answerCallbackQuery({ text: 'An error occurred' });
	}
});

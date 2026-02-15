import { GrammyError, InlineKeyboard } from 'grammy';
import { Composer } from 'grammy/web';
import {
	type Bot,
	type UserSubmissions,
	getUserFavorites,
	removeFavorite,
	getRandomBots,
	searchBots,
	getBotsByCategory,
	getUserSubmissions,
	createSuggestion,
} from '../db';
import type { MyContext } from '../types';
import { CATEGORY_NAMES, EASTER_EGG_ADJECTIVES, EASTER_EGG_ENDINGS, EASTER_EGG_NOUNS, MESSAGES, buildSearchOpts, escapeHtml, pick } from './../constants';
import {
	createCategoriesKeyboard,
	createEmptyFavoritesKeyboard,
	createExploreKeyboard,
	createFavoritesKeyboard,
	createInlineSearchKeyboard,
	createMainKeyboard,
	createMyBotsKeyboard,
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

				const bots = await getBotsByCategory(ctx.env.DB, categoryId);

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
			const keyboard = createCategoriesKeyboard();
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

			try {
				const favorites = await getUserFavorites(ctx.env.DB, userId);

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
			} catch (error) {
				console.error('Error refreshing favorites:', error);
				await ctx.answerCallbackQuery({ text: 'Failed to refresh favorites' });
			}
			return;
		}

		if (data.startsWith('fav_page:')) {
			const page = Number.parseInt(data.split(':')[1], 10);
			const userId = ctx.from?.id;
			if (!userId || Number.isNaN(page)) {
				await ctx.answerCallbackQuery({ text: 'Could not load page' });
				return;
			}

			try {
				const favorites = await getUserFavorites(ctx.env.DB, userId);

				if (favorites.length === 0) {
					await safeEditMessageText(ctx, MESSAGES.FAVORITES_EMPTY, {
						parse_mode: 'HTML',
						reply_markup: createEmptyFavoritesKeyboard(),
					});
				} else {
					const botList = favorites.map((bot) => `• <b>@${bot.username}</b> - ${bot.name}`).join('\n');
					await safeEditMessageText(ctx, `${MESSAGES.FAVORITES_INTRO}\n\n${botList}`, {
						parse_mode: 'HTML',
						reply_markup: createFavoritesKeyboard(favorites, page),
					});
				}
				await ctx.answerCallbackQuery();
			} catch (error) {
				console.error('Error loading favorites page:', error);
				await ctx.answerCallbackQuery({ text: 'Failed to load favorites' });
			}
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

			try {
				const result = await removeFavorite(ctx.env.DB, userId, botUsername);

				if (result.error) {
					await ctx.answerCallbackQuery({ text: result.error });
					return;
				}

				// Refresh the favorites list
				const favorites = await getUserFavorites(ctx.env.DB, userId);

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
			} catch (error) {
				console.error('Error removing favorite:', error);
				await ctx.answerCallbackQuery({ text: 'Failed to remove favorite' });
			}
			return;
		}

		// Handle explore callbacks
		if (data === 'explore_more') {
			try {
				const bots = await getRandomBots(ctx.env.DB, 5);

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
			} catch (error) {
				console.error('Error loading explore bots:', error);
				await ctx.answerCallbackQuery({ text: 'Failed to load bots' });
			}
			return;
		}

		if (data === 'explore_fav') {
			await ctx.answerCallbackQuery();
			await ctx.reply('Use /favorite @username to add a bot to your favorites.');
			return;
		}

		if (data === 'search_more' || data.startsWith('search_more:')) {
			const query = data.startsWith('search_more:') ? decodeURIComponent(data.replace('search_more:', '')) : undefined;

			if (!query) {
				await ctx.answerCallbackQuery({ text: 'Could not find your search query. Please run /search again.' });
				return;
			}

			const bots = await searchBots(ctx.env.DB, buildSearchOpts(query));

			if (bots.length <= 10) {
				await ctx.answerCallbackQuery({ text: 'No more results' });
				return;
			}

			const remaining = bots.slice(10, 30);
			const botList = remaining.map((bot, index) => `${index + 11}. <b>@${bot.username}</b> - ${bot.name}`).join('\n');

			const leftoverCount = bots.length - 10 - remaining.length;
			const extraNote = leftoverCount > 0 ? `\n\n...and ${leftoverCount} more. Refine your query to narrow results.` : '';

			try {
				await ctx.editMessageReplyMarkup();
			} catch (error) {
				console.debug('Failed to clear inline keyboard for search results:', error);
			}

			await ctx.reply(`More results for "<b>${escapeHtml(query)}</b>":\n\n${botList}${extraNote}`, {
				parse_mode: 'HTML',
				reply_markup: createInlineSearchKeyboard(query),
			});
			await ctx.answerCallbackQuery();
			return;
		}

		// Handle suggestion action callbacks (suggest:username:action)
		if (data.startsWith('suggest:')) {
			const parts = data.split(':');
			if (parts.length >= 3) {
				const botUsername = parts[1];
				const action = parts[2];
				const userId = ctx.from?.id;

				if (!userId) {
					await ctx.answerCallbackQuery({ text: 'Could not identify user' });
					return;
				}

				// For value-less actions (offline, spam, inlinequeries), submit directly
				const directActions = ['offline', 'spam', 'inlinequeries'];
				if (directActions.includes(action)) {
					try {
						const result = await createSuggestion(ctx.env.DB, userId, botUsername, action, 'true');

						if (result.error) {
							await ctx.answerCallbackQuery({ text: result.error, show_alert: true });
							return;
						}

						await ctx.answerCallbackQuery({ text: MESSAGES.SUGGEST_SUCCESS });
						await ctx.editMessageText(MESSAGES.SUGGEST_SUCCESS, { parse_mode: 'HTML' });
					} catch (error) {
						console.error('Error submitting suggestion:', error);
						await ctx.answerCallbackQuery({ text: 'Failed to submit suggestion', show_alert: true });
					}
					return;
				}

				// For value-based actions, prompt for text input
				await ctx.answerCallbackQuery();

				const actionLabel =
					action === 'add_keyword' ? 'keyword to add' : action === 'remove_keyword' ? 'keyword to remove' : action;

				await ctx.editMessageText(
					`${MESSAGES.SUGGEST_ENTER_VALUE.replace('{action}', actionLabel).replace('{username}', botUsername)}\n\n<i>Reply to this message with the new value.</i>`,
					{ parse_mode: 'HTML' },
				);
			}
			return;
		}

		// Handle easteregg_more callback
		if (data === 'easteregg_more') {
			const names: string[] = [];
			for (let i = 0; i < 5; i++) {
				const adj = pick(EASTER_EGG_ADJECTIVES);
				const noun = pick(EASTER_EGG_NOUNS);
				const ending = pick(EASTER_EGG_ENDINGS);
				names.push(`@${adj}${noun}${ending}`);
			}

			const keyboard = new InlineKeyboard();
			for (const name of names) {
				keyboard.row({ text: name, url: `https://t.me/${name.replace('@', '')}` });
			}
			keyboard.row({ text: '🎲 Generate More', callback_data: 'easteregg_more' });

			await safeEditMessageText(ctx, `🥚 <b>Your random bot name ideas:</b>\n\n${names.join('\n')}`, {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
			await ctx.answerCallbackQuery();
			return;
		}

		// Handle mybots_stats callback
		if (data === 'mybots_stats') {
			const userId = ctx.from?.id;
			if (!userId) {
				await ctx.answerCallbackQuery({ text: 'Could not identify user' });
				return;
			}

			try {
				const submissions = await getUserSubmissions(ctx.env.DB, userId);
				const { approved, pending } = submissions;

				let message = '📊 <b>Your Bot Statistics</b>\n\n';
				message += `Approved bots: ${approved.length}\n`;
				message += `Pending review: ${pending.length}\n`;

				if (approved.length > 0) {
					message += '\n<b>Your Bots:</b>\n';
					for (const bot of approved) {
						const category = CATEGORY_NAMES[bot.category_id] || 'Uncategorized';
						message += `• @${bot.username} — ${category}\n`;
					}
				}

				await safeEditMessageText(ctx, message, {
					parse_mode: 'HTML',
					reply_markup: createMyBotsKeyboard(),
				});
			} catch (error) {
				console.error('Error fetching mybots stats:', error);
				await ctx.answerCallbackQuery({ text: 'Failed to load stats', show_alert: true });
				return;
			}
			await ctx.answerCallbackQuery();
			return;
		}

		// Handle submit_new_bot callback
		if (data === 'submit_new_bot') {
			await ctx.answerCallbackQuery();
			await ctx.reply(MESSAGES.NEW_BOT_PROMPT, { parse_mode: 'HTML' });
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

import { Composer } from 'grammy/web';
import { type ApiResponse, type Bot, type UserSubmissions, deleteFromApi, fetchFromApi, postToApi } from '../api';
import { MESSAGES } from '../constants';
import {
	createBotListKeyboard,
	createCancelKeyboard,
	createCategoriesKeyboard,
	createEmptyFavoritesKeyboard,
	createExploreKeyboard,
	createFavoritesKeyboard,
	createMainKeyboard,
	createSearchResultsKeyboard,
} from '../keyboards';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

// /help command
composer.command('help', async (ctx) => {
	await ctx.reply(MESSAGES.HELP, {
		parse_mode: 'HTML',
		reply_markup: createMainKeyboard(),
	});
});

// /category command (alias for /categories)
composer.command(['category', 'categories'], async (ctx) => {
	try {
		const keyboard = await createCategoriesKeyboard(ctx);
		await ctx.reply('📂 <b>Bot Categories</b>\n\nSelect a category to browse bots:', {
			parse_mode: 'HTML',
			reply_markup: keyboard,
		});
	} catch (error) {
		console.error('Error in /category command:', error);
		await ctx.reply("Sorry, I couldn't load the categories right now. Please try again later.");
	}
});

// /explore command
composer.command('explore', async (ctx) => {
	try {
		const bots = await fetchFromApi<Bot[]>('/bots/random?limit=5', ctx.env.API_BASE_URL, ctx.env.API);

		if (bots.length === 0) {
			await ctx.reply(MESSAGES.EXPLORE_EMPTY);
			return;
		}

		const botList = bots
			.map(
				(bot) =>
					`• <b>@${bot.username}</b> - ${bot.name}\n  ${bot.description?.slice(0, 100) || 'No description'}${bot.description && bot.description.length > 100 ? '...' : ''}`,
			)
			.join('\n\n');

		await ctx.reply(`${MESSAGES.EXPLORE_INTRO}\n\n${botList}`, {
			parse_mode: 'HTML',
			reply_markup: createExploreKeyboard(bots),
		});
	} catch (error) {
		console.error('Error in /explore command:', error);
		await ctx.reply("Sorry, I couldn't fetch random bots. Please try again later.");
	}
});

// /favorites command
composer.command('favorites', async (ctx) => {
	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const favorites = await fetchFromApi<Bot[]>(`/users/${userId}/favorites`, ctx.env.API_BASE_URL, ctx.env.API);

		if (favorites.length === 0) {
			await ctx.reply(MESSAGES.FAVORITES_EMPTY, {
				parse_mode: 'HTML',
				reply_markup: createEmptyFavoritesKeyboard(),
			});
			return;
		}

		const botList = favorites.map((bot) => `• <b>@${bot.username}</b> - ${bot.name}`).join('\n');

		await ctx.reply(`${MESSAGES.FAVORITES_INTRO}\n\n${botList}`, {
			parse_mode: 'HTML',
			reply_markup: createFavoritesKeyboard(favorites),
		});
	} catch (error) {
		console.error('Error in /favorites command:', error);
		await ctx.reply("Sorry, I couldn't fetch your favorites. Please try again later.");
	}
});

// /search command
composer.command('search', async (ctx) => {
	const query = ctx.match?.trim();

	if (!query) {
		await ctx.reply(MESSAGES.SEARCH_PROMPT, {
			parse_mode: 'HTML',
			reply_markup: createCancelKeyboard(),
		});
		return;
	}

	if (query.length < 3) {
		await ctx.reply(MESSAGES.SEARCH_TOO_SHORT);
		return;
	}

	try {
		const searchParams = new URLSearchParams();
		searchParams.append('name', query);
		searchParams.append('description', query);

		const bots = await fetchFromApi<Bot[]>(`/search?${searchParams.toString()}`, ctx.env.API_BASE_URL, ctx.env.API);

		if (bots.length === 0) {
			await ctx.reply(MESSAGES.SEARCH_EMPTY);
			return;
		}

		const botList = bots
			.slice(0, 10)
			.map((bot) => `• <b>@${bot.username}</b> - ${bot.name}`)
			.join('\n');
		const moreText = bots.length > 10 ? `\n\n<i>...and ${bots.length - 10} more results</i>` : '';

		await ctx.reply(`${MESSAGES.SEARCH_RESULTS} for "<b>${query}</b>":\n\n${botList}${moreText}`, {
			parse_mode: 'HTML',
			reply_markup: createSearchResultsKeyboard(bots),
		});
	} catch (error) {
		console.error('Error in /search command:', error);
		await ctx.reply("Sorry, I couldn't perform the search. Please try again later.");
	}
});

// /new command - Submit a new bot
composer.command('new', async (ctx) => {
	const input = ctx.match?.trim();

	if (!input) {
		await ctx.reply(MESSAGES.NEW_BOT_PROMPT, {
			parse_mode: 'HTML',
		});
		return;
	}

	// Parse the input: @username - description
	const usernameMatch = input.match(/@(\w+)/);
	if (!usernameMatch) {
		await ctx.reply(MESSAGES.NEW_BOT_INVALID);
		return;
	}

	const username = usernameMatch[1];
	const descriptionPart = input
		.replace(/@\w+/, '')
		.replace(/^\s*-?\s*/, '')
		.trim();

	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const result = await postToApi<ApiResponse>(
			'/submissions',
			{
				username,
				name: username,
				description: descriptionPart || '',
				category_id: 1, // Default category
				telegram_id: userId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if (result.error) {
			if (result.error.includes('already in the BotList')) {
				await ctx.reply(MESSAGES.NEW_BOT_EXISTS);
			} else if (result.error.includes('pending review')) {
				await ctx.reply(MESSAGES.NEW_BOT_PENDING);
			} else if (result.error.includes('banned')) {
				await ctx.reply(MESSAGES.NEW_BOT_BANNED);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(MESSAGES.NEW_BOT_SUCCESS);
	} catch (error) {
		console.error('Error in /new command:', error);
		await ctx.reply("Sorry, I couldn't submit the bot. Please try again later.");
	}
});

// /spam command - Report a spammy bot
composer.command('spam', async (ctx) => {
	const input = ctx.match?.trim();

	if (!input) {
		await ctx.reply(MESSAGES.SPAM_PROMPT, {
			parse_mode: 'HTML',
		});
		return;
	}

	const usernameMatch = input.match(/@?(\w+)/);
	if (!usernameMatch) {
		await ctx.reply('Please provide a valid bot @username.');
		return;
	}

	const username = usernameMatch[1];
	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const result = await postToApi<ApiResponse>(
			'/spam-reports',
			{
				bot_username: username,
				telegram_id: userId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if (result.error) {
			if (result.error.includes('not found')) {
				await ctx.reply(MESSAGES.SPAM_NOT_FOUND);
			} else if (result.error.includes('already reported')) {
				await ctx.reply(MESSAGES.SPAM_ALREADY);
			} else if (result.error.includes('banned')) {
				await ctx.reply(MESSAGES.SPAM_BANNED);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(MESSAGES.SPAM_SUCCESS);
	} catch (error) {
		console.error('Error in /spam command:', error);
		await ctx.reply("Sorry, I couldn't submit the report. Please try again later.");
	}
});

// /offline command - Report an offline bot
composer.command('offline', async (ctx) => {
	const input = ctx.match?.trim();

	if (!input) {
		await ctx.reply(MESSAGES.OFFLINE_PROMPT, {
			parse_mode: 'HTML',
		});
		return;
	}

	const usernameMatch = input.match(/@?(\w+)/);
	if (!usernameMatch) {
		await ctx.reply('Please provide a valid bot @username.');
		return;
	}

	const username = usernameMatch[1];
	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const result = await postToApi<ApiResponse>(
			'/offline-reports',
			{
				bot_username: username,
				telegram_id: userId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if (result.error) {
			if (result.error.includes('not found')) {
				await ctx.reply(MESSAGES.OFFLINE_NOT_FOUND);
			} else if (result.error.includes('already been reported')) {
				await ctx.reply(MESSAGES.OFFLINE_ALREADY);
			} else if (result.error.includes('banned')) {
				await ctx.reply(MESSAGES.OFFLINE_BANNED);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(MESSAGES.OFFLINE_SUCCESS);
	} catch (error) {
		console.error('Error in /offline command:', error);
		await ctx.reply("Sorry, I couldn't submit the report. Please try again later.");
	}
});

// /newbots command
composer.command('newbots', async (ctx) => {
	try {
		const bots = await fetchFromApi<Bot[]>('/bots/new?limit=10', ctx.env.API_BASE_URL, ctx.env.API);

		if (bots.length === 0) {
			await ctx.reply(MESSAGES.NEWBOTS_EMPTY);
			return;
		}

		const botList = bots.map((bot, i) => `${i + 1}. <b>@${bot.username}</b> - ${bot.name}`).join('\n');

		await ctx.reply(`${MESSAGES.NEWBOTS_INTRO}\n\n${botList}`, {
			parse_mode: 'HTML',
			reply_markup: createBotListKeyboard(bots, 'newbots'),
		});
	} catch (error) {
		console.error('Error in /newbots command:', error);
		await ctx.reply("Sorry, I couldn't fetch new bots. Please try again later.");
	}
});

// /bestbots command
composer.command('bestbots', async (ctx) => {
	try {
		const bots = await fetchFromApi<Bot[]>('/bots/best?limit=10', ctx.env.API_BASE_URL, ctx.env.API);

		if (bots.length === 0) {
			await ctx.reply(MESSAGES.BESTBOTS_EMPTY);
			return;
		}

		const botList = bots
			.map((bot, i) => {
				const rating = bot.avg_rating ? ` (${Number(bot.avg_rating).toFixed(1)} stars)` : '';
				return `${i + 1}. <b>@${bot.username}</b> - ${bot.name}${rating}`;
			})
			.join('\n');

		await ctx.reply(`${MESSAGES.BESTBOTS_INTRO}\n\n${botList}`, {
			parse_mode: 'HTML',
			reply_markup: createBotListKeyboard(bots, 'bestbots'),
		});
	} catch (error) {
		console.error('Error in /bestbots command:', error);
		await ctx.reply("Sorry, I couldn't fetch best bots. Please try again later.");
	}
});

// /mybots command
composer.command('mybots', async (ctx) => {
	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const submissions = await fetchFromApi<UserSubmissions>(`/users/${userId}/submissions`, ctx.env.API_BASE_URL, ctx.env.API);

		const { approved, pending } = submissions;

		if (approved.length === 0 && pending.length === 0) {
			await ctx.reply(MESSAGES.MYBOTS_EMPTY, {
				parse_mode: 'HTML',
			});
			return;
		}

		let message = `${MESSAGES.MYBOTS_INTRO}\n\n`;

		if (approved.length > 0) {
			message += '<b>Approved Bots:</b>\n';
			message += approved.map((bot) => `• @${bot.username} - ${bot.name}`).join('\n');
			message += '\n\n';
		}

		if (pending.length > 0) {
			message += '<b>Pending Review:</b>\n';
			message += pending.map((bot) => `• @${bot.username} - ${bot.name} (pending)`).join('\n');
		}

		await ctx.reply(message, {
			parse_mode: 'HTML',
		});
	} catch (error) {
		console.error('Error in /mybots command:', error);
		await ctx.reply("Sorry, I couldn't fetch your bots. Please try again later.");
	}
});

// /subscribe command
composer.command('subscribe', async (ctx) => {
	const userId = ctx.from?.id;
	const chatId = ctx.chat?.id;

	if (!userId || !chatId) {
		await ctx.reply('Could not identify your user or chat ID.');
		return;
	}

	try {
		const result = await postToApi<ApiResponse>(
			'/subscriptions',
			{
				chat_id: chatId,
				telegram_id: userId,
			},
			ctx.env.API_BASE_URL,
			ctx.env.API,
		);

		if (result.error) {
			if (result.error.includes('Already subscribed')) {
				await ctx.reply(MESSAGES.SUBSCRIBE_ALREADY);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(MESSAGES.SUBSCRIBE_SUCCESS);
	} catch (error) {
		console.error('Error in /subscribe command:', error);
		await ctx.reply("Sorry, I couldn't subscribe you. Please try again later.");
	}
});

// /unsubscribe command
composer.command('unsubscribe', async (ctx) => {
	const chatId = ctx.chat?.id;

	if (!chatId) {
		await ctx.reply('Could not identify your chat ID.');
		return;
	}

	try {
		const result = await deleteFromApi<ApiResponse>(`/subscriptions/${chatId}`, ctx.env.API_BASE_URL, ctx.env.API);

		if (result.error) {
			if (result.error.includes('No active subscription')) {
				await ctx.reply(MESSAGES.UNSUBSCRIBE_NOT_FOUND);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		await ctx.reply(MESSAGES.UNSUBSCRIBE_SUCCESS);
	} catch (error) {
		console.error('Error in /unsubscribe command:', error);
		await ctx.reply("Sorry, I couldn't unsubscribe you. Please try again later.");
	}
});

// /rules command
composer.command('rules', async (ctx) => {
	await ctx.reply(MESSAGES.RULES, {
		parse_mode: 'HTML',
	});
});

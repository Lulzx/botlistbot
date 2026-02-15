import { InlineKeyboard } from 'grammy';
import { Composer } from 'grammy/web';
import {
	type ApiResponse,
	type Bot,
	type UserSubmissions,
	addFavorite,
	getBestBots,
	getNewBots,
	getRandomBots,
	getUserFavorites,
	getUserSubmissions,
	removeFavorite,
	searchBots,
	getBotByUsername,
	subscribe,
	unsubscribe,
	submitBot,
	reportSpam,
	reportOffline,
	createSuggestion,
	rateBot,
} from '../db';
import { CATEGORY_NAMES, EASTER_EGG_ADJECTIVES, EASTER_EGG_ENDINGS, EASTER_EGG_NOUNS, MESSAGES, pick } from '../constants';
import {
	createBotListKeyboard,
	createCategoriesKeyboard,
	createEmptyFavoritesKeyboard,
	createExploreKeyboard,
	createFavoritesKeyboard,
	createInlineSearchKeyboard,
	createMainKeyboard,
	createSearchResultsKeyboard,
	createSuggestionActionsKeyboard,
} from '../keyboards';
import { trackActivity } from '../tracking';
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
		const bots = await getRandomBots(ctx.env.DB, 5);

		if (bots.length === 0) {
			await ctx.reply(MESSAGES.EXPLORE_EMPTY);
			return;
		}

		trackActivity(ctx, 'explore');

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
		const favorites = await getUserFavorites(ctx.env.DB, userId);

		if (favorites.length === 0) {
			await ctx.reply(MESSAGES.FAVORITES_EMPTY, {
				parse_mode: 'HTML',
				reply_markup: createEmptyFavoritesKeyboard(),
			});
			return;
		}

		trackActivity(ctx, 'favorites');

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

// /favorite command - Add a bot to favorites
composer.command(['favorite', 'fav'], async (ctx) => {
	const input = ctx.match?.trim();

	if (!input) {
		await ctx.reply(`${MESSAGES.FAVORITES_ADD_PROMPT}\n\nUsage: /favorite @botusername`, {
			parse_mode: 'HTML',
		});
		return;
	}

	const usernameMatch = input.match(/@?(\w+)/);
	if (!usernameMatch) {
		await ctx.reply(MESSAGES.NEW_BOT_INVALID);
		return;
	}

	const botUsername = usernameMatch[1];
	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const result = await addFavorite(ctx.env.DB, userId, botUsername);

		if (result.error) {
			if (result.error.includes('already in favorites')) {
				await ctx.reply(MESSAGES.FAVORITES_ALREADY);
			} else if (result.error.includes('not found')) {
				await ctx.reply(MESSAGES.FAVORITES_NOT_FOUND);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		trackActivity(ctx, 'favorite_add', botUsername);
		await ctx.reply(MESSAGES.FAVORITES_ADDED);
	} catch (error) {
		console.error('Error in /favorite command:', error);
		await ctx.reply("Sorry, I couldn't add that bot to your favorites. Please try again later.");
	}
});

// /search command
composer.command('search', async (ctx) => {
	const query = ctx.match?.trim();

	if (!query) {
		await ctx.reply(MESSAGES.SEARCH_PROMPT, {
			parse_mode: 'HTML',
			reply_markup: createInlineSearchKeyboard(),
		});
		return;
	}

	if (query.length < 3) {
		await ctx.reply(MESSAGES.SEARCH_TOO_SHORT, {
			reply_markup: createInlineSearchKeyboard(query),
		});
		return;
	}

	try {
		const sanitizedQuery = query.replace(/^@+/, '');

		const searchOpts: { name?: string; username?: string; description?: string } = {
			name: sanitizedQuery,
			description: sanitizedQuery,
		};

		if (query.startsWith('@')) {
			searchOpts.username = sanitizedQuery;
		}

		const bots = await searchBots(ctx.env.DB, searchOpts);

		trackActivity(ctx, 'search', query);

		if (bots.length === 0) {
			await ctx.reply(MESSAGES.SEARCH_EMPTY, {
				reply_markup: createInlineSearchKeyboard(query),
			});
			return;
		}

		const botList = bots.slice(0, 10).map((bot, index) => {
			const category = CATEGORY_NAMES[bot.category_id] || 'Uncategorized';
			const description = bot.description
				? `${bot.description.slice(0, 80)}${bot.description.length > 80 ? '...' : ''}`
				: 'No description';
			return `${index + 1}. <b>${bot.name}</b> (@${bot.username})\n   ${category} • ${description}`;
		});
		const moreText = bots.length > 10 ? `\n\n<i>...and ${bots.length - 10} more results</i>` : '';

		await ctx.reply(`${MESSAGES.SEARCH_RESULTS} for "<b>${query}</b>":\n\n${botList.join('\n\n')}${moreText}`, {
			parse_mode: 'HTML',
			reply_markup: createSearchResultsKeyboard(bots, query),
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

	// Detect inline queries support via 🔎 emoji
	const hasInlineQueries = /🔎/.test(input);

	const userId = ctx.from?.id;
	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const result = await submitBot(ctx.env.DB, {
			username,
			name: username,
			description: descriptionPart.replace(/🔎/g, '').trim() || '',
			category_id: 1,
			telegram_id: userId,
			inlinequeries: hasInlineQueries ? 1 : 0,
		});

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

		trackActivity(ctx, 'submission', username);
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
		const result = await reportSpam(ctx.env.DB, username, userId);

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

		trackActivity(ctx, 'spam_report', username);
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
		const result = await reportOffline(ctx.env.DB, username, userId);

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

		trackActivity(ctx, 'offline_report', username);
		await ctx.reply(MESSAGES.OFFLINE_SUCCESS);
	} catch (error) {
		console.error('Error in /offline command:', error);
		await ctx.reply("Sorry, I couldn't submit the report. Please try again later.");
	}
});

// /newbots command
composer.command('newbots', async (ctx) => {
	try {
		const bots = await getNewBots(ctx.env.DB, 10);

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
		const bots = await getBestBots(ctx.env.DB, 10);

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
		const submissions = await getUserSubmissions(ctx.env.DB, userId);

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
		const result = await subscribe(ctx.env.DB, chatId, userId);

		if (result.error) {
			if (result.error.includes('Already subscribed')) {
				await ctx.reply(MESSAGES.SUBSCRIBE_ALREADY);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		trackActivity(ctx, 'subscribe');
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
		const result = await unsubscribe(ctx.env.DB, chatId);

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

// /suggest command - Suggest an edit to a bot
composer.command('suggest', async (ctx) => {
	const input = ctx.match?.trim();

	if (!input) {
		await ctx.reply(MESSAGES.SUGGEST_PROMPT, { parse_mode: 'HTML' });
		return;
	}

	const usernameMatch = input.match(/@?(\w+)/);
	if (!usernameMatch) {
		await ctx.reply(MESSAGES.NEW_BOT_INVALID);
		return;
	}

	const botUsername = usernameMatch[1];

	try {
		const bot = await getBotByUsername(ctx.env.DB, botUsername);

		if (!bot) {
			await ctx.reply(MESSAGES.SUGGEST_BOT_NOT_FOUND);
			return;
		}

		await ctx.reply(MESSAGES.SUGGEST_PICK_ACTION.replace('{username}', botUsername), {
			parse_mode: 'HTML',
			reply_markup: createSuggestionActionsKeyboard(botUsername),
		});
	} catch {
		await ctx.reply(MESSAGES.SUGGEST_BOT_NOT_FOUND);
	}
});

// /rate command - Rate a bot 1-5 stars
composer.command('rate', async (ctx) => {
	const input = ctx.match?.trim();

	if (!input) {
		await ctx.reply(MESSAGES.RATE_PROMPT, { parse_mode: 'HTML' });
		return;
	}

	// Parse: @botusername 4  or  botusername 4
	const match = input.match(/@?(\w+)\s+([1-5])/);
	if (!match) {
		await ctx.reply(MESSAGES.RATE_INVALID, { parse_mode: 'HTML' });
		return;
	}

	const botUsername = match[1];
	const value = Number.parseInt(match[2], 10);
	const userId = ctx.from?.id;

	if (!userId) {
		await ctx.reply('Could not identify your user ID.');
		return;
	}

	try {
		const result = await rateBot(ctx.env.DB, botUsername, userId, value);

		if (result.error) {
			if (result.error.includes('not found')) {
				await ctx.reply(MESSAGES.RATE_BOT_NOT_FOUND);
			} else if (result.error.includes('banned')) {
				await ctx.reply(MESSAGES.RATE_BANNED);
			} else {
				await ctx.reply(`Error: ${result.error}`);
			}
			return;
		}

		const avg = result.rating?.avg ?? value;
		const count = result.rating?.count ?? 1;
		trackActivity(ctx, 'rate', botUsername);
		await ctx.reply(
			MESSAGES.RATE_SUCCESS.replace('{username}', botUsername)
				.replace('{value}', String(value))
				.replace('{avg}', String(avg))
				.replace('{count}', String(count)),
			{ parse_mode: 'HTML' },
		);
	} catch (error) {
		console.error('Error in /rate command:', error);
		await ctx.reply("Sorry, I couldn't submit your rating. Please try again later.");
	}
});

// /easteregg command - Generate a fun bot username
composer.command('easteregg', async (ctx) => {
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

	await ctx.reply(`🥚 <b>Your random bot name ideas:</b>\n\n${names.join('\n')}`, {
		parse_mode: 'HTML',
		reply_markup: keyboard,
	});
});

import { Composer } from 'grammy/web';
import { type Bot, fetchFromApi } from '../api';
import { DeepLinkAction, MESSAGES } from '../constants';
import {
	createEmptyFavoritesKeyboard,
	createFavoritesKeyboard,
	createInlineSearchKeyboard,
	createMainKeyboard,
} from '../keyboards';
import type { MyContext } from '../types';
import { trackActivity } from '../tracking';

export const composer = new Composer<MyContext>();

export default composer;

composer.command('start', async (ctx) => {
	const deepLink = ctx.match?.trim();

	if (deepLink) {
		trackActivity(ctx, 'deep_link', deepLink);

		switch (deepLink) {
			case DeepLinkAction.SEARCH:
				await ctx.reply(MESSAGES.SEARCH_PROMPT, {
					parse_mode: 'HTML',
					reply_markup: createInlineSearchKeyboard(),
				});
				return;

			case DeepLinkAction.FAVORITES: {
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
					} else {
						const botList = favorites.map((bot) => `• <b>@${bot.username}</b> - ${bot.name}`).join('\n');
						await ctx.reply(`${MESSAGES.FAVORITES_INTRO}\n\n${botList}`, {
							parse_mode: 'HTML',
							reply_markup: createFavoritesKeyboard(favorites),
						});
					}
				} catch {
					await ctx.reply("Sorry, I couldn't fetch your favorites. Please try again later.");
				}
				return;
			}

			case DeepLinkAction.RULES:
				await ctx.reply(MESSAGES.RULES, { parse_mode: 'HTML' });
				return;

			case DeepLinkAction.CONTRIBUTING:
				await ctx.reply(MESSAGES.CONTRIBUTING, {
					parse_mode: 'HTML',
					reply_markup: createMainKeyboard(),
				});
				return;

			case DeepLinkAction.EXAMPLES:
				await ctx.reply(MESSAGES.EXAMPLES, {
					parse_mode: 'HTML',
					reply_markup: createMainKeyboard(),
				});
				return;
		}
	}

	trackActivity(ctx, 'start');
	await ctx.replyWithSticker('CAACAgQAAxkBAegKiGfsqmYos2uzFJ8o4d5gMp88qHnMAALIDQACiTNpUgwAAfZ1jylUEjYE');
	await ctx.reply(MESSAGES.WELCOME, {
		parse_mode: 'HTML',
		reply_markup: createMainKeyboard(),
	});
});

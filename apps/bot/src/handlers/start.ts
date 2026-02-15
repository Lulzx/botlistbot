import { Composer } from 'grammy/web';
import { getUserFavorites } from '../db';
import { DeepLinkAction, MESSAGES } from '../constants';
import { createEmptyFavoritesKeyboard, createFavoritesKeyboard, createInlineSearchKeyboard, createMainKeyboard } from '../keyboards';
import { trackActivity } from '../tracking';
import type { MyContext } from '../types';

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
					const favorites = await getUserFavorites(ctx.env.DB, userId);
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
	try {
		await ctx.replyWithSticker('CAACAgQAAxkBAegKiGfsqmYos2uzFJ8o4d5gMp88qHnMAALIDQACiTNpUgwAAfZ1jylUEjYE');
	} catch (err) {
		console.error('Failed to send sticker:', err);
	}
	await ctx.reply(MESSAGES.WELCOME, {
		parse_mode: 'HTML',
		reply_markup: createMainKeyboard(),
	});
});

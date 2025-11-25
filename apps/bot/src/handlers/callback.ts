import { Composer } from 'grammy/web';
import { type Bot, Category, fetchFromApi } from '../api';
import type { MyContext } from '../types';
import { CATEGORY_NAMES, MESSAGES } from './../constants';
import { createMainKeyboard } from './../keyboards';

export const composer = new Composer<MyContext>();

export default composer;

composer.on('callback_query:data', async (ctx) => {
	try {
		const data = ctx.callbackQuery.data;

		if (data.startsWith('category:')) {
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

		const messageMap = {
			help: MESSAGES.WELCOME,
			contributing: MESSAGES.CONTRIBUTING,
			examples: MESSAGES.EXAMPLES,
			try_inline: MESSAGES.TRY_INLINE,
		} as const;

		const message = messageMap[data as keyof typeof messageMap];

		if (message) {
			await ctx.editMessageText(message, {
				parse_mode: 'HTML',
				reply_markup: createMainKeyboard(),
			});
		} else {
			await ctx.reply(MESSAGES.ERROR);
		}
	} catch (error) {
		console.error('Error in callback query handler:', error);
		await ctx.reply(MESSAGES.ERROR);
	}
});

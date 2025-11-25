import { Composer } from 'grammy/web';
import { type Bot, fetchFromApi } from '../api';
import { CATEGORY_NAMES } from '../constants';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

composer.on('chosen_inline_result', async (ctx) => {
	try {
		const chosenInlineResult = ctx.chosenInlineResult;
		const result_id: string = chosenInlineResult.result_id;

		if (result_id.startsWith('CAT ')) {
			const [prefix, offset, count, categoryId] = result_id.split(' ');

			if (!categoryId || Number.isNaN(Number(categoryId))) {
				console.error(`Invalid category ID in result_id: ${result_id}`);
				return;
			}

			try {
				const bots = await fetchFromApi<Bot[]>(`/bots/category/${categoryId}`, ctx.env.API_BASE_URL, ctx.env.API);

				const categoryName = CATEGORY_NAMES[Number(categoryId)] || `Category ${categoryId}`;

				if (bots.length === 0) {
					await ctx.editMessageText(`🤷 No bots found in ${categoryName}.`);
				} else {
					const botList = bots
						.map((bot) => `• @${bot.username} - ${bot.name}`)
						.join('\n')
						.substring(0, 4083); // Telegram message limit

					await ctx.editMessageText(`🤖 Bots in ${categoryName} (${bots.length} found):\n\n${botList}`);
				}
			} catch (fetchError) {
				console.error(`Failed to fetch bots for category ${categoryId}:`, fetchError);
				await ctx.editMessageText("Sorry, I couldn't load the bots for this category. Please try again later.");
			}
		}
	} catch (error) {
		console.error('Error in chosen_inline_result handler:', error);
		// Don't try to edit message if there's a general error, as it might fail
	}
});

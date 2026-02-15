import { Composer } from 'grammy/web';
import { getBotsByCategory } from '../db';
import { CATEGORY_NAMES } from '../constants';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

composer.on('chosen_inline_result', async (ctx) => {
	try {
		const chosenInlineResult = ctx.chosenInlineResult;
		const result_id: string = chosenInlineResult.result_id;

		if (result_id.startsWith('CAT-')) {
			const categoryId = result_id.split('-')[1];

			if (!categoryId || Number.isNaN(Number(categoryId))) {
				console.error(`Invalid category ID in result_id: ${result_id}`);
				return;
			}

			try {
				const bots = await getBotsByCategory(ctx.env.DB, Number(categoryId));

				const categoryName = CATEGORY_NAMES[Number(categoryId)] || `Category ${categoryId}`;

				if (bots.length === 0) {
					await ctx.editMessageText(`🤷 No bots found in ${categoryName}.`);
				} else {
					const header = `🤖 Bots in ${categoryName} (${bots.length} found):\n\n`;
					const maxLen = 4096 - header.length;
					const lines: string[] = [];
					let len = 0;
					for (const bot of bots) {
						const line = `• @${bot.username} - ${bot.name}`;
						if (len + line.length + 1 > maxLen) break;
						lines.push(line);
						len += line.length + 1;
					}

					await ctx.editMessageText(`${header}${lines.join('\n')}`);
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

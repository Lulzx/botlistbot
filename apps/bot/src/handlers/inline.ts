import { Composer, InlineQueryResultBuilder } from 'grammy/web';
import { type Bot, type Category, fetchFromApi } from '../api';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

composer.on('inline_query', async (ctx) => {
	try {
		const inlineQuery = ctx.inlineQuery;
		const query = inlineQuery.query.trim();
		const offset = ctx.inlineQuery.offset || '0';

		if (query === '') {
			// Empty query - show categories
			const categories = await fetchFromApi<Category[]>('/categories', ctx.env.API_BASE_URL, ctx.env.API);
			let count = 0;
			const results = [];

			for (const category of categories) {
				if (count > 49) {
					// Telegram inline query limit
					break;
				}
				results.push(
					InlineQueryResultBuilder.article(`CAT ${offset} ${count} ${category.id}`, category.name, {
						description: `Browse bots in ${category.name}`,
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: '🔍 View Bots',
										callback_data: `category:${category.id}`,
									},
								],
							],
						},
					}).text(`🤖 Loading bots in ${category.name}...\n\nClick below to see all bots in this category.`, {
						parse_mode: 'HTML',
						link_preview_options: {
							is_disabled: true,
						},
					}),
				);
				count++;
			}

			return await ctx.answerInlineQuery(results, {
				cache_time: 300, // 5 minutes
				button: {
					text: `Found ${count} categories`,
					start_parameter: 'inline',
				},
				next_offset: '',
				is_personal: true,
			});
		}

		// Search query - search bots
		try {
			// Use the search API endpoint
			const searchParams = new URLSearchParams();

			// Determine what kind of search this is
			if (query.startsWith('@')) {
				// Username search
				searchParams.append('username', query.substring(1));
			} else {
				// General search in name and description
				searchParams.append('name', query);
				searchParams.append('description', query);
			}

			const bots = await fetchFromApi<Bot[]>(`/search?${searchParams.toString()}`, ctx.env.API_BASE_URL, ctx.env.API);

			const results = [];
			let count = 0;

			for (const bot of bots) {
				if (count > 49) break;

				results.push(
					InlineQueryResultBuilder.article(`BOT ${bot.id} ${count}`, `@${bot.username} - ${bot.name}`, {
						description: bot.description
							? bot.description.substring(0, 100) + (bot.description.length > 100 ? '...' : '')
							: 'No description',
						url: `https://t.me/${bot.username}`,
					}).text(
						`🤖 <b>@${bot.username}</b> - ${bot.name}\n\n${bot.description || 'No description available'}\n\n👆 Click to open the bot`,
						{
							parse_mode: 'HTML',
							link_preview_options: {
								is_disabled: true,
							},
						},
					),
				);
				count++;
			}

			return await ctx.answerInlineQuery(results, {
				cache_time: 600, // 10 minutes for search results
				button: {
					text: count > 0 ? `Found ${count} bots` : 'No bots found',
					start_parameter: 'search',
				},
				next_offset: '',
				is_personal: true,
			});
		} catch (searchError) {
			console.error('Search error:', searchError);
			return await ctx.answerInlineQuery(
				[
					InlineQueryResultBuilder.article('ERROR', 'Search Error', {
						description: 'Sorry, there was an error searching for bots',
					}).text('❌ Sorry, there was an error searching for bots. Please try again later.'),
				],
				{
					cache_time: 0,
					is_personal: true,
				},
			);
		}
	} catch (error) {
		console.error('Inline query error:', error);
		return await ctx.answerInlineQuery(
			[
				InlineQueryResultBuilder.article('ERROR', 'System Error', {
					description: 'Sorry, there was a system error',
				}).text('❌ Sorry, there was a system error. Please try again later.'),
			],
			{
				cache_time: 0,
				is_personal: true,
			},
		);
	}
});

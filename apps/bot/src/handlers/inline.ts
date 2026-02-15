import { Composer, InlineQueryResultBuilder } from 'grammy/web';
import { CATEGORIES } from '@botlistbot/shared';
import type { Category } from '@botlistbot/shared';
import { type Bot, searchBots } from '../db';
import { CATEGORY_NAMES, buildSearchOpts, escapeHtml } from '../constants';
import type { MyContext } from '../types';

const INLINE_PAGE_SIZE = 20;

const formatDescription = (text?: string, maxLength = 140) => {
	if (!text) return 'No description available';
	return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const buildBotResult = (bot: Bot, query: string, offset: number) => {
	const category = CATEGORY_NAMES[bot.category_id] || 'Uncategorized';
	const rating = bot.avg_rating ? `${bot.avg_rating.toFixed(1)}⭐ (${bot.rating_count ?? 0})` : undefined;

	return InlineQueryResultBuilder.article(`BOT-${bot.id}-${offset}`, `${bot.name} • @${bot.username}`, {
		description: `${category} • ${formatDescription(bot.description, 70)}`,
		url: `https://t.me/${bot.username}`,
		reply_markup: {
			inline_keyboard: [
				[{ text: `Open @${bot.username}`, url: `https://t.me/${bot.username}` }],
				[{ text: 'Search in this chat', switch_inline_query_current_chat: query }],
			],
		},
	}).text(
		`🤖 <b>${escapeHtml(bot.name)}</b> (@${escapeHtml(bot.username)})\n${escapeHtml(bot.description || 'No description available.')}\n\n🏷 ${category}${rating ? `\n⭐️ ${rating}` : ''}\n🔗 https://t.me/${bot.username}`,
		{
			parse_mode: 'HTML',
			link_preview_options: {
				is_disabled: true,
			},
		},
	);
};

const buildKeepTypingResult = (query: string, offset: number) => {
	return InlineQueryResultBuilder.article(`KEEP_TYPING-${offset}`, 'Keep typing to search bots', {
		description: 'Enter at least 3 characters (e.g. "music", "@weatherbot")',
	}).text(
		`You typed "<b>${escapeHtml(query)}</b>". Type at least 3 characters to search the BotList.\n\nExamples:\n• music\n• weather\n• @username`,
		{
			parse_mode: 'HTML',
		},
	);
};

const buildCategoryResult = (category: Category, offset: number) => {
	return InlineQueryResultBuilder.article(`CAT-${category.id}-${offset}`, category.name, {
		description: `Browse bots in ${category.name}`,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: '🔍 View bots',
						callback_data: `category:${category.id}`,
					},
				],
				[
					{
						text: 'Search this category inline',
						switch_inline_query_current_chat: category.name,
					},
				],
			],
		},
	}).text(`🤖 Loading bots in ${category.name}...\n\nTap below to browse this category.`, {
		parse_mode: 'HTML',
		link_preview_options: {
			is_disabled: true,
		},
	});
};

const buildStartResult = (offset: number) => {
	return InlineQueryResultBuilder.article(`START-${offset}`, 'Search BotList', {
		description: 'Type any bot name, @username, or keyword to get inline results.',
	}).text('Type a bot name, @username, or keyword to search the BotList inline.\n\nExample queries:\n• music\n• games\n• @weatherbot', {
		parse_mode: 'HTML',
	});
};

export const composer = new Composer<MyContext>();

export default composer;

composer.on('inline_query', async (ctx) => {
	try {
		const inlineQuery = ctx.inlineQuery;
		const query = inlineQuery.query.trim();
		const offset = Number.parseInt(ctx.inlineQuery.offset || '0', 10);
		const start = Number.isNaN(offset) ? 0 : offset;

		if (query === '') {
			const categories = CATEGORIES;
			const results = [
				buildStartResult(start),
				...categories.slice(start, start + INLINE_PAGE_SIZE).map((category, index) => buildCategoryResult(category, start + index)),
			];
			const nextOffset = start + INLINE_PAGE_SIZE < categories.length ? String(start + INLINE_PAGE_SIZE) : '';

			return await ctx.answerInlineQuery(results, {
				cache_time: 120,
				button: {
					text: `${categories.length} categories available`,
					start_parameter: 'inline',
				},
				next_offset: nextOffset,
				is_personal: true,
			});
		}

		if (query.length < 3) {
			return await ctx.answerInlineQuery([buildKeepTypingResult(query, start)], {
				cache_time: 0,
				is_personal: true,
				next_offset: '',
			});
		}

		try {
			const bots = await searchBots(ctx.env.DB, buildSearchOpts(query));

			if (bots.length === 0) {
				return await ctx.answerInlineQuery(
					[
						InlineQueryResultBuilder.article(`EMPTY-${start}`, 'No bots found', {
							description: 'Try another keyword or @username',
						}).text(`No bots found for "<b>${escapeHtml(query)}</b>". Try another keyword or a bot @username.`, {
							parse_mode: 'HTML',
						}),
					],
					{
						cache_time: 5,
						is_personal: true,
						next_offset: '',
						button: {
							text: 'Search again',
							start_parameter: 'search',
						},
					},
				);
			}

			const slice = bots.slice(start, start + INLINE_PAGE_SIZE);

			if (slice.length === 0) {
				return await ctx.answerInlineQuery(
					[
						InlineQueryResultBuilder.article(`END-${start}`, 'End of results', {
							description: 'No more bots for this query',
						}).text('No more bots for this query. Try refining your search.', { parse_mode: 'HTML' }),
					],
					{
						cache_time: 5,
						is_personal: true,
						next_offset: '',
					},
				);
			}

			const results = slice.map((bot, index) => buildBotResult(bot, query, start + index));
			const nextOffset = start + INLINE_PAGE_SIZE < bots.length ? String(start + INLINE_PAGE_SIZE) : '';

			return await ctx.answerInlineQuery(results, {
				cache_time: 30,
				button: {
					text: `Found ${bots.length} bot${bots.length === 1 ? '' : 's'}`,
					start_parameter: 'search',
				},
				next_offset: nextOffset,
				is_personal: true,
			});
		} catch (searchError) {
			console.error('Search error:', searchError);
			return await ctx.answerInlineQuery(
				[
					InlineQueryResultBuilder.article(`ERROR-${start}`, 'Search Error', {
						description: 'Sorry, there was an error searching for bots',
					}).text('❌ Sorry, there was an error searching for bots. Please try again later.'),
				],
				{
					cache_time: 0,
					is_personal: true,
					next_offset: '',
				},
			);
		}
	} catch (error) {
		console.error('Inline query error:', error);
		return await ctx.answerInlineQuery(
			[
				InlineQueryResultBuilder.article(`SYSTEM-ERROR-${Date.now()}`, 'System Error', {
					description: 'Sorry, there was a system error',
				}).text('❌ Sorry, there was a system error. Please try again later.'),
			],
			{
				cache_time: 0,
				is_personal: true,
				next_offset: '',
			},
		);
	}
});

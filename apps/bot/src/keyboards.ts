import { InlineKeyboard } from 'grammy';
import type { Bot, Suggestion } from './db';
import { CATEGORIES } from './constants';

export const createMainKeyboard = () => {
	return new InlineKeyboard()
		.row(
			{ text: '🔍 Search inline', switch_inline_query_current_chat: '' },
			{ text: '📂 Categories', callback_data: 'show_categories' },
		)
		.row({ text: '🎲 Explore', callback_data: 'explore_more' }, { text: '⭐ Favorites', callback_data: 'fav_refresh' })
		.row(
			{ text: '❓ Help', callback_data: 'help' },
			{ text: '📣 Contributing', callback_data: 'contributing' },
			{ text: '📝 Examples', callback_data: 'examples' },
		);
};

export const createCategoriesKeyboard = () => {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < CATEGORIES.length; i += 2) {
		keyboard.row(
			{ text: CATEGORIES[i].name, callback_data: `category:${CATEGORIES[i].id}` },
			...(i + 1 < CATEGORIES.length ? [{ text: CATEGORIES[i + 1].name, callback_data: `category:${CATEGORIES[i + 1].id}` }] : []),
		);
	}

	return keyboard;
};

const FAVORITES_PAGE_SIZE = 10;

export const createFavoritesKeyboard = (favorites: Bot[], page = 0) => {
	const keyboard = new InlineKeyboard();
	const start = page * FAVORITES_PAGE_SIZE;
	const pageItems = favorites.slice(start, start + FAVORITES_PAGE_SIZE);

	for (const bot of pageItems) {
		keyboard.row(
			{ text: `@${bot.username}`, url: `https://t.me/${bot.username}` },
			{ text: '❌ Remove', callback_data: `fav_remove:${bot.username}` },
		);
	}

	// Pagination row
	const navButtons: Array<{ text: string; callback_data: string }> = [];
	if (page > 0) {
		navButtons.push({ text: '⬅️ Previous', callback_data: `fav_page:${page - 1}` });
	}
	if (start + FAVORITES_PAGE_SIZE < favorites.length) {
		navButtons.push({ text: '➡️ Next', callback_data: `fav_page:${page + 1}` });
	}
	if (navButtons.length > 0) {
		keyboard.row(...navButtons);
	}

	keyboard.row({ text: '➕ Add Bot', callback_data: 'fav_add' }, { text: '🔄 Refresh', callback_data: 'fav_refresh' });

	return keyboard;
};

export const createEmptyFavoritesKeyboard = () => {
	return new InlineKeyboard()
		.row({ text: '➕ Add Bot to Favorites', callback_data: 'fav_add' })
		.row({ text: '📂 Browse Categories', callback_data: 'show_categories' });
};

export const createExploreKeyboard = (bots: Bot[]) => {
	const keyboard = new InlineKeyboard();

	for (const bot of bots) {
		keyboard.row({ text: `@${bot.username} - ${bot.name}`, url: `https://t.me/${bot.username}` });
	}

	keyboard.row({ text: '🔄 Show More', callback_data: 'explore_more' }, { text: '⭐️ Add to Favorites', callback_data: 'explore_fav' });

	return keyboard;
};

export const createBotListKeyboard = (bots: Bot[], prefix = 'bot') => {
	const keyboard = new InlineKeyboard();

	for (const bot of bots.slice(0, 10)) {
		const rating = bot.avg_rating ? ` (${bot.avg_rating.toFixed(1)}⭐)` : '';
		keyboard.row({ text: `@${bot.username} - ${bot.name}${rating}`, url: `https://t.me/${bot.username}` });
	}

	if (bots.length > 10) {
		keyboard.row({ text: `📋 Show all ${bots.length} bots`, callback_data: `${prefix}_showall` });
	}

	return keyboard;
};

export const createSearchResultsKeyboard = (bots: Bot[], query?: string) => {
	const keyboard = new InlineKeyboard();

	for (const bot of bots.slice(0, 10)) {
		keyboard.row({ text: `@${bot.username} - ${bot.name}`, url: `https://t.me/${bot.username}` });
	}

	if (query) {
		keyboard.row(
			{ text: '🔍 Search inline here', switch_inline_query_current_chat: query },
			{ text: '↗️ Share inline', switch_inline_query: query },
		);
	}

	if (bots.length > 10) {
		const callbackData = query ? `search_more:${encodeURIComponent(query)}` : 'search_more';
		keyboard.row({ text: `📋 ${bots.length - 10} more results...`, callback_data: callbackData });
	}

	return keyboard;
};

export const createInlineSearchKeyboard = (prefill = '') => {
	return new InlineKeyboard()
		.row({ text: '🔍 Search inline in this chat', switch_inline_query_current_chat: prefill })
		.row({ text: '❌ Cancel', callback_data: 'cancel_action' });
};

export const createAdminKeyboard = () => {
	return new InlineKeyboard()
		.row({ text: '👤 User info', callback_data: 'admin:userinfo' }, { text: '🚫 Ban user', callback_data: 'admin:ban' })
		.row({ text: '♻️ Unban user', callback_data: 'admin:unban' })
		.row({ text: '➕ Add bot', callback_data: 'admin:addbot' }, { text: '✏️ Update bot', callback_data: 'admin:updatebot' })
		.row({ text: '🗳 Review submissions', callback_data: 'admin:review' })
		.row({ text: '💡 Review suggestions', callback_data: 'admin:suggestions' })
		.row({ text: '📊 Statistics', callback_data: 'admin:stats' })
		.row({ text: '🔄 Refresh', callback_data: 'admin:panel' });
};

export const createMyBotsKeyboard = () => {
	return new InlineKeyboard()
		.row({ text: '➕ Submit New Bot', callback_data: 'submit_new_bot' })
		.row({ text: '📊 View Statistics', callback_data: 'mybots_stats' });
};

export const createCancelKeyboard = () => {
	return new InlineKeyboard().row({ text: '❌ Cancel', callback_data: 'cancel_action' });
};

export const createBackKeyboard = (callback: string) => {
	return new InlineKeyboard().row({ text: '« Back', callback_data: callback });
};

export const createConfirmKeyboard = (confirmCallback: string, cancelCallback = 'cancel_action') => {
	return new InlineKeyboard().row(
		{ text: '✅ Confirm', callback_data: confirmCallback },
		{ text: '❌ Cancel', callback_data: cancelCallback },
	);
};

export const createSuggestionActionsKeyboard = (botUsername: string) => {
	return new InlineKeyboard()
		.row(
			{ text: '📝 Name', callback_data: `suggest:${botUsername}:name` },
			{ text: '📋 Description', callback_data: `suggest:${botUsername}:description` },
		)
		.row(
			{ text: '📂 Category', callback_data: `suggest:${botUsername}:category` },
			{ text: '🔌 Offline', callback_data: `suggest:${botUsername}:offline` },
		)
		.row(
			{ text: '🚨 Spam', callback_data: `suggest:${botUsername}:spam` },
			{ text: '🔎 Inline Queries', callback_data: `suggest:${botUsername}:inlinequeries` },
		)
		.row(
			{ text: '🏷 Add Keyword', callback_data: `suggest:${botUsername}:add_keyword` },
			{ text: '🗑 Remove Keyword', callback_data: `suggest:${botUsername}:remove_keyword` },
		)
		.row({ text: '❌ Cancel', callback_data: 'cancel_action' });
};

export const createSuggestionReviewKeyboard = (suggestion: Suggestion) => {
	return new InlineKeyboard().row(
		{ text: '✅ Accept', callback_data: `admin:suggest_accept:${suggestion.id}` },
		{ text: '❌ Reject', callback_data: `admin:suggest_reject:${suggestion.id}` },
	);
};

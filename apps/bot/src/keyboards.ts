import { InlineKeyboard } from 'grammy';
import { Category } from './api';
import { CATEGORIES } from './constants';
import type { MyContext } from './types';

export const createMainKeyboard = () => {
	return new InlineKeyboard()
		.row(
			{ text: '❓ Help', callback_data: 'help' },
			{ text: '🔍 Contributing', callback_data: 'contributing' },
			{ text: '📝 Examples', callback_data: 'examples' },
		)
		.row({ text: 'Try me inline!', callback_data: 'try_inline' });
};

export const createCategoriesKeyboard = async (ctx: MyContext) => {
	try {
		const keyboard = new InlineKeyboard();

		for (let i = 0; i < CATEGORIES.length; i += 2) {
			keyboard.row(
				{ text: CATEGORIES[i].name, callback_data: `category:${CATEGORIES[i].id}` },
				...(i + 1 < CATEGORIES.length ? [{ text: CATEGORIES[i + 1].name, callback_data: `category:${CATEGORIES[i + 1].id}` }] : []),
			);
		}

		return keyboard;
	} catch (error) {
		console.error('Failed to build categories keyboard:', error);
		throw new Error('Failed to load categories.');
	}
};

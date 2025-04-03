import { InlineKeyboard } from 'grammy';
import { fetchFromApi, Category } from './api';
import { MyContext } from './types';

export const createMainKeyboard = () => {
  return new InlineKeyboard()
    .row(
      { text: '❓ Help', callback_data: 'help' },
      { text: '🔍 Contributing', callback_data: 'contributing' },
      { text: '📝 Examples', callback_data: 'examples' }
    )
    .row({ text: 'Try me inline!', callback_data: 'try_inline' });
};

export const createCategoriesKeyboard = async (ctx: MyContext) => {
  if (!ctx.env.API_BASE_URL) {
    console.error("API_BASE_URL environment variable is not set.");
    throw new Error("API configuration error.");
  }

  try {
    const categories = await fetchFromApi<Category[]>('/categories', ctx.env.API_BASE_URL);

    const keyboard = new InlineKeyboard();

    for (let i = 0; i < categories.length; i += 2) {
      keyboard.row(
        { text: categories[i].name, callback_data: `category:${categories[i].id}` },
        ...(i + 1 < categories.length ? [{ text: categories[i + 1].name, callback_data: `category:${categories[i + 1].id}` }] : [])
      );
    }

    return keyboard;
  } catch (error) {
    console.error("Failed to fetch categories or build keyboard:", error);
    throw new Error("Failed to load categories.");
  }
};

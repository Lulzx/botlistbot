import { InlineKeyboard } from 'grammy';
import { Category } from './api';
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
  try {
    const categories: Category[] = [
      { id: 1, name: "🌿 Miscellaneous" },
      { id: 2, name: "👥 Social" },
      { id: 3, name: "🙋‍♂️ Promoting" },
      { id: 4, name: "🛍 Shopping" },
      { id: 5, name: "😂 Humor" },
      { id: 6, name: "🎮 Gaming" },
      { id: 7, name: "🏋️‍♂️ HTML5 Games" },
      { id: 8, name: "🤖 Bot creating" },
      { id: 9, name: "⚒ Sticker pack creation" },
      { id: 10, name: "🧸 Stickers & Gif's" },
      { id: 11, name: "🍟 Video" },
      { id: 12, name: "📸 Photography" },
      { id: 13, name: "🎧 Music" },
      { id: 14, name: "⚽ Sports" },
      { id: 15, name: "☔️ Weather" },
      { id: 16, name: "📰 News" },
      { id: 17, name: "✈️ Places & Traveling" },
      { id: 18, name: "📞 Android & Tech News" },
      { id: 19, name: "📲 Apps & software" },
      { id: 20, name: "📚 Books & Magazines" },
      { id: 21, name: "📓 Translation and dictionaries" },
      { id: 22, name: "💳 Public ID's" },
      { id: 23, name: "📝 Text Formatting" },
      { id: 24, name: "📦 Multiuse" },
      { id: 25, name: "🛠️ Group & channel tools" },
      { id: 26, name: "🍃 Inline Web Search" },
      { id: 27, name: "⏰ Organization and reminders" },
      { id: 28, name: "⚙️ Tools" }
    ];
    const keyboard = new InlineKeyboard();

    for (let i = 0; i < categories.length; i += 2) {
      keyboard.row(
        { text: categories[i].name, callback_data: `category:${categories[i].id}` },
        ...(i + 1 < categories.length ? [{ text: categories[i + 1].name, callback_data: `category:${categories[i + 1].id}` }] : [])
      );
    }

    return keyboard;
  } catch (error) {
    console.error("Failed to build categories keyboard:", error);
    throw new Error("Failed to load categories.");
  }
};

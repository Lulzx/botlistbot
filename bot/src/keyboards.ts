import { InlineKeyboard } from 'grammy';

export const createMainKeyboard = () => {
  return new InlineKeyboard()
    .row(
      { text: '❓ Help', callback_data: 'help' },
      { text: '🔍 Contributing', callback_data: 'contributing' },
      { text: '📝 Examples', callback_data: 'examples' }
    )
    .row({ text: 'Try me inline!', callback_data: 'try_inline' });
};

export const createCategoriesKeyboard = () => {
  const categories = [
    "🌿 Miscellaneous",
    "👥 Social",
    "🙋‍♂️ Promoting",
    "🛍 Shopping",
    "😂 Humor",
    "🎮 Gaming",
    "🏋️‍♂️ HTML5 Games",
    "🤖 Bot creating",
    "⚒ Sticker pack creation",
    "🧸 Stickers & Gif's",
    "🍟 Video",
    "📸 Photography",
    "🎧 Music",
    "⚽ Sports",
    "☔️ Weather",
    "📰 News",
    "✈️ Places & Traveling",
    "📞 Android & Tech News",
    "📲 Apps & software",
    "📚 Books & Magazines",
    "📓 Translation and dictionaries",
    "💳 Public ID's",
    "📝 Text Formatting",
    "📦 Multiuse",
    "🛠️ Group & channel tools",
    "🍃 Inline Web Search",
    "⏰ Organization and reminders",
    "⚙️ Tools"
  ];

  const keyboard = new InlineKeyboard();
  
  for (let i = 0; i < categories.length; i += 2) {
    keyboard.row(
      { text: categories[i], callback_data: `category:${categories[i]}` },
      ...(i + 1 < categories.length ? [{ text: categories[i + 1], callback_data: `category:${categories[i + 1]}` }] : [])
    );
  }
  
  return keyboard;
};

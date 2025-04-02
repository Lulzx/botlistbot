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

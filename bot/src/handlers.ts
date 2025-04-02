import { Bot, Context } from 'grammy';
import { MESSAGES } from './constants';
import { createMainKeyboard, createCategoriesKeyboard } from './keyboards';

export const setupBotHandlers = (bot: Bot<Context>) => {
  bot.command('start', async (ctx) => {
    await ctx.replyWithSticker('CAACAgQAAxkBAegKiGfsqmYos2uzFJ8o4d5gMp88qHnMAALIDQACiTNpUgwAAfZ1jylUEjYE');
    await ctx.reply(MESSAGES.WELCOME, {
      parse_mode: 'HTML',
      reply_markup: createMainKeyboard()
    });
  });

  bot.command('categories', async (ctx) => {
    await ctx.reply('💬 Please select a category', {
      reply_markup: createCategoriesKeyboard()
    });
  });

  bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData) {
      console.log('Received callback query without data');
      await ctx.answerCallbackQuery();
      return;
    }
    
    console.log(`Callback received: ${callbackData}, Message ID: ${ctx.callbackQuery.message?.message_id}`);
    
    await ctx.answerCallbackQuery();

    try {
      if (callbackData.startsWith('category:')) {
        const category = callbackData.substring('category:'.length);
        await ctx.reply(`You selected: ${category}\nShowing bots in this category...`);
        return;
      }

      const messageMap = {
        'help': MESSAGES.WELCOME,
        'contributing': MESSAGES.CONTRIBUTING,
        'examples': MESSAGES.EXAMPLES,
        'try_inline': MESSAGES.TRY_INLINE
      } as const;

      const message = messageMap[callbackData as keyof typeof messageMap];
      
      if (message) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: createMainKeyboard()
        });
      }
    } catch (error) {
      console.error(`Error processing callback ${callbackData} for message ${ctx.callbackQuery.message?.message_id}:`, error);
      await ctx.reply(MESSAGES.ERROR).catch(e => console.error("Failed to send error reply:", e));
    }
  });
};

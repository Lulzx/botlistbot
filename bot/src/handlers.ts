import { Bot, Context } from 'grammy';
import { MESSAGES } from './constants';
import { createMainKeyboard } from './keyboards';

export const setupBotHandlers = (bot: Bot<Context>) => {
  bot.command('start', async (ctx) => {
    await ctx.replyWithSticker('CAACAgQAAxkBAegKiGfsqmYos2uzFJ8o4d5gMp88qHnMAALIDQACiTNpUgwAAfZ1jylUEjYE');
    await ctx.reply(MESSAGES.WELCOME, {
      parse_mode: 'HTML',
      reply_markup: createMainKeyboard()
    });
  });

  bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    console.log(`Callback received: ${callbackData}, Message ID: ${ctx.callbackQuery.message?.message_id}`);
    
    await ctx.answerCallbackQuery();

    try {
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

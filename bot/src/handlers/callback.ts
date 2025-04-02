import { Composer } from "grammy/web";
import { MESSAGES } from './../constants';
import { createMainKeyboard } from './../keyboards';

export const composer = new Composer();

export default composer;

composer.on('callback_query', async (ctx) => {
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

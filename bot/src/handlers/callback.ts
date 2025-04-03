import { Composer } from "grammy/web";
import { MESSAGES } from './../constants';
import { createMainKeyboard } from './../keyboards';
import { MyContext } from "../types"; 
import { fetchFromApi, Bot, Category } from "../api"; 

export const composer = new Composer<MyContext>(); 

export default composer;

composer.on('callback_query:data', async (ctx) => { 
    const callbackData = ctx.callbackQuery.data;

    console.log(`Callback received: ${callbackData}, Message ID: ${ctx.callbackQuery.message?.message_id}`);

    await ctx.answerCallbackQuery();

    try {
      if (callbackData.startsWith('category:')) {
        const categoryIdStr = callbackData.substring('category:'.length);
        const categoryId = parseInt(categoryIdStr, 10);

        if (isNaN(categoryId)) {
          console.error(`Invalid category ID in callback data: ${callbackData}`);
          await ctx.reply("Sorry, something went wrong with the category selection.");
          return;
        }

        if (!ctx.env.API_BASE_URL) {
          console.error("API_BASE_URL environment variable is not set.");
          await ctx.reply(MESSAGES.ERROR);
          return;
        }

        try {
          await ctx.reply("⏳ Fetching bots...");

          const categories = await fetchFromApi<Category[]>(`/categories`, ctx.env.API_BASE_URL);
          const category = categories.find(cat => cat.id === categoryId);
          const categoryName = category ? category.name : `Category ${categoryId}`;
          
          const bots = await fetchFromApi<Bot[]>(`/bots/category/${categoryId}`, ctx.env.API_BASE_URL);

          if (bots.length === 0) {
            await ctx.reply(`🤷 No bots found in ${categoryName}.`);
          } else {
            const botList = bots
              .map(bot => `• ${bot.username} - ${bot.name}`)
              .join('\n');
            await ctx.reply(`Bots in ${categoryName}:\n${botList}`);
          }
        } catch (fetchError) {
          console.error(`Failed to fetch bots for category ${categoryId}:`, fetchError);
          await ctx.reply("Sorry, I couldn't fetch the bots for this category. Please try again later.");
        }
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
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: createMainKeyboard()
        });
      }
    } catch (error) {
      console.error(`Error processing callback ${callbackData} for message ${ctx.callbackQuery.message?.message_id}:`, error);
      await ctx.reply(MESSAGES.ERROR).catch(e => console.error("Failed to send error reply:", e));
    }
});

import { Composer } from "grammy/web";
import { createCategoriesKeyboard } from './../keyboards';
import { MyContext } from "../types";

export const composer = new Composer<MyContext>();

export default composer;

composer.command('categories', async (ctx: MyContext) => {
    try {
      const keyboard = await createCategoriesKeyboard(ctx);
      await ctx.reply('💬 Please select a category', {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error("Error in /categories command:", error);
      await ctx.reply("Sorry, I couldn't load the categories right now. Please try again later.");
    }
});

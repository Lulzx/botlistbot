import { Composer } from "grammy/web";
import { createCategoriesKeyboard } from './../keyboards';

export const composer = new Composer();

export default composer;

composer.command('categories', async (ctx) => {
    await ctx.reply('💬 Please select a category', {
      reply_markup: createCategoriesKeyboard()
    });
});

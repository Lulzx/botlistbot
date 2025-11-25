import { Composer } from 'grammy/web';
import { MESSAGES } from './../constants';
import { createMainKeyboard } from './../keyboards';

export const composer = new Composer();

export default composer;

composer.command('start', async (ctx) => {
	await ctx.replyWithSticker('CAACAgQAAxkBAegKiGfsqmYos2uzFJ8o4d5gMp88qHnMAALIDQACiTNpUgwAAfZ1jylUEjYE');
	await ctx.reply(MESSAGES.WELCOME, {
		parse_mode: 'HTML',
		reply_markup: createMainKeyboard(),
	});
});

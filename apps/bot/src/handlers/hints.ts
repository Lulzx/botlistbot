import { Composer } from 'grammy/web';
import { HINTS } from '../constants';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

export default composer;

composer.hears(/#(inline|rules|private|manybot|userbot|devlist)\b(.*)/, async (ctx) => {
	// Only respond in group chats
	if (ctx.chat?.type === 'private') return;

	const hintKey = ctx.match?.[1];
	const queryText = ctx.match?.[2]?.trim();

	const hint = HINTS[hintKey];
	if (!hint) return;

	let message = hint.message;

	// Substitute {query} with the text after the hashtag, or the default
	const query = queryText || hint.defaultQuery || '';
	message = message.replace(/\{query\}/g, query);

	try {
		await ctx.reply(message, {
			parse_mode: 'HTML',
			reply_parameters: ctx.message?.message_id ? { message_id: ctx.message.message_id } : undefined,
		});
	} catch (error) {
		console.error('Error in hint handler:', error);
	}
});

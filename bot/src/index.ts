import { Bot, webhookCallback } from 'grammy/web';
import { Hono } from 'hono';
import { HonoContext, MyContext } from './types';
import { composer } from './handlers/index';

const app = new Hono<HonoContext>();

app.post('/:token', async (c) => {
	const rt = c.req.params("token");
	if (rt === c.env.BOT_TOKEN) {
		const bot: Bot<MyContext> = new Bot<MyContext>(c.env.BOT_TOKEN);
		console.log('Initializing Bot and handlers...');
		bot.use(composer);
		console.log('Bot and handlers initialized.');
		try {
			const callback = webhookCallback(bot, 'hono');
			return callback(c);
		}
		catch (ex) {
			return c.text(ex.toString(), 200);
		}
	}
	else {
		return c.text('Invalid Token', 500);
	}
});

app.get('/', (c) => c.text('Hello! This is the bot endpoint. Use POST for Telegram webhooks.'));

export default app;

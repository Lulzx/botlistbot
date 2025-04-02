import { type Api, Bot, type Context, webhookCallback } from 'grammy';
import { Hono } from 'hono';
import { setupBotHandlers } from './handlers';
import { HonoContext } from './types';

const app = new Hono<HonoContext>();

let bot: Bot<Context, Api>;

app.use('*', async (c, next) => {
	if (!bot) {
		console.log('Initializing Bot and handlers...');
		bot = new Bot<Context, Api>(c.env.BOT_TOKEN);

		setupBotHandlers(bot);
		console.log('Bot and handlers initialized.');
	}

	await next();
});

app.post('/', async (c) => {
	if (!bot) {
		console.error('Bot not initialized in POST route!');
		return c.text('Internal Server Error: Bot not ready', 500);
	}

	const callback = webhookCallback(bot, 'hono');
	return callback(c);
});

app.get('/', (c) => c.text('Hello! This is the bot endpoint. Use POST for Telegram webhooks.'));

export default app;

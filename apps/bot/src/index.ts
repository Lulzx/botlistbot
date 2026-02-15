import { Bot, webhookCallback } from 'grammy/web';
import { Hono } from 'hono';
import { ensureDatabase } from './db';
import { composer } from './handlers/index';
import type { HonoContext, MyContext } from './types';

const app = new Hono<HonoContext>();

app.post('/:token', async (c) => {
	const rt = c.req.param('token');

	if (!c.env.BOT_TOKEN) {
		console.error('Missing required environment variable: BOT_TOKEN');
		return c.text('Server configuration error', 500);
	}

	if (rt === c.env.BOT_TOKEN) {
		await ensureDatabase(c.env);

		const bot: Bot<MyContext> = new Bot<MyContext>(c.env.BOT_TOKEN);

		bot.use((ctx, next) => {
			ctx.env = c.env;
			return next();
		});

		bot.use(composer);

		bot.catch((err) => {
			console.error('Grammy error:', err.message);
			console.error('Update that caused error:', JSON.stringify(err.ctx?.update));
		});

		try {
			const callback = webhookCallback(bot, 'hono');
			return callback(c);
		} catch (ex) {
			const message = ex instanceof Error ? ex.message : String(ex);
			console.error('Webhook error:', message);
			return c.text(message, 500);
		}
	} else {
		console.warn(`Invalid token received: ${rt}`);
		return c.text('Invalid Token', 401);
	}
});

app.get('/', (c) => {
	return c.text(
		'Bot is running! Set up your webhook at: https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>/<YOUR_TOKEN>',
	);
});

export default app;

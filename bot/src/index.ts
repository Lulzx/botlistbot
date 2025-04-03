import { Bot, webhookCallback } from 'grammy/web';
import { Hono } from 'hono';
import { HonoContext, MyContext } from './types';
import { composer } from './handlers/index';

const app = new Hono<HonoContext>();

app.post('/:token', async (c) => {
  const rt = c.req.param("token");
  if (rt === c.env.BOT_TOKEN) {
    const bot: Bot<MyContext> = new Bot<MyContext>(c.env.BOT_TOKEN);

    bot.use((ctx, next) => {
      ctx.env = c.env;
      return next();
    });

    bot.use(composer);
    try {
      const callback = webhookCallback(bot, 'hono');
      return callback(c);
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : String(ex);
      console.error('Webhook error:', message);
      return c.text(message, 500);
    }
  } else {
    console.warn('Invalid token received');
    return c.text('Invalid Token', 401);
  }
});

app.get('/', (c) => c.text('Hello! This is the bot endpoint. Use POST for Telegram webhooks.'));

export default app;

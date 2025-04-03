import { Bot, webhookCallback } from 'grammy/web';
import { Hono } from 'hono';
import { HonoContext, MyContext } from './types';
import { composer } from './handlers/index';

const app = new Hono<HonoContext>();

app.post('/:token', async (c) => {
  const rt = c.req.param("token");
  
  console.log(`Received webhook request with token: ${rt}`);
  console.log(`Expected token: ${c.env.BOT_TOKEN}`);
  
  if (rt === c.env.BOT_TOKEN) {
    console.log('Token validated, initializing bot...');
    const bot: Bot<MyContext> = new Bot<MyContext>(c.env.BOT_TOKEN);
    
    bot.use((ctx, next) => {
      ctx.env = c.env;
      return next();
    });
    
    bot.use(composer);
    
    try {
      console.log('Processing webhook with grammy...');
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
  console.log('Status endpoint accessed');
  return c.text('Bot is running! Set up your webhook at: https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>/<YOUR_TOKEN>');
});

app.get('/debug', (c) => {
  return c.json({
    message: 'Debug info (no sensitive data)',
    hasToken: !!c.env.BOT_TOKEN,
    apiUrl: c.env.API_BASE_URL
  });
});
 
export default app;

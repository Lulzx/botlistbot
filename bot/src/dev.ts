import { Bot } from 'grammy';
import { MyContext, Env } from './types';
import { composer } from './handlers/index';
import dotenv from 'dotenv';

dotenv.config({ path: '.dev.vars' });

const token = process.env.BOT_TOKEN;
const apiBaseUrl = process.env.API_BASE_URL;

if (!token) {
  throw new Error('BOT_TOKEN environment variable is required for dev mode (check .dev.vars)');
}
if (!apiBaseUrl) {
  throw new Error('API_BASE_URL environment variable is required for dev mode (check .dev.vars)');
}

const devEnv: Env = {
  BOT_TOKEN: token,
  API_BASE_URL: apiBaseUrl
};

const bot = new Bot<MyContext>(token);

bot.use((ctx, next) => {
  ctx.env = devEnv;
  return next();
});

bot.use(composer);

console.log('Starting bot in development mode (long polling)...');
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} started!`);
  },
}).catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

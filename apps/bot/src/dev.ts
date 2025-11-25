import dotenv from 'dotenv';
import { Bot } from 'grammy';
import { composer } from './handlers/index';
import type { Env, MyContext } from './types';

dotenv.config({ path: '.dev.vars' });

// Validate required environment variables
const requiredEnvVars = ['BOT_TOKEN', 'API_BASE_URL'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
	console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
	console.error('Please create a .dev.vars file with the required variables.');
	process.exit(1);
}

const env: Env = {
	BOT_TOKEN: process.env.BOT_TOKEN as string,
	API_BASE_URL: process.env.API_BASE_URL as string,
	API: null as unknown as Fetcher, // Not available in dev mode
};

console.log('✅ Environment variables validated');
console.log(`API Base URL: ${env.API_BASE_URL}`);

const bot = new Bot<MyContext>(env.BOT_TOKEN);

bot.use((ctx, next) => {
	ctx.env = env;
	return next();
});

bot.use(composer);

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

import dotenv from 'dotenv';
import { Bot } from 'grammy';

dotenv.config({ path: '.dev.vars' });

const token = process.env.BOT_TOKEN || '';
const webhookUrl = process.env.WEBHOOK_URL || '';

if (!token) {
	console.error('BOT_TOKEN environment variable is required');
	process.exit(1);
}

if (!webhookUrl) {
	console.error('WEBHOOK_URL environment variable is required');
	process.exit(1);
}

async function setWebhook() {
	const bot = new Bot(token);

	try {
		const currentWebhook = await bot.api.getWebhookInfo();
		console.log('Current webhook info:', currentWebhook);

		const webhookPath = `${webhookUrl}/${token}`;
		console.log(`Setting webhook to: ${webhookPath}`);

		const result = await bot.api.setWebhook(webhookPath);
		console.log('Webhook set result:', result);

		const newWebhook = await bot.api.getWebhookInfo();
		console.log('New webhook info:', newWebhook);

		if (newWebhook.url === webhookPath) {
			console.log('✅ Webhook successfully set!');
		} else {
			console.error('❌ Webhook was not set correctly');
		}
	} catch (error) {
		console.error('Error setting webhook:', error);
	}
}

setWebhook().catch(console.error);

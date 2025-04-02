import { type Api, Bot, type Context, webhookCallback } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { Hono } from 'hono';

export interface Env {
	BOT_TOKEN: string;
	API_URL: string;
}

type HonoContext = {
	Bindings: Env;
};

const app = new Hono<HonoContext>();

let bot: Bot<Context, Api>;

app.use('*', async (c, next) => {
	if (!bot) {
		console.log('Initializing Bot and handlers...');
		bot = new Bot<Context, Api>(c.env.BOT_TOKEN);

		bot.command('start', async (ctx) => {
			await ctx.replyWithSticker('CAACAgQAAxkBAegKiGfsqmYos2uzFJ8o4d5gMp88qHnMAALIDQACiTNpUgwAAfZ1jylUEjYE');
			const welcomeMessage = `I'm the bot in charge of maintaining the <b>@BotList</b> channel, the most reliable and unbiased bot catalog out there. I was built to simplify navigation and to automate the process of submitting, reviewing and publishing bots by the <b>@BotListChat</b> community.

🔘 <b>First steps:</b>
1️⃣ Start off by using the <b>/category</b> command and use the available buttons from there on.
2️⃣ Send individual <b>@BotList</b> categories to your friends via inline search (i.e. type <b>@botlistbot music</b> in any chat).
3️⃣ Add me to your groups and <b>/subscribe</b> to BotList updates.
4️⃣ Join the <b>@BotListChat</b> community and <b>/contribute</b> to the BotList: <b>#new @newbot</b>🖊 - description

You can send or forward any bot <b>@username</b> to me, and I will tell you if it exists in the <b>@BotList</b>.

<b>ONE STEP CLOSER TO WORLD DOMINATION</b> 👑`;

			await ctx.reply(welcomeMessage, {
				parse_mode: 'HTML',
				reply_markup: new InlineKeyboard()
					.row(
						{ text: '❓ Help', callback_data: 'help' },
						{ text: '🔍 Contributing', callback_data: 'contributing' },
						{ text: '📝 Examples', callback_data: 'examples' }
					)
					.row({ text: 'Try me inline!', callback_data: 'try_inline' })
			});
		});

		bot.on('callback_query', async (ctx) => {
			const callbackData = ctx.callbackQuery.data;
			console.log(`Callback received: ${callbackData}, Message ID: ${ctx.callbackQuery.message?.message_id}`); // Log callback data and message ID
			
			await ctx.answerCallbackQuery();

			try {
			
			if (callbackData === 'help') {
				const welcomeMessage = `I'm the bot in charge of maintaining the <b>@BotList</b> channel, the most reliable and unbiased bot catalog out there. I was built to simplify navigation and to automate the process of submitting, reviewing and publishing bots by the <b>@BotListChat</b> community.

🔘 <b>First steps:</b>
1️⃣ Start off by using the <b>/category</b> command and use the available buttons from there on.
2️⃣ Send individual <b>@BotList</b> categories to your friends via inline search (i.e. type <b>@botlistbot music</b> in any chat).
3️⃣ Add me to your groups and <b>/subscribe</b> to BotList updates.
4️⃣ Join the <b>@BotListChat</b> community and <b>/contribute</b> to the BotList: <b>#new @newbot</b>🖊 - description

You can send or forward any bot <b>@username</b> to me, and I will tell you if it exists in the <b>@BotList</b>.

<b>ONE STEP CLOSER TO WORLD DOMINATION</b> 👑`;
				
				await ctx.editMessageText(welcomeMessage, {
					parse_mode: 'HTML',
					reply_markup: new InlineKeyboard()
						.row(
							{ text: '❓ Help', callback_data: 'help' },
							{ text: '🔍 Contributing', callback_data: 'contributing' },
							{ text: '📝 Examples', callback_data: 'examples' }
						)
						.row({ text: 'Try me inline!', callback_data: 'try_inline' })
				});
			} else if (callbackData === 'contributing') {
				const contributingMessage = `You can use the following <b>#tags</b> with a bot <b>@username</b> to contribute to the BotList:

• <b>#new</b> — Submit a fresh bot. Use 🔎 if it supports inline queries and flag emojis to denote the language. Everything after the – character can be your description of the bot.
• <b>#offline</b> — Mark a bot as offline.
• <b>#spam</b> — Tell us that a bot spams too much.

There are also the corresponding <b>/new</b>, <b>/offline</b> and <b>/spam</b> commands. The moderators will approve your submission as soon as possible.

<b>Next step:</b> Have a look at the <b>/examples</b>!`;

				await ctx.editMessageText(contributingMessage, {
					parse_mode: 'HTML',
					reply_markup: new InlineKeyboard()
						.row(
							{ text: '❓ Help', callback_data: 'help' },
							{ text: '🔍 Contributing', callback_data: 'contributing' },
							{ text: '📝 Examples', callback_data: 'examples' }
						)
						.row({ text: 'Try me inline!', callback_data: 'try_inline' })
				});
			} else if (callbackData === 'examples') {
				const examplesMessage = `<b>Examples</b> for contributing to the BotList:

• "Wow! I found this nice <b>#new</b> bot: <b>@coolbot</b> 🔎 🇮🇹 - Cools your drinks in the fridge."
• <b>/new @coolbot</b> 🔎 🇮🇹 - Cools your drinks in the fridge.

• "Oh no... guys?! <b>@unresponsive_bot</b> is <b>#offline</b> 😫"
• <b>/offline @unresponsive_bot</b>

• "Aaaargh, <b>@spambot</b>'s <b>#spam</b> is too crazy!"
• <b>/spam @spambot</b>`;
				
				await ctx.editMessageText(examplesMessage, {
					parse_mode: 'HTML',
					reply_markup: new InlineKeyboard()
						.row(
							{ text: '❓ Help', callback_data: 'help' },
							{ text: '🔍 Contributing', callback_data: 'contributing' },
							{ text: '📝 Examples', callback_data: 'examples' }
						)
						.row({ text: 'Try me inline!', callback_data: 'try_inline' })
				});
			} else if (callbackData === 'try_inline') {
				// Handle Try me inline button click
				// Implementation will be added later
				await ctx.editMessageText('You can try me inline by typing <b>@botlistbot</b> in any chat.', {
					parse_mode: 'HTML',
					reply_markup: new InlineKeyboard()
						.row(
							{ text: '❓ Help', callback_data: 'help' },
							{ text: '🔍 Contributing', callback_data: 'contributing' },
							{ text: '📝 Examples', callback_data: 'examples' }
						)
						.row({ text: 'Try me inline!', callback_data: 'try_inline' })
				});
			}
			} catch (error) {
				console.error(`Error processing callback ${callbackData} for message ${ctx.callbackQuery.message?.message_id}:`, error);
				// Optionally, inform the user about the error via reply if editing failed
				await ctx.reply("Sorry, I couldn't update the message. Please try again.").catch(e => console.error("Failed to send error reply:", e));
			}
		});

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

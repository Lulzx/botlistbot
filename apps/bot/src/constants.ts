export const MESSAGES = {
	WELCOME: `I'm the bot in charge of maintaining the <b>@BotList</b> channel, the most reliable and unbiased bot catalog out there. I was built to simplify navigation and to automate the process of submitting, reviewing and publishing bots by the <b>@BotListChat</b> community.

🔘 <b>First steps:</b>
1️⃣ Start off by using the <b>/category</b> command and use the available buttons from there on.
2️⃣ Send individual <b>@BotList</b> categories to your friends via inline search (i.e. type <b>@botlistbot music</b> in any chat).
3️⃣ Add me to your groups and <b>/subscribe</b> to BotList updates.
4️⃣ Join the <b>@BotListChat</b> community and contribute to the BotList with <b>/new @yourbot</b>

You can send or forward any bot <b>@username</b> to me, and I will tell you if it exists in the <b>@BotList</b>.

<b>ONE STEP CLOSER TO WORLD DOMINATION</b> 👑`,

	HELP: `<b>Available Commands:</b>

<b>User Commands:</b>
/start - Start the bot
/help - Show this help message
/category - Browse bot categories
/explore - Discover random bots
/search - Search the BotList
/favorites - Manage your favorite bots
/favorite - Add a bot to your favorites
/new - Submit a new bot
/spam - Report a spammy bot
/newbots - See recently added bots
/bestbots - View top-rated bots
/mybots - See your submitted bots
/subscribe - Get update notifications
/unsubscribe - Disable notifications
/rules - View BotListChat rules

<b>Try me inline:</b> Type <b>@botlistbot</b> in any chat to search!`,

	CONTRIBUTING: `You can use the following <b>#tags</b> with a bot <b>@username</b> to contribute to the BotList:

• <b>#new</b> — Submit a fresh bot. Use 🔎 if it supports inline queries and flag emojis to denote the language. Everything after the – character can be your description of the bot.
• <b>#offline</b> — Mark a bot as offline.
• <b>#spam</b> — Tell us that a bot spams too much.

There are also the corresponding <b>/new</b>, <b>/offline</b> and <b>/spam</b> commands. The moderators will approve your submission as soon as possible.

<b>Next step:</b> Have a look at the <b>/examples</b>!`,

	EXAMPLES: `<b>Examples</b> for contributing to the BotList:

• "Wow! I found this nice <b>#new</b> bot: <b>@coolbot</b> 🔎 🇮🇹 - Cools your drinks in the fridge."
• <b>/new @coolbot</b> 🔎 🇮🇹 - Cools your drinks in the fridge.

• "Oh no... guys?! <b>@unresponsive_bot</b> is <b>#offline</b> 😫"
• <b>/offline @unresponsive_bot</b>

• "Aaaargh, <b>@spambot</b>'s <b>#spam</b> is too crazy!"
• <b>/spam @spambot</b>`,

	TRY_INLINE: 'You can try me inline by typing <b>@botlistbot</b> in any chat.',
	ERROR: "Sorry, I couldn't update the message. Please try again.",

	// New command messages
	EXPLORE_INTRO: '🔮 <b>Explore Random Bots</b>\n\nHere are some bots you might like:',
	EXPLORE_EMPTY: '🤷 No bots available right now. Try again later!',

	FAVORITES_INTRO: '⭐️ <b>Your Favorite Bots</b>',
	FAVORITES_EMPTY:
		"You don't have any favorite bots yet.\n\nUse the buttons below to add one, or browse /category to find bots you like!",
	FAVORITES_ADD_PROMPT: 'Send me a bot @username to add to your favorites:',
	FAVORITES_ADDED: '✅ Bot added to your favorites!',
	FAVORITES_REMOVED: '✅ Bot removed from your favorites.',
	FAVORITES_NOT_FOUND: '❌ This bot is not in the BotList database.',
	FAVORITES_ALREADY: '⚠️ This bot is already in your favorites.',

	SEARCH_PROMPT: '🔍 <b>Search the BotList</b>\n\nSend me a search query (bot name, username, or description):',
	SEARCH_RESULTS: '🔍 <b>Search Results</b>',
	SEARCH_EMPTY: '🤷 No bots found matching your query.',
	SEARCH_TOO_SHORT: '⚠️ Please enter at least 3 characters to search.',

	NEW_BOT_PROMPT: `📝 <b>Submit a New Bot</b>

To submit a bot, send me the bot's @username followed by a description.

<b>Format:</b>
<code>/new @botusername - Description of what the bot does</code>

<b>Example:</b>
<code>/new @weatherbot 🌤 - Get weather forecasts for any city</code>`,
	NEW_BOT_SUCCESS: '✅ Your bot has been submitted for review! The moderators will check it soon.',
	NEW_BOT_EXISTS: '⚠️ This bot is already in the BotList.',
	NEW_BOT_PENDING: '⚠️ This bot has already been submitted and is pending review.',
	NEW_BOT_INVALID: '❌ Please provide a valid bot @username.',
	NEW_BOT_BANNED: '🚫 You are banned from submitting bots.',

	SPAM_PROMPT: '🚨 <b>Report Spam</b>\n\nSend me the @username of the bot that spams:',
	SPAM_SUCCESS: '✅ Thank you! Your spam report has been submitted.',
	SPAM_NOT_FOUND: '❌ This bot is not in the BotList database.',
	SPAM_ALREADY: '⚠️ You have already reported this bot.',
	SPAM_BANNED: '🚫 You are banned from reporting.',

	OFFLINE_PROMPT: '🔌 <b>Report Offline Bot</b>\n\nSend me the @username of the bot that is offline:',
	OFFLINE_SUCCESS: '✅ Thank you! The bot has been reported as offline.',
	OFFLINE_NOT_FOUND: '❌ This bot is not in the BotList database.',
	OFFLINE_ALREADY: '⚠️ This bot has already been reported as offline.',
	OFFLINE_BANNED: '🚫 You are banned from reporting.',

	NEWBOTS_INTRO: '🆕 <b>Recently Added Bots</b>',
	NEWBOTS_EMPTY: '🤷 No new bots added recently.',

	BESTBOTS_INTRO: '🏆 <b>Top Rated Bots</b>',
	BESTBOTS_EMPTY: '🤷 No rated bots available yet.',

	MYBOTS_INTRO: '🤖 <b>Your Submitted Bots</b>',
	MYBOTS_EMPTY: "You haven't submitted any bots yet.\n\nUse /new to submit your first bot!",

	SUBSCRIBE_SUCCESS: '✅ You are now subscribed to BotList updates! You will receive notifications when new bots are added.',
	SUBSCRIBE_ALREADY: '⚠️ You are already subscribed to updates.',
	UNSUBSCRIBE_SUCCESS: '✅ You have been unsubscribed from BotList updates.',
	UNSUBSCRIBE_NOT_FOUND: "⚠️ You weren't subscribed to updates.",

	RULES: `📜 <b>BotListChat Rules</b>

1️⃣ <b>Be respectful</b> - Treat everyone with respect. No harassment, hate speech, or personal attacks.

2️⃣ <b>Stay on topic</b> - Keep discussions related to Telegram bots and the BotList.

3️⃣ <b>No spam</b> - Don't spam the chat with repetitive messages or promotions.

4️⃣ <b>Quality submissions</b> - Only submit working, useful bots. No scam or malicious bots.

5️⃣ <b>English preferred</b> - Please use English for better communication.

6️⃣ <b>No self-promotion abuse</b> - You can share your bots, but don't overdo it.

7️⃣ <b>Follow Telegram ToS</b> - All bots must comply with Telegram's Terms of Service.

Violating these rules may result in being banned from the bot and chat.`,

	// Admin messages
	ADMIN_BAN_SUCCESS: '✅ User has been banned.',
	ADMIN_BAN_USAGE: '⚠️ Usage: /ban {userId}',
	ADMIN_UNBAN_SUCCESS: '✅ User has been unbanned.',
	ADMIN_UNBAN_USAGE: '⚠️ Usage: /unban {userId}',
	ADMIN_UNBAN_NOT_FOUND: '❌ User not found.',
	ADMIN_USERINFO_USAGE: '⚠️ Usage: /userinfo {userId}',
	ADMIN_USERINFO_NOT_FOUND: '❌ User not found.',
	ADMIN_UNAUTHORIZED: '🚫 You are not authorized to use this command.',
} as const;

export const CATEGORIES = [
	{ id: 1, name: '🌿 Miscellaneous' },
	{ id: 2, name: '👥 Social' },
	{ id: 3, name: '🙋‍♂️ Promoting' },
	{ id: 4, name: '🛍 Shopping' },
	{ id: 5, name: '😂 Humor' },
	{ id: 6, name: '🎮 Gaming' },
	{ id: 7, name: '🏋️‍♂️ HTML5 Games' },
	{ id: 8, name: '🤖 Bot creating' },
	{ id: 9, name: '⚒ Sticker pack creation' },
	{ id: 10, name: "🧸 Stickers & Gif's" },
	{ id: 11, name: '🍟 Video' },
	{ id: 12, name: '📸 Photography' },
	{ id: 13, name: '🎧 Music' },
	{ id: 14, name: '⚽ Sports' },
	{ id: 15, name: '☔️ Weather' },
	{ id: 16, name: '📰 News' },
	{ id: 17, name: '✈️ Places & Traveling' },
	{ id: 18, name: '📞 Android & Tech News' },
	{ id: 19, name: '📲 Apps & software' },
	{ id: 20, name: '📚 Books & Magazines' },
	{ id: 21, name: '📓 Translation and dictionaries' },
	{ id: 22, name: "💳 Public ID's" },
	{ id: 23, name: '📝 Text Formatting' },
	{ id: 24, name: '📦 Multiuse' },
	{ id: 25, name: '🛠️ Group & channel tools' },
	{ id: 26, name: '🍃 Inline Web Search' },
	{ id: 27, name: '⏰ Organization and reminders' },
	{ id: 28, name: '⚙️ Tools' },
] as const;

export const CATEGORY_NAMES = Object.fromEntries(CATEGORIES.map((cat) => [cat.id, cat.name])) as Record<number, string>;

export const MESSAGES = {
  WELCOME: `I'm the bot in charge of maintaining the <b>@BotList</b> channel, the most reliable and unbiased bot catalog out there. I was built to simplify navigation and to automate the process of submitting, reviewing and publishing bots by the <b>@BotListChat</b> community.

🔘 <b>First steps:</b>
1️⃣ Start off by using the <b>/categories</b> command and use the available buttons from there on.
2️⃣ Send individual <b>@BotList</b> categories to your friends via inline search (i.e. type <b>@botlistbot music</b> in any chat).
3️⃣ Add me to your groups and <b>/subscribe</b> to BotList updates.
4️⃣ Join the <b>@BotListChat</b> community and <b>/contribute</b> to the BotList: <b>#new @newbot</b>🖊 - description

You can send or forward any bot <b>@username</b> to me, and I will tell you if it exists in the <b>@BotList</b>.

<b>ONE STEP CLOSER TO WORLD DOMINATION</b> 👑`,

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
  ERROR: "Sorry, I couldn't update the message. Please try again."
} as const;

import { Composer } from "grammy/web";
import { fetchFromApi, Bot } from "../api";


export const composer = new Composer();

export default composer;


composer.on("chosen_inline_result", async (ctx) => {
    const chosenInlineResult = ctx.chosenInlineResult;

    const result_id: string = chosenInlineResult.result_id;
    if (result_id.startsWith("CAT ")) {
        const [bug, off, cnt, categoryId] = result_id.split(" ");
        const bots = await fetchFromApi<Bot[]>(`/bots/category/${categoryId}`, ctx.env.API_BASE_URL);
        if (bots.length === 0) {
            // await ctx.editMessageText(`🤷 No bots found in ${categoryId}.`);
        }
        else {
            const botList = bots
                .map(bot => `• ${bot.username} - ${bot.name}`)
                .join('\n').substring(0, 4083);
            await ctx.editMessageText(`Bots in ${categoryId}:\n${botList}`);
        }
    }

    else {

    }
});

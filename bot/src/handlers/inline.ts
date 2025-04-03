import { Composer, InlineQueryResultBuilder } from "grammy/web";
import { fetchFromApi,  Category } from "../api";


export const composer = new Composer();

export default composer;

composer.on("inline_query", async (ctx) => {
    const inlineQuery = ctx.inlineQuery;
    const query = inlineQuery.query;
    const offset = ctx.inlineQuery.offset || "0";

    if (query.trim() === "") {
        // empty query fill it with categories option
        const categories = await fetchFromApi<Category[]>(`/categories`, ctx.env.API_BASE_URL);
        let count = 0;
        const results = [];
        for (const category of categories) {
            if (count > 49) {
                // TODO: handle pagination, if required
                break;
            }
            results.push(
                InlineQueryResultBuilder.article(
                    `CAT ${offset} ${count} ${category.id}`,
                    `Category ${category.name}`,
                    {
                        // thumbnail_url: "",
                        // thumbnail_width: 750,
                        // thumbnail_height: 750,
                        // url: "",
                        // description: ``,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Loading ...",
                                        url: "https://example.com",
                                    },
                                ]
                            ]
                        },
                    }
                ).text(
                    `Loading bots in Category ${category.name} `,
                    {
                        parse_mode: "HTML",
                        link_preview_options: {
                            is_disabled: true,
                        }
                    }
                )
            );
            count = count + 1;
        }
        return await ctx.answerInlineQuery(
            results,
            {
                cache_time: 0,  // TODO: update
                button: {
                    text: `Found ${count} categories`,
                    start_parameter: "inline"
                },
                next_offset: "",
                is_personal: true
            }
        );
    }
    else {
        // TODO: add search
        return await ctx.answerInlineQuery(
            [],
            {
                cache_time: 0,  // TODO: update
                button: {
                    text: `TODO not implemented`,
                    start_parameter: "inline"
                },
                next_offset: "",
                is_personal: true
            }
        );
    }
});

import { Composer } from "grammy/web";
import { MyContext } from "../types";

export const composer = new Composer<MyContext>();

import start from "./start";
composer.use(start);

import categories from "./categories";
composer.use(categories);

import callback_queries from "./callback";
composer.use(callback_queries);

composer.use(
    (ctx) => console.log("UnHandled update", JSON.stringify(ctx))
);


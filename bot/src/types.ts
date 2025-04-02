import { Context } from "grammy/web";

export interface Env {
  BOT_TOKEN: string;
  API_URL: string;
}

export type HonoContext = {
  Bindings: Env;
};

export interface BotConfig {
    botToken: string;
    botApiUrl: string;
}

export type MyContext = Context & {
    botConfig: BotConfig;
};

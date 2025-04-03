import { Context } from "grammy/web";

export interface Env {
  BOT_TOKEN: string;
  API_BASE_URL: string;
}

export type HonoContext = {
  Bindings: Env;
}

export type MyContext = Context & {
    env: Env;
};

import type { Context } from 'grammy/web';

export interface Env {
	BOT_TOKEN: string;
	DB: D1Database;
	ADMIN_IDS: string;
}

export type HonoContext = {
	Bindings: Env;
};

export type MyContext = Context & {
	env: Env;
};

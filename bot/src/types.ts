export interface Env {
  BOT_TOKEN: string;
  API_URL: string;
}

export type HonoContext = {
  Bindings: Env;
};

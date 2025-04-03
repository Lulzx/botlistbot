export interface Env {
  DB: D1Database;
}

export type HonoContext = {
  Bindings: Env;
}

export interface Bot {
  id: number;
  name: string;
  username: string;
  description: string;
  category_id: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export type CategoriesResponse = Category[];
export type BotsResponse = Bot[];
export type ErrorResponse = {
  error: string;
};

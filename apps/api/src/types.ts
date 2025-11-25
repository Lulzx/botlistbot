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
  submitted_by?: number;
  approved: boolean;
  offline: boolean;
  spam: boolean;
  rating_count: number;
  rating_sum: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  banned: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Favorite {
  id: number;
  user_id: number;
  bot_id: number;
  created_at: string;
}

export interface Subscription {
  id: number;
  chat_id: number;
  user_id: number;
  active: boolean;
  created_at: string;
}

export interface SpamReport {
  id: number;
  bot_id: number;
  reported_by: number;
  reason?: string;
  created_at: string;
}

export interface BotSubmission {
  id: number;
  username: string;
  name: string;
  description: string;
  category_id: number;
  submitted_by: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type CategoriesResponse = Category[];
export type BotsResponse = Bot[];
export type ErrorResponse = {
  error: string;
};

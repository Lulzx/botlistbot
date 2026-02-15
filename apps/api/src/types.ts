export interface Env {
  DB: D1Database;
  ADMIN_IDS?: string;
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
  country_id?: number;
  inlinequeries: number;
  created_at: string;
  updated_at: string;
}

import type { Category } from "@botlistbot/shared";
export type { Category } from "@botlistbot/shared";

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
  submitter_telegram_id?: number | null;
  submitter_username?: string | null;
}

export interface Keyword {
  id: number;
  name: string;
  bot_id: number;
  created_at: string;
}

export interface Suggestion {
  id: number;
  user_id: number;
  bot_id: number;
  action: string;
  value?: string;
  executed: number;
  created_at: string;
  // Joined fields
  bot_username?: string;
  bot_name?: string;
  user_telegram_id?: number;
  username?: string;
}

export interface Statistic {
  id: number;
  user_id?: number;
  action: string;
  entity?: string;
  level: number;
  created_at: string;
}

export interface Country {
  id: number;
  name: string;
  emoji: string;
}

export type CategoriesResponse = Category[];
export type BotsResponse = Bot[];
export type ErrorResponse = {
  error: string;
};

export interface Bot {
	id: number;
	name: string;
	username: string;
	description: string;
	category_id: number;
	submitted_by?: number;
	approved?: boolean;
	offline?: boolean;
	spam?: boolean;
	rating_count?: number;
	rating_sum?: number;
	avg_rating?: number;
	country_id?: number;
	inlinequeries?: number;
	keywords?: string[];
	created_at: string;
	updated_at: string;
}

export interface User {
	id: number;
	telegram_id: number;
	username?: string;
	first_name?: string;
	banned: number;
	is_admin: number;
	created_at: string;
}

export interface BotSubmission {
	id: number;
	username: string;
	name: string;
	description: string;
	category_id: number;
	submitted_by: number;
	inlinequeries?: number;
	status: 'pending' | 'approved' | 'rejected';
	created_at: string;
	submitter_telegram_id?: number | null;
	submitter_username?: string | null;
}

export interface UserSubmissions {
	approved: Bot[];
	pending: BotSubmission[];
}

export interface UserInfo {
	user: User;
	submitted_bots: Bot[];
	pending_submissions: BotSubmission[];
	spam_reports: Array<{ id: number; bot_id: number; bot_username: string; reason?: string; created_at: string }>;
}

export interface Suggestion {
	id: number;
	user_id: number;
	bot_id: number;
	action: string;
	value?: string;
	executed: number;
	created_at: string;
	bot_username?: string;
	bot_name?: string;
	user_telegram_id?: number;
	username?: string;
}

export interface Keyword {
	id: number;
	name: string;
	bot_id: number;
	created_at: string;
}

export interface StatisticsSummary {
	actions: Array<{ action: string; count: number }>;
	totals: {
		bots: number;
		users: number;
		favorites: number;
		pending_suggestions: number;
	};
}

export interface Statistic {
	id: number;
	user_id?: number;
	telegram_id?: number;
	action: string;
	entity?: string;
	level: number;
	created_at: string;
	// Populated by JOIN in getStatistics
	user_telegram_id?: number;
	username?: string;
}

export interface Country {
	id: number;
	name: string;
	emoji: string;
}

export interface ApiResponse {
	success?: boolean;
	message?: string;
	error?: string;
}


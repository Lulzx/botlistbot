export interface Category {
	id: number;
	name: string;
}

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
	created_at: string;
	updated_at: string;
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

export interface ApiResponse {
	success?: boolean;
	message?: string;
	error?: string;
}

export async function fetchFromApi<T>(endpoint: string, apiBaseUrl: string, apiService?: Fetcher): Promise<T> {
	console.log(`Fetching from API - endpoint: ${endpoint}`);

	try {
		let response: Response;

		if (apiService) {
			// Use service binding for direct Worker-to-Worker communication
			console.log(`Using service binding for endpoint: ${endpoint}`);
			// For service bindings, we need to provide the full request object
			response = await apiService.fetch(
				new Request(`https://dummy.host${endpoint}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				}),
			);
		} else {
			// Fallback to HTTP request
			const url = `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;
			console.log(`Using HTTP request to: ${url}`);
			response = await fetch(url);
		}

		console.log(`Response status: ${response.status}, statusText: ${response.statusText}`);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API Error (${response.status}): ${errorText}`);
			throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
		}

		const data = (await response.json()) as T;
		console.log(`Successfully fetched data, length: ${Array.isArray(data) ? data.length : 'N/A'}`);
		return data;
	} catch (error) {
		console.error(`Fetch error: ${error}`);
		throw error;
	}
}

export async function postToApi<T>(endpoint: string, body: Record<string, unknown>, apiBaseUrl: string, apiService?: Fetcher): Promise<T> {
	console.log(`POST to API - endpoint: ${endpoint}`);

	try {
		let response: Response;

		if (apiService) {
			response = await apiService.fetch(
				new Request(`https://dummy.host${endpoint}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
				}),
			);
		} else {
			const url = `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});
		}

		console.log(`Response status: ${response.status}, statusText: ${response.statusText}`);

		const data = (await response.json()) as T;
		return data;
	} catch (error) {
		console.error(`POST error: ${error}`);
		throw error;
	}
}

export async function deleteFromApi<T>(endpoint: string, apiBaseUrl: string, apiService?: Fetcher): Promise<T> {
	console.log(`DELETE from API - endpoint: ${endpoint}`);

	try {
		let response: Response;

		if (apiService) {
			response = await apiService.fetch(
				new Request(`https://dummy.host${endpoint}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
				}),
			);
		} else {
			const url = `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;
			response = await fetch(url, {
				method: 'DELETE',
			});
		}

		console.log(`Response status: ${response.status}, statusText: ${response.statusText}`);

		const data = (await response.json()) as T;
		return data;
	} catch (error) {
		console.error(`DELETE error: ${error}`);
		throw error;
	}
}

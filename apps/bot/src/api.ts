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
	created_at: string;
	updated_at: string;
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

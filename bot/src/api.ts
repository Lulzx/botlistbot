export interface Category {
  id: number;
  name: string;
}

export interface Bot {
  id: number;
  revision: number;
  category_id: number;
  name: string;
  username: string;
  description: string;
  date_added: string;
  approved: number;
}

export async function fetchFromApi<T>(endpoint: string, apiBaseUrl: string): Promise<T> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;
  console.log(`Fetching from API: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${response.status}): ${errorText}`);
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

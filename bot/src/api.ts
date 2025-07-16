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

export async function fetchFromApi<T>(endpoint: string, apiBaseUrl: string, apiService?: Fetcher): Promise<T> {
  console.log(`Fetching from API - endpoint: ${endpoint}`);
  
  try {
    let response: Response;
    
    if (apiService) {
      // Use service binding for direct Worker-to-Worker communication
      console.log(`Using service binding for endpoint: ${endpoint}`);
      response = await apiService.fetch(`https://api${endpoint}`);
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
    
    const data = await response.json() as T;
    console.log(`Successfully fetched data, length: ${Array.isArray(data) ? data.length : 'N/A'}`);
    return data;
  } catch (error) {
    console.error(`Fetch error: ${error}`);
    throw error;
  }
}

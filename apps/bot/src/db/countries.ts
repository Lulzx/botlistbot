import type { Country } from './types';

export async function getCountries(db: D1Database): Promise<Country[]> {
	const { results } = await db.prepare('SELECT * FROM countries ORDER BY name').all<Country>();
	return results;
}

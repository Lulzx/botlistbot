// Bot configuration

// Parse admin IDs from environment variable (comma-separated)
export function getAdminIds(env: { ADMIN_IDS?: string }): number[] {
	if (!env.ADMIN_IDS) return [];
	return env.ADMIN_IDS.split(',').map((id) => Number.parseInt(id.trim(), 10)).filter((id) => !Number.isNaN(id));
}

// Check if a user ID is an admin
export function isAdminId(userId: number, env: { ADMIN_IDS?: string }): boolean {
	return getAdminIds(env).includes(userId);
}

// Bot configuration

// Admin user IDs (Telegram user IDs)
export const ADMIN_IDS: number[] = [691609650, 62056065];

// Check if a user ID is an admin
export function isAdminId(userId: number): boolean {
	return ADMIN_IDS.includes(userId);
}

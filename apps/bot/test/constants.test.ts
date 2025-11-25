import { describe, it, expect } from 'vitest';
import { MESSAGES, CATEGORIES, CATEGORY_NAMES } from '../src/constants';

describe('constants', () => {
	describe('MESSAGES', () => {
		it('should have a WELCOME message', () => {
			expect(MESSAGES.WELCOME).toBeDefined();
			expect(typeof MESSAGES.WELCOME).toBe('string');
			expect(MESSAGES.WELCOME.length).toBeGreaterThan(0);
		});

		it('should have a HELP message with all commands', () => {
			expect(MESSAGES.HELP).toBeDefined();
			expect(MESSAGES.HELP).toContain('/start');
			expect(MESSAGES.HELP).toContain('/help');
			expect(MESSAGES.HELP).toContain('/category');
			expect(MESSAGES.HELP).toContain('/explore');
			expect(MESSAGES.HELP).toContain('/favorites');
			expect(MESSAGES.HELP).toContain('/search');
			expect(MESSAGES.HELP).toContain('/new');
			expect(MESSAGES.HELP).toContain('/spam');
			expect(MESSAGES.HELP).toContain('/subscribe');
			expect(MESSAGES.HELP).toContain('/rules');
		});

		it('should have all required user command messages', () => {
			expect(MESSAGES.EXPLORE_INTRO).toBeDefined();
			expect(MESSAGES.FAVORITES_INTRO).toBeDefined();
			expect(MESSAGES.FAVORITES_EMPTY).toBeDefined();
			expect(MESSAGES.SEARCH_PROMPT).toBeDefined();
			expect(MESSAGES.NEW_BOT_PROMPT).toBeDefined();
			expect(MESSAGES.SPAM_PROMPT).toBeDefined();
			expect(MESSAGES.OFFLINE_PROMPT).toBeDefined();
			expect(MESSAGES.NEWBOTS_INTRO).toBeDefined();
			expect(MESSAGES.BESTBOTS_INTRO).toBeDefined();
			expect(MESSAGES.MYBOTS_INTRO).toBeDefined();
			expect(MESSAGES.RULES).toBeDefined();
		});

		it('should have all required success messages', () => {
			expect(MESSAGES.NEW_BOT_SUCCESS).toBeDefined();
			expect(MESSAGES.SPAM_SUCCESS).toBeDefined();
			expect(MESSAGES.OFFLINE_SUCCESS).toBeDefined();
			expect(MESSAGES.SUBSCRIBE_SUCCESS).toBeDefined();
			expect(MESSAGES.UNSUBSCRIBE_SUCCESS).toBeDefined();
			expect(MESSAGES.FAVORITES_ADDED).toBeDefined();
			expect(MESSAGES.FAVORITES_REMOVED).toBeDefined();
		});

		it('should have all required error messages', () => {
			expect(MESSAGES.ERROR).toBeDefined();
			expect(MESSAGES.NEW_BOT_INVALID).toBeDefined();
			expect(MESSAGES.NEW_BOT_BANNED).toBeDefined();
			expect(MESSAGES.SPAM_NOT_FOUND).toBeDefined();
			expect(MESSAGES.SPAM_BANNED).toBeDefined();
			expect(MESSAGES.OFFLINE_NOT_FOUND).toBeDefined();
			expect(MESSAGES.OFFLINE_BANNED).toBeDefined();
		});

		it('should have all required admin messages', () => {
			expect(MESSAGES.ADMIN_BAN_SUCCESS).toBeDefined();
			expect(MESSAGES.ADMIN_BAN_USAGE).toBeDefined();
			expect(MESSAGES.ADMIN_UNBAN_SUCCESS).toBeDefined();
			expect(MESSAGES.ADMIN_UNBAN_USAGE).toBeDefined();
			expect(MESSAGES.ADMIN_USERINFO_USAGE).toBeDefined();
			expect(MESSAGES.ADMIN_UNAUTHORIZED).toBeDefined();
		});
	});

	describe('CATEGORIES', () => {
		it('should have 28 categories', () => {
			expect(CATEGORIES).toHaveLength(28);
		});

		it('should have valid category structure', () => {
			for (const category of CATEGORIES) {
				expect(category).toHaveProperty('id');
				expect(category).toHaveProperty('name');
				expect(typeof category.id).toBe('number');
				expect(typeof category.name).toBe('string');
				expect(category.id).toBeGreaterThan(0);
				expect(category.name.length).toBeGreaterThan(0);
			}
		});

		it('should have unique category IDs', () => {
			const ids = CATEGORIES.map((c) => c.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(CATEGORIES.length);
		});

		it('should have sequential IDs from 1 to 28', () => {
			const ids = CATEGORIES.map((c) => c.id).sort((a, b) => a - b);
			for (let i = 0; i < ids.length; i++) {
				expect(ids[i]).toBe(i + 1);
			}
		});

		it('should include expected categories', () => {
			const names = CATEGORIES.map((c) => c.name);
			expect(names.some((n) => n.includes('Music'))).toBe(true);
			expect(names.some((n) => n.includes('Gaming'))).toBe(true);
			expect(names.some((n) => n.includes('Tools'))).toBe(true);
			expect(names.some((n) => n.includes('News'))).toBe(true);
		});
	});

	describe('CATEGORY_NAMES', () => {
		it('should be a mapping from ID to name', () => {
			expect(typeof CATEGORY_NAMES).toBe('object');
			expect(Object.keys(CATEGORY_NAMES)).toHaveLength(28);
		});

		it('should match CATEGORIES data', () => {
			for (const category of CATEGORIES) {
				expect(CATEGORY_NAMES[category.id]).toBe(category.name);
			}
		});

		it('should return undefined for invalid IDs', () => {
			expect(CATEGORY_NAMES[0]).toBeUndefined();
			expect(CATEGORY_NAMES[29]).toBeUndefined();
			expect(CATEGORY_NAMES[-1]).toBeUndefined();
		});
	});
});

import { describe, it, expect } from 'vitest';
import { ADMIN_IDS, isAdminId } from '../src/config';

describe('config', () => {
	describe('ADMIN_IDS', () => {
		it('should contain the expected admin IDs', () => {
			expect(ADMIN_IDS).toContain(691609650);
			expect(ADMIN_IDS).toContain(62056065);
		});

		it('should be an array of numbers', () => {
			expect(Array.isArray(ADMIN_IDS)).toBe(true);
			for (const id of ADMIN_IDS) {
				expect(typeof id).toBe('number');
			}
		});
	});

	describe('isAdminId', () => {
		it('should return true for valid admin IDs', () => {
			expect(isAdminId(691609650)).toBe(true);
			expect(isAdminId(62056065)).toBe(true);
		});

		it('should return false for non-admin IDs', () => {
			expect(isAdminId(123456789)).toBe(false);
			expect(isAdminId(0)).toBe(false);
			expect(isAdminId(-1)).toBe(false);
		});

		it('should handle edge cases', () => {
			expect(isAdminId(Number.MAX_SAFE_INTEGER)).toBe(false);
			expect(isAdminId(Number.MIN_SAFE_INTEGER)).toBe(false);
		});
	});
});

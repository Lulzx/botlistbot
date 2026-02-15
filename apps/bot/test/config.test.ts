import { describe, it, expect } from 'vitest';
import { getAdminIds, isAdminId } from '../src/config';
import { mockEnv } from './fixtures';

describe('config', () => {
	describe('getAdminIds', () => {
		it('should parse comma-separated admin IDs from env', () => {
			const ids = getAdminIds(mockEnv);
			expect(ids).toContain(691609650);
			expect(ids).toContain(62056065);
			expect(ids).toContain(140294235);
		});

		it('should return an array of numbers', () => {
			const ids = getAdminIds(mockEnv);
			expect(Array.isArray(ids)).toBe(true);
			for (const id of ids) {
				expect(typeof id).toBe('number');
			}
		});

		it('should return empty array when ADMIN_IDS is not set', () => {
			expect(getAdminIds({})).toEqual([]);
			expect(getAdminIds({ ADMIN_IDS: undefined })).toEqual([]);
		});

		it('should handle whitespace in IDs', () => {
			const ids = getAdminIds({ ADMIN_IDS: ' 123 , 456 ' });
			expect(ids).toEqual([123, 456]);
		});
	});

	describe('isAdminId', () => {
		it('should return true for valid admin IDs', () => {
			expect(isAdminId(691609650, mockEnv)).toBe(true);
			expect(isAdminId(62056065, mockEnv)).toBe(true);
			expect(isAdminId(140294235, mockEnv)).toBe(true);
		});

		it('should return false for non-admin IDs', () => {
			expect(isAdminId(123456789, mockEnv)).toBe(false);
			expect(isAdminId(0, mockEnv)).toBe(false);
			expect(isAdminId(-1, mockEnv)).toBe(false);
		});

		it('should handle edge cases', () => {
			expect(isAdminId(Number.MAX_SAFE_INTEGER, mockEnv)).toBe(false);
			expect(isAdminId(Number.MIN_SAFE_INTEGER, mockEnv)).toBe(false);
		});

		it('should return false when no env is configured', () => {
			expect(isAdminId(691609650, {})).toBe(false);
		});
	});
});

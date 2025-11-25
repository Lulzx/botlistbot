import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Bot, Category, User, BotSubmission, UserSubmissions, UserInfo, ApiResponse } from '../src/api';

// Test type definitions
describe('API Types', () => {
	describe('Category', () => {
		it('should have correct structure', () => {
			const category: Category = {
				id: 1,
				name: 'Test Category',
			};

			expect(category.id).toBe(1);
			expect(category.name).toBe('Test Category');
		});
	});

	describe('Bot', () => {
		it('should have required fields', () => {
			const bot: Bot = {
				id: 1,
				name: 'Test Bot',
				username: 'testbot',
				description: 'A test bot',
				category_id: 1,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
			};

			expect(bot.id).toBe(1);
			expect(bot.name).toBe('Test Bot');
			expect(bot.username).toBe('testbot');
			expect(bot.description).toBe('A test bot');
			expect(bot.category_id).toBe(1);
		});

		it('should support optional fields', () => {
			const bot: Bot = {
				id: 1,
				name: 'Test Bot',
				username: 'testbot',
				description: 'A test bot',
				category_id: 1,
				submitted_by: 123,
				approved: true,
				offline: false,
				spam: false,
				rating_count: 10,
				rating_sum: 45,
				avg_rating: 4.5,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
			};

			expect(bot.submitted_by).toBe(123);
			expect(bot.approved).toBe(true);
			expect(bot.offline).toBe(false);
			expect(bot.spam).toBe(false);
			expect(bot.rating_count).toBe(10);
			expect(bot.rating_sum).toBe(45);
			expect(bot.avg_rating).toBe(4.5);
		});
	});

	describe('User', () => {
		it('should have correct structure', () => {
			const user: User = {
				id: 1,
				telegram_id: 123456789,
				username: 'testuser',
				first_name: 'Test',
				banned: false,
				is_admin: false,
				created_at: '2024-01-01',
			};

			expect(user.id).toBe(1);
			expect(user.telegram_id).toBe(123456789);
			expect(user.username).toBe('testuser');
			expect(user.first_name).toBe('Test');
			expect(user.banned).toBe(false);
			expect(user.is_admin).toBe(false);
		});

		it('should support admin users', () => {
			const admin: User = {
				id: 1,
				telegram_id: 691609650,
				banned: false,
				is_admin: true,
				created_at: '2024-01-01',
			};

			expect(admin.is_admin).toBe(true);
		});

		it('should support banned users', () => {
			const banned: User = {
				id: 1,
				telegram_id: 999999999,
				banned: true,
				is_admin: false,
				created_at: '2024-01-01',
			};

			expect(banned.banned).toBe(true);
		});
	});

	describe('BotSubmission', () => {
		it('should have correct structure for pending submission', () => {
			const submission: BotSubmission = {
				id: 1,
				username: 'newbot',
				name: 'New Bot',
				description: 'A new bot submission',
				category_id: 1,
				submitted_by: 123,
				status: 'pending',
				created_at: '2024-01-01',
			};

			expect(submission.status).toBe('pending');
		});

		it('should support different statuses', () => {
			const statuses: BotSubmission['status'][] = ['pending', 'approved', 'rejected'];

			for (const status of statuses) {
				const submission: BotSubmission = {
					id: 1,
					username: 'bot',
					name: 'Bot',
					description: '',
					category_id: 1,
					submitted_by: 1,
					status,
					created_at: '2024-01-01',
				};
				expect(submission.status).toBe(status);
			}
		});
	});

	describe('UserSubmissions', () => {
		it('should have approved and pending arrays', () => {
			const submissions: UserSubmissions = {
				approved: [
					{
						id: 1,
						name: 'Approved Bot',
						username: 'approvedbot',
						description: 'An approved bot',
						category_id: 1,
						created_at: '2024-01-01',
						updated_at: '2024-01-01',
					},
				],
				pending: [
					{
						id: 2,
						username: 'pendingbot',
						name: 'Pending Bot',
						description: 'A pending bot',
						category_id: 1,
						submitted_by: 1,
						status: 'pending',
						created_at: '2024-01-01',
					},
				],
			};

			expect(submissions.approved).toHaveLength(1);
			expect(submissions.pending).toHaveLength(1);
		});

		it('should support empty arrays', () => {
			const submissions: UserSubmissions = {
				approved: [],
				pending: [],
			};

			expect(submissions.approved).toHaveLength(0);
			expect(submissions.pending).toHaveLength(0);
		});
	});

	describe('UserInfo', () => {
		it('should have correct structure', () => {
			const userInfo: UserInfo = {
				user: {
					id: 1,
					telegram_id: 123456789,
					banned: false,
					is_admin: false,
					created_at: '2024-01-01',
				},
				submitted_bots: [],
				pending_submissions: [],
				spam_reports: [],
			};

			expect(userInfo.user.telegram_id).toBe(123456789);
			expect(userInfo.submitted_bots).toHaveLength(0);
			expect(userInfo.pending_submissions).toHaveLength(0);
			expect(userInfo.spam_reports).toHaveLength(0);
		});

		it('should support spam reports with details', () => {
			const userInfo: UserInfo = {
				user: {
					id: 1,
					telegram_id: 123456789,
					banned: false,
					is_admin: false,
					created_at: '2024-01-01',
				},
				submitted_bots: [],
				pending_submissions: [],
				spam_reports: [
					{
						id: 1,
						bot_id: 5,
						bot_username: 'spambot',
						reason: 'Sends too many messages',
						created_at: '2024-01-01',
					},
				],
			};

			expect(userInfo.spam_reports).toHaveLength(1);
			expect(userInfo.spam_reports[0].bot_username).toBe('spambot');
		});
	});

	describe('ApiResponse', () => {
		it('should support success response', () => {
			const response: ApiResponse = {
				success: true,
				message: 'Operation completed',
			};

			expect(response.success).toBe(true);
			expect(response.message).toBe('Operation completed');
		});

		it('should support error response', () => {
			const response: ApiResponse = {
				error: 'Something went wrong',
			};

			expect(response.error).toBe('Something went wrong');
		});
	});
});

// Test API helper functions with mocks
describe('API Helper Functions', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe('fetchFromApi', () => {
		it('should be importable', async () => {
			const { fetchFromApi } = await import('../src/api');
			expect(typeof fetchFromApi).toBe('function');
		});

		it('should construct correct URL', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve([]),
			});
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');
			await fetchFromApi('/test', 'https://api.example.com');

			expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test');
		});

		it('should handle trailing slash in base URL', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve([]),
			});
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');
			await fetchFromApi('/test', 'https://api.example.com/');

			expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test');
		});

		it('should throw on non-ok response', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				text: () => Promise.resolve('Not found'),
			});
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');

			await expect(fetchFromApi('/notfound', 'https://api.example.com')).rejects.toThrow();
		});
	});

	describe('postToApi', () => {
		it('should be importable', async () => {
			const { postToApi } = await import('../src/api');
			expect(typeof postToApi).toBe('function');
		});

		it('should send POST request with JSON body', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve({ success: true }),
			});
			global.fetch = mockFetch;

			const { postToApi } = await import('../src/api');
			await postToApi('/test', { key: 'value' }, 'https://api.example.com');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/test',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ key: 'value' }),
				}),
			);
		});
	});

	describe('deleteFromApi', () => {
		it('should be importable', async () => {
			const { deleteFromApi } = await import('../src/api');
			expect(typeof deleteFromApi).toBe('function');
		});

		it('should send DELETE request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve({ success: true }),
			});
			global.fetch = mockFetch;

			const { deleteFromApi } = await import('../src/api');
			await deleteFromApi('/test/123', 'https://api.example.com');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/test/123',
				expect.objectContaining({
					method: 'DELETE',
				}),
			);
		});
	});

	describe('Service Binding Support', () => {
		const mockApiService = {
			fetch: vi.fn(),
		};

		beforeEach(() => {
			mockApiService.fetch.mockReset();
			global.fetch = vi.fn();
		});

		it('fetchFromApi should use service binding when provided', async () => {
			mockApiService.fetch.mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve({ data: 'test' }),
			});

			const { fetchFromApi } = await import('../src/api');
			await fetchFromApi('/test', 'https://api.example.com', mockApiService);

			expect(mockApiService.fetch).toHaveBeenCalledTimes(1);
			const request = mockApiService.fetch.mock.calls[0][0] as Request;
			expect(request.url).toBe('https://dummy.host/test');
			expect(request.method).toBe('GET');
			expect(request.headers.get('Content-Type')).toBe('application/json');
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('fetchFromApi should surface service binding errors', async () => {
			mockApiService.fetch.mockResolvedValue({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				text: () => Promise.resolve('maintenance'),
			});

			const { fetchFromApi } = await import('../src/api');

			await expect(fetchFromApi('/test', 'https://api.example.com', mockApiService)).rejects.toThrow(
				'Failed to fetch /test: Service Unavailable',
			);
			expect(mockApiService.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('postToApi should use service binding when provided', async () => {
			mockApiService.fetch.mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve({ success: true }),
			});

			const { postToApi } = await import('../src/api');
			await postToApi('/test', { key: 'value' }, 'https://api.example.com', mockApiService);

			expect(mockApiService.fetch).toHaveBeenCalledTimes(1);
			const request = mockApiService.fetch.mock.calls[0][0] as Request;
			expect(request.url).toBe('https://dummy.host/test');
			expect(request.method).toBe('POST');
			expect(await request.clone().json()).toEqual({ key: 'value' });
			expect(request.headers.get('Content-Type')).toBe('application/json');
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('deleteFromApi should use service binding when provided', async () => {
			mockApiService.fetch.mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve({ success: true }),
			});

			const { deleteFromApi } = await import('../src/api');
			await deleteFromApi('/test/123', 'https://api.example.com', mockApiService);

			expect(mockApiService.fetch).toHaveBeenCalledTimes(1);
			const request = mockApiService.fetch.mock.calls[0][0] as Request;
			expect(request.url).toBe('https://dummy.host/test/123');
			expect(request.method).toBe('DELETE');
			expect(request.headers.get('Content-Type')).toBe('application/json');
			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('fetchFromApi should handle network errors', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');

			await expect(fetchFromApi('/test', 'https://api.example.com')).rejects.toThrow('Network error');
		});

		it('postToApi should handle network errors', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
			global.fetch = mockFetch;

			const { postToApi } = await import('../src/api');

			await expect(postToApi('/test', {}, 'https://api.example.com')).rejects.toThrow('Network error');
		});

		it('deleteFromApi should handle network errors', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
			global.fetch = mockFetch;

			const { deleteFromApi } = await import('../src/api');

			await expect(deleteFromApi('/test', 'https://api.example.com')).rejects.toThrow('Network error');
		});

		it('fetchFromApi should handle JSON parsing errors', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.reject(new Error('Invalid JSON')),
			});
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');

			await expect(fetchFromApi('/test', 'https://api.example.com')).rejects.toThrow('Invalid JSON');
		});

		it('postToApi should handle non-2xx responses', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: () => Promise.resolve({ error: 'Server error' }),
			});
			global.fetch = mockFetch;

			const { postToApi } = await import('../src/api');

			// postToApi doesn't throw on non-ok responses like fetchFromApi does
			const result = await postToApi('/test', {}, 'https://api.example.com');
			expect(result).toEqual({ error: 'Server error' });
		});

		it('deleteFromApi should handle non-2xx responses', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				json: () => Promise.resolve({ error: 'Resource not found' }),
			});
			global.fetch = mockFetch;

			const { deleteFromApi } = await import('../src/api');

			// deleteFromApi doesn't throw on non-ok responses like fetchFromApi does
			const result = await deleteFromApi('/test/123', 'https://api.example.com');
			expect(result).toEqual({ error: 'Resource not found' });
		});
	});

	describe('Data Handling', () => {
		it('fetchFromApi should return array data correctly', async () => {
			const testData = [{ id: 1, name: 'test' }];
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve(testData),
			});
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');
			const result = await fetchFromApi('/test', 'https://api.example.com');

			expect(result).toEqual(testData);
			expect(Array.isArray(result)).toBe(true);
		});

		it('fetchFromApi should return object data correctly', async () => {
			const testData = { id: 1, name: 'test' };
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve(testData),
			});
			global.fetch = mockFetch;

			const { fetchFromApi } = await import('../src/api');
			const result = await fetchFromApi('/test', 'https://api.example.com');

			expect(result).toEqual(testData);
			expect(typeof result).toBe('object');
		});

		it('postToApi should stringify body correctly', async () => {
			const testBody = { name: 'test', value: 123 };
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				json: () => Promise.resolve({ success: true }),
			});
			global.fetch = mockFetch;

			const { postToApi } = await import('../src/api');
			await postToApi('/test', testBody, 'https://api.example.com');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/test',
				expect.objectContaining({
					body: JSON.stringify(testBody),
				}),
			);
		});
	});
});

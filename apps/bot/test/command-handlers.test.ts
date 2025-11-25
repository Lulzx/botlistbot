import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../src/constants';

const commandHandlers: Record<string, (ctx: any) => Promise<void>> = {};

const mockFetchFromApi = vi.fn();
const mockPostToApi = vi.fn();
const mockDeleteFromApi = vi.fn();

const mockKeyboards = {
	createMainKeyboard: vi.fn(() => ({ keyboard: 'main' })),
	createCategoriesKeyboard: vi.fn(async () => ({ keyboard: 'categories' })),
	createEmptyFavoritesKeyboard: vi.fn(() => ({ keyboard: 'empty' })),
	createExploreKeyboard: vi.fn(() => ({ keyboard: 'explore' })),
	createFavoritesKeyboard: vi.fn(() => ({ keyboard: 'favorites' })),
	createBotListKeyboard: vi.fn(() => ({ keyboard: 'botlist' })),
	createSearchResultsKeyboard: vi.fn(() => ({ keyboard: 'search' })),
	createCancelKeyboard: vi.fn(() => ({ keyboard: 'cancel' })),
};

vi.mock('grammy/web', () => ({
	Composer: class {
		command(names: string | string[], handler: (ctx: any) => Promise<void>) {
			const list = Array.isArray(names) ? names : [names];
			for (const name of list) {
				commandHandlers[name] = handler;
			}
			return this;
		}
	},
}));

vi.mock('../src/api', () => ({
	fetchFromApi: mockFetchFromApi,
	postToApi: mockPostToApi,
	deleteFromApi: mockDeleteFromApi,
}));

vi.mock('../src/keyboards', () => mockKeyboards);

const getHandler = (name: string) => {
	const handler = commandHandlers[name];
	if (!handler) {
		throw new Error(`Handler for ${name} not registered`);
	}
	return handler;
};

const createMockContext = (overrides: Record<string, unknown> = {}) => {
	const replies: Array<{ text: string; options?: unknown }> = [];
	const ctx = {
		reply: vi.fn(async (text: string, options?: unknown) => {
			replies.push({ text, options });
		}),
		replyWithSticker: vi.fn(),
		from: { id: 123 },
		chat: { id: 456 },
		env: { API_BASE_URL: 'https://api.example.com', API: undefined },
		match: undefined as string | undefined,
		...overrides,
	};
	return { ctx, replies };
};

beforeAll(async () => {
	await import('../src/handlers/commands');
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe('command handlers', () => {
	it('responds with help text', async () => {
		const handler = getHandler('help');
		const { ctx, replies } = createMockContext();

		await handler(ctx);

		expect(replies[0]?.text).toBe(MESSAGES.HELP);
		expect(replies[0]?.options).toMatchObject({
			parse_mode: 'HTML',
			reply_markup: { keyboard: 'main' },
		});
	});

	it('prompts for new bot input when missing', async () => {
		const handler = getHandler('new');
		const { ctx, replies } = createMockContext();

		await handler(ctx);

		expect(mockPostToApi).not.toHaveBeenCalled();
		expect(replies[0]?.text).toBe(MESSAGES.NEW_BOT_PROMPT);
		expect(replies[0]?.options).toMatchObject({ parse_mode: 'HTML' });
	});

	it('submits new bot data when provided', async () => {
		const handler = getHandler('new');
		mockPostToApi.mockResolvedValueOnce({ success: true });

		const { ctx, replies } = createMockContext({ match: '@coolbot - Nice bot' });

		await handler(ctx);

		expect(mockPostToApi).toHaveBeenCalledWith(
			'/submissions',
			{
				username: 'coolbot',
				name: 'coolbot',
				description: 'Nice bot',
				category_id: 1,
				telegram_id: 123,
			},
			'https://api.example.com',
			undefined,
		);
		expect(replies[0]?.text).toBe(MESSAGES.NEW_BOT_SUCCESS);
	});

	it('shows existing bot message when submission already exists', async () => {
		const handler = getHandler('new');
		mockPostToApi.mockResolvedValueOnce({ error: 'already in the BotList' });

		const { ctx, replies } = createMockContext({ match: '@coolbot' });

		await handler(ctx);

		expect(replies[0]?.text).toBe(MESSAGES.NEW_BOT_EXISTS);
	});

	it('returns spam already reported message', async () => {
		const handler = getHandler('spam');
		mockPostToApi.mockResolvedValueOnce({ error: 'already reported' });

		const { ctx, replies } = createMockContext({ match: '@annoyingbot' });

		await handler(ctx);

		expect(mockPostToApi).toHaveBeenCalledWith(
			'/spam-reports',
			{ bot_username: 'annoyingbot', telegram_id: 123 },
			'https://api.example.com',
			undefined,
		);
		expect(replies[0]?.text).toBe(MESSAGES.SPAM_ALREADY);
	});

	it('returns offline not found message', async () => {
		const handler = getHandler('offline');
		mockPostToApi.mockResolvedValueOnce({ error: 'not found' });

		const { ctx, replies } = createMockContext({ match: '@ghostbot' });

		await handler(ctx);

		expect(mockPostToApi).toHaveBeenCalledWith(
			'/offline-reports',
			{ bot_username: 'ghostbot', telegram_id: 123 },
			'https://api.example.com',
			undefined,
		);
		expect(replies[0]?.text).toBe(MESSAGES.OFFLINE_NOT_FOUND);
	});

	it('rejects too short search queries', async () => {
		const handler = getHandler('search');
		const { ctx, replies } = createMockContext({ match: 'ab' });

		await handler(ctx);

		expect(mockFetchFromApi).not.toHaveBeenCalled();
		expect(replies[0]?.text).toBe(MESSAGES.SEARCH_TOO_SHORT);
	});

	it('prompts for search input when missing', async () => {
		const handler = getHandler('search');
		const { ctx, replies } = createMockContext({ match: undefined });

		await handler(ctx);

		expect(mockFetchFromApi).not.toHaveBeenCalled();
		expect(replies[0]?.text).toBe(MESSAGES.SEARCH_PROMPT);
		expect(replies[0]?.options).toMatchObject({ reply_markup: { keyboard: 'cancel' } });
	});

	it('subscribes user to updates', async () => {
		const handler = getHandler('subscribe');
		mockPostToApi.mockResolvedValueOnce({ success: true });

		const { ctx, replies } = createMockContext({ from: { id: 999 }, chat: { id: 111 } });

		await handler(ctx);

		expect(mockPostToApi).toHaveBeenCalledWith(
			'/subscriptions',
			{ chat_id: 111, telegram_id: 999 },
			'https://api.example.com',
			undefined,
		);
		expect(replies[0]?.text).toBe(MESSAGES.SUBSCRIBE_SUCCESS);
	});

	it('unsubscribes user from updates', async () => {
		const handler = getHandler('unsubscribe');
		mockDeleteFromApi.mockResolvedValueOnce({ success: true });

		const { ctx, replies } = createMockContext({ chat: { id: 777 } });

		await handler(ctx);

		expect(mockDeleteFromApi).toHaveBeenCalledWith('/subscriptions/777', 'https://api.example.com', undefined);
		expect(replies[0]?.text).toBe(MESSAGES.UNSUBSCRIBE_SUCCESS);
	});
});

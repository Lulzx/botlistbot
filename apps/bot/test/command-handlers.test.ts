import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../src/constants';

const commandHandlers: Record<string, (ctx: any) => Promise<void>> = {};

const mockSubmitBot = vi.fn();
const mockReportSpam = vi.fn();
const mockReportOffline = vi.fn();
const mockSearchBots = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();

const mockKeyboards = {
	createMainKeyboard: vi.fn(() => ({ keyboard: 'main' })),
	createCategoriesKeyboard: vi.fn(async () => ({ keyboard: 'categories' })),
	createEmptyFavoritesKeyboard: vi.fn(() => ({ keyboard: 'empty' })),
	createExploreKeyboard: vi.fn(() => ({ keyboard: 'explore' })),
	createFavoritesKeyboard: vi.fn(() => ({ keyboard: 'favorites' })),
	createBotListKeyboard: vi.fn(() => ({ keyboard: 'botlist' })),
	createSearchResultsKeyboard: vi.fn(() => ({ keyboard: 'search' })),
	createInlineSearchKeyboard: vi.fn(() => ({ keyboard: 'inline_search' })),
	createCancelKeyboard: vi.fn(() => ({ keyboard: 'cancel' })),
	createSuggestionActionsKeyboard: vi.fn(() => ({ keyboard: 'suggestion_actions' })),
	createConfirmKeyboard: vi.fn(() => ({ keyboard: 'confirm' })),
	createSuggestionReviewKeyboard: vi.fn(() => ({ keyboard: 'suggestion_review' })),
	createAdminKeyboard: vi.fn(() => ({ keyboard: 'admin' })),
	createMyBotsKeyboard: vi.fn(() => ({ keyboard: 'mybots' })),
	createBackKeyboard: vi.fn(() => ({ keyboard: 'back' })),
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
		on(_filter: string, _handler: (ctx: any, next: () => Promise<void>) => Promise<void>) {
			return this;
		}
	},
}));

vi.mock('../src/db', () => ({
	submitBot: mockSubmitBot,
	reportSpam: mockReportSpam,
	reportOffline: mockReportOffline,
	searchBots: mockSearchBots,
	subscribe: mockSubscribe,
	unsubscribe: mockUnsubscribe,
	getRandomBots: vi.fn().mockResolvedValue([]),
	getNewBots: vi.fn().mockResolvedValue([]),
	getBestBots: vi.fn().mockResolvedValue([]),
	getUserFavorites: vi.fn().mockResolvedValue([]),
	getUserSubmissions: vi.fn().mockResolvedValue({ approved: [], pending: [] }),
	addFavorite: vi.fn(),
	removeFavorite: vi.fn(),
	getBotByUsername: vi.fn(),
	createSuggestion: vi.fn(),
	rateBot: vi.fn(),
}));

vi.mock('../src/keyboards', () => mockKeyboards);

vi.mock('../src/tracking', () => ({
	trackActivity: vi.fn(),
}));

const getHandler = (name: string) => {
	const handler = commandHandlers[name];
	if (!handler) {
		throw new Error(`Handler for ${name} not registered`);
	}
	return handler;
};

const mockDB = {};

const createMockContext = (overrides: Record<string, unknown> = {}) => {
	const replies: Array<{ text: string; options?: unknown }> = [];
	const ctx = {
		reply: vi.fn(async (text: string, options?: unknown) => {
			replies.push({ text, options });
		}),
		replyWithSticker: vi.fn(),
		from: { id: 123 },
		chat: { id: 456 },
		env: { DB: mockDB },
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

		expect(mockSubmitBot).not.toHaveBeenCalled();
		expect(replies[0]?.text).toBe(MESSAGES.NEW_BOT_PROMPT);
		expect(replies[0]?.options).toMatchObject({ parse_mode: 'HTML' });
	});

	it('submits new bot data when provided', async () => {
		const handler = getHandler('new');
		mockSubmitBot.mockResolvedValueOnce({ success: true });

		const { ctx, replies } = createMockContext({ match: '@coolbot - Nice bot' });

		await handler(ctx);

		expect(mockSubmitBot).toHaveBeenCalledWith(mockDB, {
			username: 'coolbot',
			name: 'coolbot',
			description: 'Nice bot',
			category_id: 1,
			telegram_id: 123,
			inlinequeries: 0,
		});
		expect(replies[0]?.text).toBe(MESSAGES.NEW_BOT_SUCCESS);
	});

	it('shows existing bot message when submission already exists', async () => {
		const handler = getHandler('new');
		mockSubmitBot.mockResolvedValueOnce({ error: 'already in the BotList' });

		const { ctx, replies } = createMockContext({ match: '@coolbot' });

		await handler(ctx);

		expect(replies[0]?.text).toBe(MESSAGES.NEW_BOT_EXISTS);
	});

	it('returns spam already reported message', async () => {
		const handler = getHandler('spam');
		mockReportSpam.mockResolvedValueOnce({ error: 'already reported' });

		const { ctx, replies } = createMockContext({ match: '@annoyingbot' });

		await handler(ctx);

		expect(mockReportSpam).toHaveBeenCalledWith(mockDB, 'annoyingbot', 123);
		expect(replies[0]?.text).toBe(MESSAGES.SPAM_ALREADY);
	});

	it('returns offline not found message', async () => {
		const handler = getHandler('offline');
		mockReportOffline.mockResolvedValueOnce({ error: 'not found' });

		const { ctx, replies } = createMockContext({ match: '@ghostbot' });

		await handler(ctx);

		expect(mockReportOffline).toHaveBeenCalledWith(mockDB, 'ghostbot', 123);
		expect(replies[0]?.text).toBe(MESSAGES.OFFLINE_NOT_FOUND);
	});

	it('rejects too short search queries', async () => {
		const handler = getHandler('search');
		const { ctx, replies } = createMockContext({ match: 'ab' });

		await handler(ctx);

		expect(mockSearchBots).not.toHaveBeenCalled();
		expect(replies[0]?.text).toBe(MESSAGES.SEARCH_TOO_SHORT);
	});

	it('prompts for search input when missing', async () => {
		const handler = getHandler('search');
		const { ctx, replies } = createMockContext({ match: undefined });

		await handler(ctx);

		expect(mockSearchBots).not.toHaveBeenCalled();
		expect(replies[0]?.text).toBe(MESSAGES.SEARCH_PROMPT);
		expect(replies[0]?.options).toMatchObject({ reply_markup: { keyboard: 'inline_search' } });
	});

	it('subscribes user to updates', async () => {
		const handler = getHandler('subscribe');
		mockSubscribe.mockResolvedValueOnce({ success: true });

		const { ctx, replies } = createMockContext({ from: { id: 999 }, chat: { id: 111 } });

		await handler(ctx);

		expect(mockSubscribe).toHaveBeenCalledWith(mockDB, 111, 999);
		expect(replies[0]?.text).toBe(MESSAGES.SUBSCRIBE_SUCCESS);
	});

	it('unsubscribes user from updates', async () => {
		const handler = getHandler('unsubscribe');
		mockUnsubscribe.mockResolvedValueOnce({ success: true });

		const { ctx, replies } = createMockContext({ chat: { id: 777 } });

		await handler(ctx);

		expect(mockUnsubscribe).toHaveBeenCalledWith(mockDB, 777);
		expect(replies[0]?.text).toBe(MESSAGES.UNSUBSCRIBE_SUCCESS);
	});
});

import { describe, it, expect } from 'vitest';
import {
	createMainKeyboard,
	createFavoritesKeyboard,
	createEmptyFavoritesKeyboard,
	createExploreKeyboard,
	createBotListKeyboard,
	createSearchResultsKeyboard,
	createCancelKeyboard,
	createBackKeyboard,
	createConfirmKeyboard,
} from '../src/keyboards';
import type { Bot } from '../src/api';

// Helper to extract callback_data from buttons
function getCallbackData(button: unknown): string | undefined {
	if (typeof button === 'object' && button !== null && 'callback_data' in button) {
		return (button as { callback_data: string }).callback_data;
	}
	return undefined;
}

// Helper to extract url from buttons
function getUrl(button: unknown): string | undefined {
	if (typeof button === 'object' && button !== null && 'url' in button) {
		return (button as { url: string }).url;
	}
	return undefined;
}

// Helper to extract text from buttons
function getText(button: unknown): string {
	if (typeof button === 'object' && button !== null && 'text' in button) {
		return (button as { text: string }).text;
	}
	return '';
}

// Mock bot data for testing
const mockBots: Bot[] = [
	{
		id: 1,
		name: 'Test Bot 1',
		username: 'testbot1',
		description: 'A test bot',
		category_id: 1,
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
	},
	{
		id: 2,
		name: 'Test Bot 2',
		username: 'testbot2',
		description: 'Another test bot',
		category_id: 2,
		avg_rating: 4.5,
		created_at: '2024-01-02',
		updated_at: '2024-01-02',
	},
];

describe('keyboards', () => {
	describe('createMainKeyboard', () => {
		it('should create a keyboard with help, contributing, and examples buttons', () => {
			const keyboard = createMainKeyboard();
			expect(keyboard).toBeDefined();

			// InlineKeyboard has inline_keyboard property
			const inlineKeyboard = keyboard.inline_keyboard;
			expect(Array.isArray(inlineKeyboard)).toBe(true);
			expect(inlineKeyboard.length).toBeGreaterThan(0);

			// Flatten all buttons
			const allButtons = inlineKeyboard.flat();
			const buttonTexts = allButtons.map((b) => getText(b));

			expect(buttonTexts).toContain('❓ Help');
			expect(buttonTexts).toContain('🔍 Contributing');
			expect(buttonTexts).toContain('📝 Examples');
			expect(buttonTexts).toContain('Try me inline!');
		});

		it('should have correct callback data', () => {
			const keyboard = createMainKeyboard();
			const allButtons = keyboard.inline_keyboard.flat();

			const callbackData = allButtons.map((b) => getCallbackData(b)).filter(Boolean);
			expect(callbackData).toContain('help');
			expect(callbackData).toContain('contributing');
			expect(callbackData).toContain('examples');
			expect(callbackData).toContain('try_inline');
		});
	});

	describe('createFavoritesKeyboard', () => {
		it('should create a keyboard with bot buttons', () => {
			const keyboard = createFavoritesKeyboard(mockBots);
			expect(keyboard).toBeDefined();

			const inlineKeyboard = keyboard.inline_keyboard;
			expect(inlineKeyboard.length).toBeGreaterThan(0);
		});

		it('should include remove buttons for each bot', () => {
			const keyboard = createFavoritesKeyboard(mockBots);
			const allButtons = keyboard.inline_keyboard.flat();

			const removeButtons = allButtons.filter((b) => getCallbackData(b)?.startsWith('fav_remove:'));
			expect(removeButtons.length).toBe(mockBots.length);
		});

		it('should include add and refresh buttons', () => {
			const keyboard = createFavoritesKeyboard(mockBots);
			const allButtons = keyboard.inline_keyboard.flat();

			const buttonCallbacks = allButtons.map((b) => getCallbackData(b)).filter(Boolean);
			expect(buttonCallbacks).toContain('fav_add');
			expect(buttonCallbacks).toContain('fav_refresh');
		});

		it('should limit to 10 bots', () => {
			const manyBots = Array.from({ length: 15 }, (_, i) => ({
				...mockBots[0],
				id: i + 1,
				username: `bot${i + 1}`,
			}));

			const keyboard = createFavoritesKeyboard(manyBots);
			const removeButtons = keyboard.inline_keyboard.flat().filter((b) => getCallbackData(b)?.startsWith('fav_remove:'));

			expect(removeButtons.length).toBeLessThanOrEqual(10);
		});
	});

	describe('createEmptyFavoritesKeyboard', () => {
		it('should create a keyboard with add and browse buttons', () => {
			const keyboard = createEmptyFavoritesKeyboard();
			const allButtons = keyboard.inline_keyboard.flat();

			const buttonCallbacks = allButtons.map((b) => getCallbackData(b)).filter(Boolean);
			expect(buttonCallbacks).toContain('fav_add');
			expect(buttonCallbacks).toContain('show_categories');
		});
	});

	describe('createExploreKeyboard', () => {
		it('should create a keyboard with bot links', () => {
			const keyboard = createExploreKeyboard(mockBots);
			expect(keyboard).toBeDefined();

			const allButtons = keyboard.inline_keyboard.flat();
			const urlButtons = allButtons.filter((b) => getUrl(b));

			expect(urlButtons.length).toBeGreaterThan(0);
		});

		it('should have show more and favorite buttons', () => {
			const keyboard = createExploreKeyboard(mockBots);
			const allButtons = keyboard.inline_keyboard.flat();

			const buttonCallbacks = allButtons.map((b) => getCallbackData(b)).filter(Boolean);
			expect(buttonCallbacks).toContain('explore_more');
			expect(buttonCallbacks).toContain('explore_fav');
		});
	});

	describe('createBotListKeyboard', () => {
		it('should create a keyboard with bot links', () => {
			const keyboard = createBotListKeyboard(mockBots);
			expect(keyboard).toBeDefined();

			const allButtons = keyboard.inline_keyboard.flat();
			const urlButtons = allButtons.filter((b) => getUrl(b));

			expect(urlButtons.length).toBe(mockBots.length);
		});

		it('should show rating for bots with avg_rating', () => {
			const keyboard = createBotListKeyboard(mockBots);
			const allButtons = keyboard.inline_keyboard.flat();

			const ratingButton = allButtons.find((b) => getText(b).includes('4.5'));
			expect(ratingButton).toBeDefined();
		});

		it('should add show all button for more than 10 bots', () => {
			const manyBots = Array.from({ length: 15 }, (_, i) => ({
				...mockBots[0],
				id: i + 1,
				username: `bot${i + 1}`,
			}));

			const keyboard = createBotListKeyboard(manyBots, 'test');
			const allButtons = keyboard.inline_keyboard.flat();

			const showAllButton = allButtons.find((b) => getCallbackData(b) === 'test_showall');
			expect(showAllButton).toBeDefined();
		});
	});

	describe('createSearchResultsKeyboard', () => {
		it('should create a keyboard with search results', () => {
			const keyboard = createSearchResultsKeyboard(mockBots);
			expect(keyboard).toBeDefined();

			const allButtons = keyboard.inline_keyboard.flat();
			expect(allButtons.length).toBeGreaterThan(0);
		});
	});

	describe('createCancelKeyboard', () => {
		it('should create a keyboard with cancel button', () => {
			const keyboard = createCancelKeyboard();
			const allButtons = keyboard.inline_keyboard.flat();

			expect(allButtons).toHaveLength(1);
			expect(getCallbackData(allButtons[0])).toBe('cancel_action');
			expect(getText(allButtons[0])).toContain('Cancel');
		});
	});

	describe('createBackKeyboard', () => {
		it('should create a keyboard with back button', () => {
			const keyboard = createBackKeyboard('test_callback');
			const allButtons = keyboard.inline_keyboard.flat();

			expect(allButtons).toHaveLength(1);
			expect(getCallbackData(allButtons[0])).toBe('test_callback');
			expect(getText(allButtons[0])).toContain('Back');
		});
	});

	describe('createConfirmKeyboard', () => {
		it('should create a keyboard with confirm and cancel buttons', () => {
			const keyboard = createConfirmKeyboard('confirm_test');
			const allButtons = keyboard.inline_keyboard.flat();

			expect(allButtons).toHaveLength(2);

			const confirmButton = allButtons.find((b) => getCallbackData(b) === 'confirm_test');
			const cancelButton = allButtons.find((b) => getCallbackData(b) === 'cancel_action');

			expect(confirmButton).toBeDefined();
			expect(cancelButton).toBeDefined();
		});

		it('should use custom cancel callback when provided', () => {
			const keyboard = createConfirmKeyboard('confirm_test', 'custom_cancel');
			const allButtons = keyboard.inline_keyboard.flat();

			const cancelButton = allButtons.find((b) => getCallbackData(b) === 'custom_cancel');
			expect(cancelButton).toBeDefined();
		});
	});
});

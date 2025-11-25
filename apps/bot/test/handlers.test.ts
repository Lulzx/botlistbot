import { describe, it, expect } from 'vitest';
import { isAdminId } from '../src/config';
import { MESSAGES, CATEGORIES, CATEGORY_NAMES } from '../src/constants';

// Test admin configuration for handlers
describe('Admin Handler Logic', () => {
	describe('Admin ID validation', () => {
		it('should recognize configured admin IDs', () => {
			// The admin IDs configured in config.ts
			expect(isAdminId(691609650)).toBe(true);
			expect(isAdminId(62056065)).toBe(true);
		});

		it('should reject non-admin IDs', () => {
			expect(isAdminId(123456789)).toBe(false);
			expect(isAdminId(999999999)).toBe(false);
		});
	});
});

// Test message formatting
describe('Message Formatting', () => {
	describe('HELP message', () => {
		it('should list all user commands', () => {
			const userCommands = [
				'/start',
				'/help',
				'/category',
				'/explore',
				'/favorites',
				'/search',
				'/new',
				'/spam',
				'/newbots',
				'/bestbots',
				'/mybots',
				'/subscribe',
				'/unsubscribe',
				'/rules',
			];

			for (const cmd of userCommands) {
				expect(MESSAGES.HELP).toContain(cmd);
			}
		});

		it('should be properly formatted HTML', () => {
			// Check for common HTML tags
			expect(MESSAGES.HELP).toContain('<b>');
			expect(MESSAGES.HELP).toContain('</b>');
		});
	});

	describe('NEW_BOT_PROMPT', () => {
		it('should contain usage instructions', () => {
			expect(MESSAGES.NEW_BOT_PROMPT).toContain('/new');
			expect(MESSAGES.NEW_BOT_PROMPT).toContain('@');
		});

		it('should contain example', () => {
			expect(MESSAGES.NEW_BOT_PROMPT.toLowerCase()).toContain('example');
		});
	});

	describe('RULES message', () => {
		it('should contain multiple rules', () => {
			// Count numbered rules
			const ruleNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
			let count = 0;
			for (const num of ruleNumbers) {
				if (MESSAGES.RULES.includes(num)) count++;
			}
			expect(count).toBeGreaterThanOrEqual(5);
		});

		it('should mention key topics', () => {
			expect(MESSAGES.RULES.toLowerCase()).toContain('respect');
			expect(MESSAGES.RULES.toLowerCase()).toContain('spam');
		});
	});
});

// Test username parsing logic (as used in handlers)
describe('Username Parsing Logic', () => {
	const parseUsername = (input: string): string | null => {
		const match = input.match(/@?(\w+)/);
		return match ? match[1] : null;
	};

	it('should parse username with @ prefix', () => {
		expect(parseUsername('@testbot')).toBe('testbot');
	});

	it('should parse username without @ prefix', () => {
		expect(parseUsername('testbot')).toBe('testbot');
	});

	it('should handle username in description', () => {
		const input = '@coolbot - This is a cool bot';
		const match = input.match(/@(\w+)/);
		expect(match?.[1]).toBe('coolbot');
	});

	it('should extract description after username', () => {
		const input = '@coolbot - This is a cool bot';
		const description = input.replace(/@\w+/, '').replace(/^\s*-?\s*/, '').trim();
		expect(description).toBe('This is a cool bot');
	});

	it('should handle empty description', () => {
		const input = '@coolbot';
		const description = input.replace(/@\w+/, '').replace(/^\s*-?\s*/, '').trim();
		expect(description).toBe('');
	});
});

// Test category lookup logic
describe('Category Lookup Logic', () => {
	it('should find category by ID', () => {
		expect(CATEGORY_NAMES[1]).toBeDefined();
		expect(CATEGORY_NAMES[28]).toBeDefined();
	});

	it('should return undefined for invalid ID', () => {
		expect(CATEGORY_NAMES[0]).toBeUndefined();
		expect(CATEGORY_NAMES[100]).toBeUndefined();
	});

	it('should match category ID in CATEGORIES array', () => {
		const musicCategory = CATEGORIES.find((c) => c.name.includes('Music'));
		expect(musicCategory).toBeDefined();
		if (musicCategory) {
			expect(CATEGORY_NAMES[musicCategory.id]).toBe(musicCategory.name);
		}
	});
});

// Test bot list formatting logic
describe('Bot List Formatting', () => {
	const mockBots = [
		{ username: 'bot1', name: 'Bot One', description: 'First bot' },
		{ username: 'bot2', name: 'Bot Two', description: 'Second bot' },
	];

	it('should format simple bot list', () => {
		const formatted = mockBots.map((bot) => `• @${bot.username} - ${bot.name}`).join('\n');

		expect(formatted).toContain('@bot1');
		expect(formatted).toContain('@bot2');
		expect(formatted).toContain('Bot One');
		expect(formatted).toContain('Bot Two');
	});

	it('should format numbered bot list', () => {
		const formatted = mockBots.map((bot, i) => `${i + 1}. <b>@${bot.username}</b> - ${bot.name}`).join('\n');

		expect(formatted).toContain('1.');
		expect(formatted).toContain('2.');
		expect(formatted).toContain('<b>@bot1</b>');
	});

	it('should truncate long descriptions', () => {
		const longDesc = 'A'.repeat(150);
		const truncated = longDesc.slice(0, 100) + (longDesc.length > 100 ? '...' : '');

		expect(truncated.length).toBe(103); // 100 chars + '...'
		expect(truncated.endsWith('...')).toBe(true);
	});
});

// Test search query validation
describe('Search Query Validation', () => {
	const validateSearchQuery = (query: string): { valid: boolean; error?: string } => {
		if (!query || query.trim().length === 0) {
			return { valid: false, error: 'Empty query' };
		}
		if (query.trim().length < 3) {
			return { valid: false, error: 'Query too short' };
		}
		if (query.toLowerCase() === 'bot') {
			return { valid: false, error: 'Query too generic' };
		}
		return { valid: true };
	};

	it('should reject empty queries', () => {
		expect(validateSearchQuery('').valid).toBe(false);
		expect(validateSearchQuery('  ').valid).toBe(false);
	});

	it('should reject short queries', () => {
		expect(validateSearchQuery('ab').valid).toBe(false);
		expect(validateSearchQuery('a').valid).toBe(false);
	});

	it('should accept valid queries', () => {
		expect(validateSearchQuery('music').valid).toBe(true);
		expect(validateSearchQuery('weather').valid).toBe(true);
		expect(validateSearchQuery('file converter').valid).toBe(true);
	});

	it('should reject generic "bot" query', () => {
		expect(validateSearchQuery('bot').valid).toBe(false);
		expect(validateSearchQuery('BOT').valid).toBe(false);
	});
});

// Test callback data parsing
describe('Callback Data Parsing', () => {
	const parseCallbackData = (data: string): { action: string; param?: string } => {
		const parts = data.split(':');
		return {
			action: parts[0],
			param: parts[1],
		};
	};

	it('should parse category callback', () => {
		const result = parseCallbackData('category:5');
		expect(result.action).toBe('category');
		expect(result.param).toBe('5');
	});

	it('should parse favorite remove callback', () => {
		const result = parseCallbackData('fav_remove:testbot');
		expect(result.action).toBe('fav_remove');
		expect(result.param).toBe('testbot');
	});

	it('should handle simple callbacks', () => {
		const result = parseCallbackData('help');
		expect(result.action).toBe('help');
		expect(result.param).toBeUndefined();
	});
});

// Test error message selection
describe('Error Message Selection', () => {
	const getErrorMessage = (error: string, messageMap: Record<string, string>): string => {
		for (const [key, message] of Object.entries(messageMap)) {
			if (error.toLowerCase().includes(key.toLowerCase())) {
				return message;
			}
		}
		return `Error: ${error}`;
	};

	it('should match "not found" errors', () => {
		const map = {
			'not found': MESSAGES.SPAM_NOT_FOUND,
			'already reported': MESSAGES.SPAM_ALREADY,
			banned: MESSAGES.SPAM_BANNED,
		};

		expect(getErrorMessage('Bot not found in the database', map)).toBe(MESSAGES.SPAM_NOT_FOUND);
	});

	it('should match "banned" errors', () => {
		const map = {
			'not found': MESSAGES.SPAM_NOT_FOUND,
			'already reported': MESSAGES.SPAM_ALREADY,
			banned: MESSAGES.SPAM_BANNED,
		};

		expect(getErrorMessage('You are banned from reporting', map)).toBe(MESSAGES.SPAM_BANNED);
	});

	it('should return generic error for unknown errors', () => {
		const map = {
			'not found': MESSAGES.SPAM_NOT_FOUND,
		};

		const result = getErrorMessage('Unknown error occurred', map);
		expect(result).toContain('Unknown error occurred');
	});
});

// Test rating calculation
describe('Rating Calculation', () => {
	const calculateAvgRating = (ratingSum: number, ratingCount: number): number | null => {
		if (ratingCount === 0) return null;
		return ratingSum / ratingCount;
	};

	const formatRating = (avgRating: number | null): string => {
		if (avgRating === null) return '';
		return ` (${avgRating.toFixed(1)} stars)`;
	};

	it('should calculate average rating', () => {
		expect(calculateAvgRating(45, 10)).toBe(4.5);
		expect(calculateAvgRating(50, 10)).toBe(5.0);
		expect(calculateAvgRating(30, 10)).toBe(3.0);
	});

	it('should return null for zero ratings', () => {
		expect(calculateAvgRating(0, 0)).toBeNull();
	});

	it('should format rating string', () => {
		expect(formatRating(4.5)).toBe(' (4.5 stars)');
		expect(formatRating(5.0)).toBe(' (5.0 stars)');
		expect(formatRating(null)).toBe('');
	});
});

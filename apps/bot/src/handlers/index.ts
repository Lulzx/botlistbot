import { Composer } from 'grammy/web';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

// Start command
import start from './start';
composer.use(start);

// User commands (help, category, explore, favorites, search, new, spam, newbots, bestbots, mybots, subscribe, unsubscribe, rules)
import commands from './commands';
composer.use(commands);

// Admin commands (ban, unban, userinfo)
import admin from './admin';
composer.use(admin);

// Categories command (kept for backward compatibility)
import categories from './categories';
composer.use(categories);

// Callback query handlers
import callback_queries from './callback';
composer.use(callback_queries);

// Inline query handlers
import inline from './inline';
composer.use(inline);

// Chosen inline result handlers
import chosen_inline_result from './chosen_inline_result';
composer.use(chosen_inline_result);

// Log unhandled updates
composer.use((ctx) => console.log('UnHandled update', JSON.stringify(ctx)));

import { Composer } from 'grammy/web';
import type { MyContext } from '../types';

export const composer = new Composer<MyContext>();

import start from './start';
composer.use(start);

import categories from './categories';
composer.use(categories);

import callback_queries from './callback';
composer.use(callback_queries);

import inline from './inline';
composer.use(inline);

import chosen_inline_result from './chosen_inline_result';
composer.use(chosen_inline_result);

composer.use((ctx) => console.log('UnHandled update', JSON.stringify(ctx)));

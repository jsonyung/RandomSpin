/** Fair Ads Spinner — entry point */
import { bindDom } from './dom.js';
import { bindEvents } from './events.js';
import { bootstrap } from './init.js';

bindDom();
bindEvents();
bootstrap();

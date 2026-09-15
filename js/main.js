/** Fair Ads Spinner — entry point */
import { bindDom } from './dom.js';
import { bindEvents } from './events.js';
import { bootstrap } from './init.js';

bindDom();
try {
  bindEvents();
} catch (err) {
  console.error('Fair Ads Spinner: event binding failed', err);
}
bootstrap();

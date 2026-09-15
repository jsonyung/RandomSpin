#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const legacy = fs.readFileSync(path.join(root, 'js/_legacy.js'), 'utf8');
const lines = legacy.split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const jsDir = path.join(root, 'js');

const domLines = slice(91, 123);
const domIds = [...domLines.matchAll(/const (\w+) = document\.getElementById\('(\w+)'\)/g)];

const extraDom = [
  ['historyFilterDate', 'historyFilterDate'],
  ['historyFilterTask', 'historyFilterTask'],
  ['pinLockBanner', 'pinLockBanner'],
  ['assignmentSection', 'assignmentSection'],
  ['animationSection', 'animationSection'],
  ['lastResultStrip', 'lastResultStrip'],
  ['homeToast', 'homeToast'],
  ['fairBagPanel', 'fairBagPanel'],
  ['recentTasks', 'recentTasks'],
  ['updateBanner', 'updateBanner'],
  ['installBanner', 'installBanner'],
  ['modeWizardModal', 'modeWizardModal'],
  ['wizardOptions', 'wizardOptions'],
  ['tourOverlay', 'tourOverlay'],
  ['historyStats', 'historyStats'],
  ['historyChart', 'historyChart'],
  ['showAllHistoryBtn', 'showAllHistoryBtn'],
  ['volumeRow', 'volumeRow'],
  ['soundVolume', 'soundVolume'],
  ['volumeLabel', 'volumeLabel'],
  ['requireTaskToggle', 'requireTaskToggle'],
  ['pinLockResetToggle', 'pinLockResetToggle'],
  ['importBackupInput', 'importBackupInput'],
];

fs.writeFileSync(
  path.join(jsDir, 'config.js'),
  `/** App constants */\n${slice(1, 35).replace(/^const /gm, 'export const ')}\n`
);

fs.writeFileSync(
  path.join(jsDir, 'state.js'),
  `/** Mutable app state */
import { DEFAULT_NAMES, DEFAULT_PRESETS } from './config.js';

export let names = [...DEFAULT_NAMES];

export const state = {
  mode: 'fairBag',
  speed: 'normal',
  theme: 'dark',
  soundEnabled: true,
  confettiEnabled: true,
  quickResult: false,
  currentRotation: 0,
  isSpinning: false,
  wins: {},
  excluded: {},
  fairBagDeck: [],
  fairBagRound: 1,
  fairBagSpinInRound: 0,
  lastWinner: null,
  history: [],
  taskPresets: [...DEFAULT_PRESETS],
  pinEnabled: false,
  pinHash: null,
  pinUnlocked: false,
  dailyResetEnabled: false,
  dailyResetTime: '09:00',
  lastDailyReset: null,
  tourSeen: false,
  installBannerDismissed: false,
  soundVolume: 0.8,
  requireTaskBeforeSpin: false,
  pinLockResetCounts: false
};

export let settingsDraft = [];
export let settingsDraftExcluded = {};
export let historyShowAll = false;
export let pendingPinAction = null;
export let lastResultText = '';
export let lastSlackText = '';
export let pinUnlockBuffer = '';
export let dailyResetTimer = null;
export let undoSnapshot = null;
export let settingsSaveTimer = null;
export let deferredInstallPrompt = null;
export let tourStep = 0;
export let swRegistration = null;

export const TOUR_STEPS = [
  { title: 'Welcome!', text: 'Fair Ads Spinner picks someone fairly when a lead comes in. Let\\'s walk through the basics.' },
  { title: 'Spin the wheel', text: 'Tap SPIN or press Space when a lead arrives. The wheel is for show — fairness is decided instantly.' },
  { title: 'Status pills', text: 'Mode, speed, task & round progress show at a glance. Tap the task pill to edit it.' },
  { title: 'Settings ⚙', text: 'Set your team, task presets, fairness mode & more. Names auto-save as you type.' },
  { title: 'History 🕐', text: 'Every spin is logged. Export CSV for records or undo the last spin if you mis-clicked.' }
];
`
);

fs.writeFileSync(
  path.join(jsDir, 'dom.js'),
  `/** DOM references */
export const el = {};

export function bindDom() {
${domIds.map(([, name, id]) => `  el.${name} = document.getElementById('${id}');`).join('\n')}
${extraDom.map(([name, id]) => `  el.${name} = document.getElementById('${id}');`).join('\n')}
}
`
);

let code = slice(125, 2026);

const domMap = {};
for (const [, name] of domIds) domMap[name] = `el.${name}`;
for (const [name] of extraDom) domMap[name] = `el.${name}`;

for (const [old, rep] of Object.entries(domMap)) {
  code = code.replace(new RegExp(`\\b${old}\\b`, 'g'), rep);
}

const eventMarker = '\nel.nameListEl.addEventListener';
const splitIdx = code.indexOf(eventMarker);
const logicBlock = code.slice(0, splitIdx);
const eventsBlock = code.slice(splitIdx + 1);

const initMarker = '\nsetupServiceWorkerUpdates();';
const initIdx = logicBlock.indexOf(initMarker);
const functionsBlock = logicBlock.slice(0, initIdx);
const initBlock = logicBlock.slice(initIdx + 1);

const importHeader = `import {
  STORAGE_KEY, APP_VERSION, VALID_MODES, MODE_LABELS, MODE_CATEGORIES, SPEED_LABELS,
  DEFAULT_NAMES, DEFAULT_PRESETS, MAX_NAMES, MIN_NAMES, MAX_HISTORY, HISTORY_DEFAULT_SHOW,
  SEG_COLORS, SPEED_CONFIG
} from './config.js';
import {
  state, names, settingsDraft, settingsDraftExcluded, historyShowAll, pendingPinAction,
  lastResultText, lastSlackText, pinUnlockBuffer, dailyResetTimer, undoSnapshot,
  settingsSaveTimer, deferredInstallPrompt, tourStep, swRegistration, TOUR_STEPS
} from './state.js';
import { el } from './dom.js';

`;

fs.writeFileSync(path.join(jsDir, 'app-logic.js'), importHeader + functionsBlock);

fs.writeFileSync(
  path.join(jsDir, 'events.js'),
  `${importHeader}import * as app from './app-logic.js';

export function bindEvents() {
${eventsBlock.replace(/\b([a-z][a-zA-Z0-9]*)\(/g, (m, fn) => {
  const skip = ['document', 'console', 'window', 'navigator', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'confirm', 'alert', 'encodeURIComponent', 'parseInt', 'isNaN', 'fetch', 'URL', 'Blob', 'FileReader', 'cancelAnimationFrame', 'requestAnimationFrame'];
  if (skip.includes(fn) || fn === 'el') return m;
  if (['addEventListener', 'removeEventListener', 'getElementById', 'querySelector', 'querySelectorAll', 'writeText', 'slice', 'map', 'filter', 'forEach', 'join', 'push', 'includes', 'toggle', 'contains', 'preventDefault', 'focus', 'click', 'open', 'matchMedia', 'register', 'prompt', 'readAsText', 'postMessage', 'reload'].includes(fn)) return m;
  return `app.${fn}(`;
})}
}
`
);

fs.writeFileSync(
  path.join(jsDir, 'init.js'),
  `${importHeader}import * as app from './app-logic.js';

export function bootstrap() {
${initBlock}
}
`
);

fs.writeFileSync(
  path.join(jsDir, 'main.js'),
  `/** Fair Ads Spinner — entry point */
import { bindDom } from './dom.js';
import { bindEvents } from './events.js';
import { bootstrap } from './init.js';

bindDom();
bindEvents();
bootstrap();
`
);

console.log('Done — js/config.js, state.js, dom.js, app-logic.js, events.js, init.js, main.js');

/** Mutable app state */
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
  { title: 'Welcome!', text: 'Fair Ads Spinner picks someone fairly when a lead comes in. Let\'s walk through the basics.' },
  { title: 'Spin the wheel', text: 'Tap SPIN or press Space when a lead arrives. The wheel is for show — fairness is decided instantly.' },
  { title: 'Status pills', text: 'Mode, speed, task & round progress show at a glance. Tap the task pill to edit it.' },
  { title: 'Settings ⚙', text: 'Set your team, task presets, fairness mode & more. Names auto-save as you type.' },
  { title: 'History 🕐', text: 'Every spin is logged. Export CSV for records or undo the last spin if you mis-clicked.' }
];

/** App constants */
export const STORAGE_KEY = 'fairAdsSpinner_v5';
export const APP_VERSION = 10;
export const VALID_MODES = ['fairBag', 'pureRandom', 'weighted', 'antiRepeat', 'lastExcluded', 'lowestFirst', 'strictBalance'];
export const MODE_LABELS = {
  fairBag: 'Fair Bag',
  pureRandom: 'Pure Random',
  weighted: 'Weighted',
  antiRepeat: 'Anti-Repeat',
  lastExcluded: 'Last Excluded',
  lowestFirst: 'Lowest First',
  strictBalance: 'Strict Balance'
};
export const MODE_CATEGORIES = {
  fairBag: 'Recommended',
  pureRandom: 'Luck mode',
  weighted: 'Soft balance',
  antiRepeat: 'Extra rules',
  lastExcluded: 'Extra rules',
  lowestFirst: 'Extra rules',
  strictBalance: 'Extra rules'
};
export const SPEED_LABELS = { quick: 'Quick', normal: 'Normal', dramatic: 'Dramatic' };
export const DEFAULT_NAMES = ['Peter', 'Simon', 'Shaun', 'Danny'];
export const DEFAULT_PRESETS = ['Facebook lead', 'Callback', 'Walk-in', 'Instagram DM'];
export const MAX_NAMES = 12;
export const MIN_NAMES = 2;
export const MAX_HISTORY = 500;
export const HISTORY_DEFAULT_SHOW = 50;
export const SEG_COLORS = ['#facc15', '#f472b6', '#38bdf8', '#4ade80', '#a855f7', '#fb923c', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e879f9', '#fb7185'];

export const SPEED_CONFIG = {
  quick:    { duration: 1.0, extraTurns: 3 },
  normal:   { duration: 3.5, extraTurns: 6 },
  dramatic: { duration: 5.5, extraTurns: 8 }
};

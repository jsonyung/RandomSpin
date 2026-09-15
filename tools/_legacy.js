const STORAGE_KEY = 'fairAdsSpinner_v5';
const APP_VERSION = 6;
const VALID_MODES = ['fairBag', 'pureRandom', 'weighted', 'antiRepeat', 'lastExcluded', 'lowestFirst', 'strictBalance'];
const MODE_LABELS = {
  fairBag: 'Fair Bag',
  pureRandom: 'Pure Random',
  weighted: 'Weighted',
  antiRepeat: 'Anti-Repeat',
  lastExcluded: 'Last Excluded',
  lowestFirst: 'Lowest First',
  strictBalance: 'Strict Balance'
};
const MODE_CATEGORIES = {
  fairBag: 'Recommended',
  pureRandom: 'Luck mode',
  weighted: 'Soft balance',
  antiRepeat: 'Extra rules',
  lastExcluded: 'Extra rules',
  lowestFirst: 'Extra rules',
  strictBalance: 'Extra rules'
};
const SPEED_LABELS = { quick: 'Quick', normal: 'Normal', dramatic: 'Dramatic' };
const DEFAULT_NAMES = ['Peter', 'Simon', 'Shaun', 'Danny'];
const DEFAULT_PRESETS = ['Facebook lead', 'Callback', 'Walk-in', 'Instagram DM'];
const MAX_NAMES = 12;
const MIN_NAMES = 2;
const MAX_HISTORY = 500;
const HISTORY_DEFAULT_SHOW = 50;
const SEG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e879f9', '#fb7185'];

const SPEED_CONFIG = {
  quick:    { duration: 1.0, extraTurns: 3 },
  normal:   { duration: 3.5, extraTurns: 6 },
  dramatic: { duration: 5.5, extraTurns: 8 }
};

let names = [...DEFAULT_NAMES];

const state = {
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

let settingsDraft = [];
let settingsDraftExcluded = {};
let historyShowAll = false;
let pendingPinAction = null;
let lastResultText = '';
let lastSlackText = '';
let pinUnlockBuffer = '';
let dailyResetTimer = null;
let undoSnapshot = null;
let settingsSaveTimer = null;
let deferredInstallPrompt = null;
let tourStep = 0;
let swRegistration = null;

const TOUR_STEPS = [
  { title: 'Welcome!', text: 'Fair Ads Spinner picks someone fairly when a lead comes in. Let\'s walk through the basics.' },
  { title: 'Spin the wheel', text: 'Tap SPIN or press Space when a lead arrives. The wheel is for show — fairness is decided instantly.' },
  { title: 'Status pills', text: 'Mode, speed, task & round progress show at a glance. Tap the task pill to edit it.' },
  { title: 'Settings ⚙', text: 'Set your team, task presets, fairness mode & more. Names auto-save as you type.' },
  { title: 'History 🕐', text: 'Every spin is logged. Export CSV for records or undo the last spin if you mis-clicked.' }
];

const wheelRotator = document.getElementById('wheelRotator');
const wheelSvg = document.getElementById('wheelSvg');
const spinBtn = document.getElementById('spinBtn');
const taskInputSettings = document.getElementById('taskInputSettings');
const modeHint = document.getElementById('modeHint');
const statusMode = document.getElementById('statusMode');
const statusSpeed = document.getElementById('statusSpeed');
const statusRound = document.getElementById('statusRound');
const tallyEl = document.getElementById('tally');
const resultModal = document.getElementById('resultModal');
const settingsPage = document.getElementById('settingsPage');
const modalWinner = document.getElementById('modalWinner');
const modalMessage = document.getElementById('modalMessage');
const nameListEl = document.getElementById('nameList');
const settingsError = document.getElementById('settingsError');
const helpModal = document.getElementById('helpModal');
const soundToggle = document.getElementById('soundToggle');
const confettiToggle = document.getElementById('confettiToggle');
const quickResultToggle = document.getElementById('quickResultToggle');
const modeGroups = document.getElementById('modeGroups');
const statusTask = document.getElementById('statusTask');
const historyPage = document.getElementById('historyPage');
const historyList = document.getElementById('historyList');
const historySearch = document.getElementById('historySearch');
const historyFilterPerson = document.getElementById('historyFilterPerson');
const historyFilterMode = document.getElementById('historyFilterMode');
const presetList = document.getElementById('presetList');
const pinModal = document.getElementById('pinModal');
const pinToggle = document.getElementById('pinToggle');
const dailyResetToggle = document.getElementById('dailyResetToggle');
const dailyResetTime = document.getElementById('dailyResetTime');
const lockBtn = document.getElementById('lockBtn');
const headerSpacer = document.getElementById('headerSpacer');

const SpinAudio = {
  ctx: null,
  tickTimer: null,

  init() {
    if (!state.soundEnabled) return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  playTick() {
    if (!state.soundEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.04);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22 * state.soundVolume, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  },

  playWhoosh() {
    if (!state.soundEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12 * state.soundVolume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
  },

  playWin() {
    if (!state.soundEnabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18 * state.soundVolume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  },

  startSpin(duration) {
    this.stopSpin();
    if (!state.soundEnabled) return;
    this.init();
    this.playWhoosh();
    let elapsed = 0;
    let interval = 55;
    const tick = () => {
      if (elapsed >= duration) return;
      this.playTick();
      elapsed += interval / 1000;
      interval = Math.min(320, interval * 1.08);
      this.tickTimer = setTimeout(tick, interval);
    };
    tick();
  },

  stopSpin() {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }
};

const Confetti = {
  canvas: null,
  ctx: null,
  particles: [],
  raf: null,

  init() {
    this.canvas = document.getElementById('confetti');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  burst() {
    if (!state.confettiEnabled || !this.ctx) return;
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#6366f1'];
    this.particles = [];
    for (let i = 0; i < 120; i++) {
      this.particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -12 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[i % colors.length],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        life: 1
      });
    }
    if (this.raf) cancelAnimationFrame(this.raf);
    this.animate();
  },

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let alive = 0;
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life <= 0) return;
      alive++;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rot * Math.PI / 180);
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      this.ctx.restore();
    });
    if (alive > 0) {
      this.raf = requestAnimationFrame(() => this.animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};

async function hashPin(pin) {
  const s = String(pin);
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fairAdsSpinner:' + s));
    return 'sha256:' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'legacy:' + btoa(s);
}

async function verifyPin(pin) {
  if (!state.pinHash) return false;
  const s = String(pin);
  if (state.pinHash.startsWith('legacy:')) return state.pinHash === 'legacy:' + btoa(s);
  const h = await hashPin(s);
  return h === state.pinHash;
}

const pinLockBanner = document.getElementById('pinLockBanner');
const assignmentSection = document.getElementById('assignmentSection');
const animationSection = document.getElementById('animationSection');

function showSettingsToast(msg, ms = 2800) {
  settingsError.textContent = msg;
  settingsError.classList.add('settings-toast');
  clearTimeout(showSettingsToast._t);
  showSettingsToast._t = setTimeout(() => {
    if (settingsError.textContent === msg) {
      settingsError.textContent = '';
      settingsError.classList.remove('settings-toast');
    }
  }, ms);
}

function updateLockUI() {
  const showLock = state.pinEnabled && !state.pinUnlocked;
  lockBtn.style.display = showLock ? '' : 'none';
  headerSpacer.style.display = showLock ? 'none' : '';
  pinLockBanner?.classList.toggle('show', showLock);
  assignmentSection?.classList.toggle('pin-locked', showLock);
  animationSection?.classList.toggle('pin-locked', showLock);
}

function requirePinUnlock(action) {
  if (!state.pinEnabled || state.pinUnlocked) {
    action();
    return;
  }
  pendingPinAction = action;
  openPinModal();
}

function openPinModal() {
  pinUnlockBuffer = '';
  document.getElementById('pinError').textContent = '';
  updatePinDots();
  pinModal.classList.add('show');
  document.getElementById('pinUnlockInput').focus();
}

function closePinModal() {
  pinModal.classList.remove('show');
  pinUnlockBuffer = '';
  updatePinDots();
  pendingPinAction = null;
}

function updatePinDots() {
  document.querySelectorAll('#pinDots .pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinUnlockBuffer.length);
  });
}

async function tryPinUnlock(digits) {
  if (await verifyPin(digits)) {
    state.pinUnlocked = true;
    updateLockUI();
    closePinModal();
    if (pendingPinAction) {
      const fn = pendingPinAction;
      pendingPinAction = null;
      fn();
    }
    if (settingsPage.classList.contains('open')) {
      showSettingsToast('Unlocked — you can change mode & speed this session.');
    } else {
      showHomeToast('Unlocked for this session.');
    }
  } else {
    document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
    pinUnlockBuffer = '';
    updatePinDots();
  }
}

function handlePinKey(digit) {
  if (pinUnlockBuffer.length >= 4) return;
  pinUnlockBuffer += digit;
  updatePinDots();
  if (pinUnlockBuffer.length === 4) tryPinUnlock(pinUnlockBuffer);
}

function resolveTheme(theme) {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.setAttribute('data-theme', resolveTheme(theme));
  document.querySelectorAll('#themeButtons button').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  renderWheel();
}

function showHomeToast(msg, ms = 2600) {
  const el = document.getElementById('homeToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showHomeToast._t);
  showHomeToast._t = setTimeout(() => el.classList.remove('show'), ms);
}

function getSpinConfig() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return { duration: 0.01, extraTurns: 0 };
  return SPEED_CONFIG[state.speed];
}

function lastWinTimestamp(name) {
  for (const e of state.history) {
    if (e.winner === name) return e.timestamp;
  }
  return 0;
}

function syncFairBagDeckWithEligible() {
  const eligible = new Set(getEligibleNames());
  state.fairBagDeck = state.fairBagDeck.filter(n => eligible.has(n));
  if (state.fairBagDeck.length === 0 && eligible.size > 0) refillFairBagDeck();
}

function updateLastResultStrip() {
  const el = document.getElementById('lastResultStrip');
  if (!state.history.length) {
    el.innerHTML = '';
    return;
  }
  const e = state.history[0];
  const task = e.task || 'this lead';
  const when = formatRelativeTime(e.timestamp);
  el.innerHTML = `Last: <strong>${escapeHtml(e.winner)}</strong> · ${escapeHtml(task)} · ${when}` +
    (undoSnapshot ? ` <button type="button" id="undoFromStrip">Undo</button>` : '');
  const undoBtn = document.getElementById('undoFromStrip');
  if (undoBtn) undoBtn.addEventListener('click', undoLastSpin);
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

function announceWinner(winner, task) {
  const label = task.trim() || 'this lead';
  document.getElementById('ariaLive').textContent = `${winner} chosen for ${label}`;
}

function getRecentTasks() {
  const seen = new Set();
  const out = [];
  for (const e of state.history) {
    const t = (e.task || '').trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
      if (out.length >= 3) break;
    }
  }
  return out;
}

function renderRecentTasks() {
  const el = document.getElementById('recentTasks');
  const recent = getRecentTasks();
  if (!recent.length) { el.innerHTML = ''; return; }
  el.innerHTML = recent.map(t =>
    `<button type="button" class="recent-task-chip" data-recent-task="${escapeHtml(t)}">${escapeHtml(t)}</button>`
  ).join('');
}

function renderFairBagPanel() {
  const panel = document.getElementById('fairBagPanel');
  if (state.mode !== 'fairBag') {
    panel.style.display = 'none';
    return;
  }
  const remaining = state.fairBagDeck.filter(n => getEligibleNames().includes(n));
  if (!remaining.length) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'flex';
  const next = remaining[0];
  panel.innerHTML = `<span class="fairbag-label">Still this round · next up: ${escapeHtml(next)}</span>` +
    remaining.map(n =>
      `<span class="remaining-chip${n === next ? ' next' : ''}">${escapeHtml(n)}</span>`
    ).join('');
}

function getTodayHistory() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return state.history.filter(e => e.timestamp >= start.getTime());
}

function buildDaySummary() {
  const today = getTodayHistory();
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const lines = [`📊 Fair Ads Spinner — ${dateStr}`, ''];
  lines.push(`Mode: ${MODE_LABELS[state.mode]} · Team: ${names.join(', ')}`);
  lines.push('', 'Today\'s tally:');
  const counts = {};
  today.forEach(e => { counts[e.winner] = (counts[e.winner] || 0) + 1; });
  names.forEach(n => lines.push(`  ${n}: ${counts[n] || 0} lead${counts[n] === 1 ? '' : 's'}`));
  lines.push('', `Total spins today: ${today.length}`);
  if (today.length) {
    lines.push('', 'Log:');
    today.slice(0, 15).forEach(e => {
      const t = e.task || 'this lead';
      const time = new Date(e.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      lines.push(`  ${time} — ${e.winner} (${t})`);
    });
    if (today.length > 15) lines.push(`  … +${today.length - 15} more`);
  }
  return lines.join('\n');
}

function buildWeeklyReport() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const week = state.history.filter(e => e.timestamp >= startOfWeek.getTime());
  const lines = ['📈 Weekly Lead Report — Fair Ads Spinner', ''];
  lines.push(`Week of ${startOfWeek.toLocaleDateString()} · Mode: ${MODE_LABELS[state.mode]}`);
  lines.push('', 'Assignments this week:');
  const counts = {};
  week.forEach(e => { counts[e.winner] = (counts[e.winner] || 0) + 1; });
  names.forEach(n => lines.push(`  ${n}: ${counts[n] || 0}`));
  const byTask = {};
  week.forEach(e => {
    const t = e.task || '(no task)';
    byTask[t] = (byTask[t] || 0) + 1;
  });
  lines.push('', 'By task type:');
  Object.entries(byTask).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => lines.push(`  ${t}: ${c}`));
  lines.push('', `Total: ${week.length} spins`);
  return lines.join('\n');
}

async function copyDaySummary() {
  try {
    await navigator.clipboard.writeText(buildDaySummary());
    showHomeToast('Today\'s summary copied!');
  } catch (_) { showHomeToast('Could not copy.'); }
}

async function copyWeeklyReport() {
  try {
    await navigator.clipboard.writeText(buildWeeklyReport());
    showSettingsToast('Weekly report copied!');
  } catch (_) { settingsError.textContent = 'Could not copy report.'; }
}

async function shareResult() {
  const text = lastResultText;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Lead assignment', text });
      return;
    } catch (_) { /* fall through */ }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(wa, '_blank', 'noopener');
}

const WIZARD_OPTIONS = [
  { label: '⚖️ Equal ads for everyone', sub: 'Shuffled deck — Fair Bag', mode: 'fairBag' },
  { label: '🎲 Pure luck — coin flip', sub: 'No balance rules — Pure Random', mode: 'pureRandom' },
  { label: '📈 Catch-up for whoever is behind', sub: 'Weighted mode', mode: 'weighted' },
  { label: '🚫 No back-to-back wins', sub: 'Anti-Repeat', mode: 'antiRepeat' },
  { label: '⚙️ Browse all modes in Settings', sub: '', action: 'settings' }
];

function openModeWizard() {
  if (state.isSpinning) return;
  const opts = document.getElementById('wizardOptions');
  opts.innerHTML = WIZARD_OPTIONS.map((o, i) =>
    `<button type="button" class="wizard-opt" data-wizard-idx="${i}">${o.label}${o.sub ? `<br><span style="font-weight:400;font-size:0.78rem;color:var(--muted)">${o.sub}</span>` : ''}</button>`
  ).join('');
  document.getElementById('modeWizardModal').classList.add('show');
}

function closeModeWizard() {
  document.getElementById('modeWizardModal').classList.remove('show');
}

function applyWizardChoice(idx) {
  const opt = WIZARD_OPTIONS[idx];
  closeModeWizard();
  if (opt.action === 'settings') {
    openSettings();
    return;
  }
  const apply = () => {
    state.mode = opt.mode;
    syncModeButtons();
    initFairBag();
    updateStatusBar();
    renderFairBagPanel();
    savePrefs();
    showHomeToast(`Mode set to ${MODE_LABELS[opt.mode]}`);
  };
  if (state.pinEnabled && !state.pinUnlocked) {
    pendingPinAction = apply;
    openPinModal();
    return;
  }
  apply();
}

function openHelp() {
  if (state.isSpinning) return;
  helpModal.classList.add('show');
}

function closeHelp() {
  helpModal.classList.remove('show');
}

function modeHintText() {
  const n = getEligibleNames().length || names.length;
  const pct = Math.round(100 / Math.max(n, 1));
  return {
    fairBag: `Recommended — shuffled deck, everyone gets exactly 1 per round of ${n}.`,
    pureRandom: `Fresh ${pct}% chance every spin — no memory, repeats OK.`,
    weighted: 'Soft catch-up — fewer session wins = higher chance next spin.',
    antiRepeat: 'No back-to-back wins — same person cannot win twice in a row.',
    lastExcluded: 'Previous winner sits out the next spin only.',
    lowestFirst: 'Random among people tied for the fewest session wins.',
    strictBalance: 'Minimum win count — ties go to whoever waited longest since last win.'
  }[state.mode];
}

function updateModeHint() {
  modeHint.innerHTML = `<strong>${MODE_CATEGORIES[state.mode]}</strong> — ${modeHintText()}`;
}

function syncModeButtons() {
  document.querySelectorAll('.mode-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
  updateModeHint();
}

function initWins(keepExisting = false) {
  const next = {};
  names.forEach(n => {
    next[n] = keepExisting && state.wins[n] != null ? state.wins[n] : 0;
  });
  state.wins = next;
}

function getEligibleNames() {
  return names.filter(n => !state.excluded[n]);
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      names: [...names],
      theme: state.theme,
      soundEnabled: state.soundEnabled,
      confettiEnabled: state.confettiEnabled,
      quickResult: state.quickResult,
      mode: state.mode,
      speed: state.speed,
      task: taskInputSettings.value,
      wins: state.wins,
      excluded: state.excluded,
      history: state.history,
      taskPresets: state.taskPresets,
      pinEnabled: state.pinEnabled,
      pinHash: state.pinHash,
      dailyResetEnabled: state.dailyResetEnabled,
      dailyResetTime: state.dailyResetTime,
      lastDailyReset: state.lastDailyReset,
      fairBagRound: state.fairBagRound,
      fairBagSpinInRound: state.fairBagSpinInRound,
      lastWinner: state.lastWinner,
      tourSeen: state.tourSeen,
      installBannerDismissed: state.installBannerDismissed,
      soundVolume: state.soundVolume,
      requireTaskBeforeSpin: state.requireTaskBeforeSpin,
      pinLockResetCounts: state.pinLockResetCounts,
      appVersion: APP_VERSION
    }));
  } catch (_) { /* ignore */ }
}

function saveToStorage() {
  savePrefs();
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
      || localStorage.getItem('fairAdsSpinner_v4')
      || localStorage.getItem('fairAdsSpinner_v3')
      || localStorage.getItem('fairAdsSpinner_v2')
      || localStorage.getItem('fairAdsSpinner_v1');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.names) && data.names.length >= MIN_NAMES) {
      names = data.names.map(n => String(n).trim()).filter(Boolean).slice(0, MAX_NAMES);
    }
    if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'auto') state.theme = data.theme;
    if (typeof data.soundEnabled === 'boolean') state.soundEnabled = data.soundEnabled;
    if (typeof data.confettiEnabled === 'boolean') state.confettiEnabled = data.confettiEnabled;
    if (typeof data.quickResult === 'boolean') state.quickResult = data.quickResult;
    if (VALID_MODES.includes(data.mode)) state.mode = data.mode;
    if (data.speed === 'quick' || data.speed === 'normal' || data.speed === 'dramatic') state.speed = data.speed;
    if (typeof data.task === 'string') taskInputSettings.value = data.task;
    if (data.wins && typeof data.wins === 'object') state.wins = data.wins;
    if (data.excluded && typeof data.excluded === 'object') state.excluded = data.excluded;
    if (Array.isArray(data.history)) state.history = data.history.slice(0, MAX_HISTORY);
    if (Array.isArray(data.taskPresets) && data.taskPresets.length) state.taskPresets = data.taskPresets;
    if (typeof data.pinEnabled === 'boolean') state.pinEnabled = data.pinEnabled;
    if (typeof data.pinHash === 'string') state.pinHash = data.pinHash;
    if (typeof data.dailyResetEnabled === 'boolean') state.dailyResetEnabled = data.dailyResetEnabled;
    if (typeof data.dailyResetTime === 'string') state.dailyResetTime = data.dailyResetTime;
    if (data.lastDailyReset) state.lastDailyReset = data.lastDailyReset;
    if (typeof data.fairBagRound === 'number') state.fairBagRound = data.fairBagRound;
    if (typeof data.fairBagSpinInRound === 'number') state.fairBagSpinInRound = data.fairBagSpinInRound;
    if (typeof data.lastWinner === 'string') state.lastWinner = data.lastWinner;
    if (typeof data.tourSeen === 'boolean') state.tourSeen = data.tourSeen;
    if (typeof data.installBannerDismissed === 'boolean') state.installBannerDismissed = data.installBannerDismissed;
    if (typeof data.soundVolume === 'number') state.soundVolume = Math.min(1, Math.max(0, data.soundVolume));
    if (typeof data.requireTaskBeforeSpin === 'boolean') state.requireTaskBeforeSpin = data.requireTaskBeforeSpin;
    if (typeof data.pinLockResetCounts === 'boolean') state.pinLockResetCounts = data.pinLockResetCounts;
  } catch (_) { /* ignore */ }
  if (names.length < MIN_NAMES) names = [...DEFAULT_NAMES];
  if (!state.taskPresets.length) state.taskPresets = [...DEFAULT_PRESETS];
}

function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('names')) {
    const parsed = params.get('names').split(',').map(s => s.trim()).filter(Boolean);
    if (parsed.length >= MIN_NAMES) names = parsed.slice(0, MAX_NAMES);
  }
  const mode = params.get('mode');
  if (mode && VALID_MODES.includes(mode)) state.mode = mode;
  const speed = params.get('speed');
  if (speed === 'quick' || speed === 'normal' || speed === 'dramatic') state.speed = speed;
  const task = params.get('task');
  if (task) taskInputSettings.value = task;
}

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initFairBag() {
  state.fairBagDeck = fisherYates(getEligibleNames());
  if (state.fairBagDeck.length === 0) state.fairBagDeck = fisherYates(names);
  state.fairBagRound = 1;
  state.fairBagSpinInRound = 0;
}

function refillFairBagDeck() {
  state.fairBagDeck = fisherYates(getEligibleNames());
  if (state.fairBagDeck.length === 0) state.fairBagDeck = fisherYates(names);
  state.fairBagSpinInRound = 0;
  state.fairBagRound++;
}

function pickFairBag() {
  if (state.fairBagDeck.length === 0) refillFairBagDeck();
  state.fairBagSpinInRound++;
  return state.fairBagDeck.shift();
}

function pickFromPool(pool) {
  if (!pool.length) pool = [...names];
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickPureRandom() {
  const pool = getEligibleNames();
  return pickFromPool(pool.length ? pool : names);
}

function pickWeighted() {
  const pool = getEligibleNames().length ? getEligibleNames() : names;
  const weights = pool.map(n => 1 / (state.wins[n] + 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function pickAntiRepeat() {
  let pool = getEligibleNames().length ? getEligibleNames() : [...names];
  if (state.lastWinner && pool.length > 1) {
    pool = pool.filter(n => n !== state.lastWinner);
    if (!pool.length) pool = getEligibleNames().length ? getEligibleNames() : [...names];
  }
  return pickFromPool(pool);
}

function pickLastExcluded() {
  let pool = getEligibleNames().length ? getEligibleNames() : [...names];
  if (state.lastWinner && pool.length > 1) {
    pool = pool.filter(n => n !== state.lastWinner);
    if (!pool.length) pool = names.filter(n => n !== state.lastWinner);
  }
  return pickFromPool(pool.length ? pool : names);
}

function pickLowestFirst() {
  const pool = getEligibleNames().length ? getEligibleNames() : names;
  const minWins = Math.min(...pool.map(n => state.wins[n] ?? 0));
  const tied = pool.filter(n => (state.wins[n] ?? 0) === minWins);
  return pickFromPool(tied);
}

function pickStrictBalance() {
  const pool = getEligibleNames().length ? getEligibleNames() : names;
  const minWins = Math.min(...pool.map(n => state.wins[n] ?? 0));
  const tied = pool.filter(n => (state.wins[n] ?? 0) === minWins);
  const oldest = Math.min(...tied.map(n => lastWinTimestamp(n)));
  const drought = tied.filter(n => lastWinTimestamp(n) === oldest);
  return pickFromPool(drought);
}

function pickWinner() {
  switch (state.mode) {
    case 'fairBag': return pickFairBag();
    case 'pureRandom': return pickPureRandom();
    case 'weighted': return pickWeighted();
    case 'antiRepeat': return pickAntiRepeat();
    case 'lastExcluded': return pickLastExcluded();
    case 'lowestFirst': return pickLowestFirst();
    case 'strictBalance': return pickStrictBalance();
    default: return pickPureRandom();
  }
}

function addHistoryEntry(winner, task, id) {
  const entry = {
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    winner,
    task: task.trim(),
    mode: state.mode,
    speed: state.speed,
    timestamp: Date.now()
  };
  state.history.unshift(entry);
  if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
  savePrefs();
}

function segmentSize() {
  return 360 / names.length;
}

function landingAngleForIndex(index) {
  const seg = segmentSize();
  return 360 - index * seg - seg / 2;
}

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function fitFontSize(name, segDeg) {
  const len = name.length;
  if (segDeg >= 60) return len > 8 ? 11 : len > 5 ? 13 : 15;
  if (segDeg >= 45) return len > 8 ? 9 : len > 5 ? 11 : 13;
  return len > 6 ? 8 : 10;
}

function renderWheel() {
  const n = names.length;
  const seg = 360 / n;
  const cx = 100, cy = 100, outerR = 98, innerR = 38;
  let svg = '';

  for (let i = 0; i < n; i++) {
    const start = i * seg;
    const end = (i + 1) * seg;
    const excluded = !!state.excluded[names[i]];
    const color = excluded ? '#64748b' : SEG_COLORS[i % SEG_COLORS.length];
    const opacity = excluded ? ' opacity="0.45"' : '';
    svg += `<path d="${describeArc(cx, cy, outerR, start, end)}" fill="${color}"${opacity} stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>`;
  }

  const centerColor = getComputedStyle(document.body).getPropertyValue('--wheel-center').trim() || '#1e293b';
  svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${centerColor}" stroke="rgba(128,128,128,0.25)" stroke-width="1"/>`;

  for (let i = 0; i < n; i++) {
    const mid = (i + 0.5) * seg;
    const pos = polarToCartesian(cx, cy, 68, mid);
    const fs = fitFontSize(names[i], seg);
    let rot = mid;
    if (mid > 90 && mid < 270) rot += 180;
    svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" transform="rotate(${rot}, ${pos.x}, ${pos.y})">${escapeHtml(names[i])}</text>`;
  }

  wheelSvg.innerHTML = svg;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTally() {
  tallyEl.style.gridTemplateColumns = `repeat(${Math.min(names.length, 4)}, 1fr)`;
  tallyEl.innerHTML = names.map((name, i) => `
    <div class="tally-item">
      <div class="tally-name">${escapeHtml(name)}</div>
      <div class="tally-count" style="color:${SEG_COLORS[i % SEG_COLORS.length]}">${state.wins[name]}</div>
    </div>
  `).join('');
}

function syncModeSpeedUI() {
  syncModeButtons();
  document.querySelectorAll('#speedButtons button').forEach(b => {
    b.classList.toggle('active', b.dataset.speed === state.speed);
  });
}

function updateStatusBar() {
  const locked = state.pinEnabled && !state.pinUnlocked;
  statusMode.textContent = locked ? `🔒 ${MODE_LABELS[state.mode]}` : (MODE_LABELS[state.mode] || state.mode);
  statusSpeed.textContent = locked ? `🔒 ${SPEED_LABELS[state.speed]}` : SPEED_LABELS[state.speed];
  statusMode.classList.toggle('locked', locked);
  statusSpeed.classList.toggle('locked', locked);
  const task = taskInputSettings.value.trim();
  if (task) {
    statusTask.textContent = task;
    statusTask.title = task;
    statusTask.style.display = '';
  } else {
    statusTask.style.display = 'none';
  }
  if (state.mode === 'fairBag') {
    const eligible = getEligibleNames().length || names.length;
    const spin = state.fairBagSpinInRound === 0 ? 1 : state.fairBagSpinInRound;
    statusRound.textContent = `Round ${state.fairBagRound} · ${spin}/${eligible}`;
    statusRound.style.display = '';
  } else {
    statusRound.style.display = 'none';
  }
  renderFairBagPanel();
  renderRecentTasks();
}

function setControlsDisabled(disabled) {
  spinBtn.disabled = disabled;
  document.getElementById('settingsBtn').disabled = disabled;
  document.getElementById('helpBtn').disabled = disabled;
  document.getElementById('historyBtn').disabled = disabled;
  document.querySelectorAll('#speedButtons button').forEach(btn => {
    btn.disabled = disabled;
  });
  document.querySelectorAll('.mode-opt').forEach(btn => { btn.disabled = disabled; });
}

function showResultModal(winner, task) {
  const taskLabel = task.trim() || 'this lead';
  lastResultText = `${winner} has been chosen for ${taskLabel}!`;
  lastSlackText = `@${winner} — ${taskLabel} (via Fair Ads Spinner)`;
  modalWinner.textContent = winner;
  modalMessage.textContent = lastResultText;
  document.getElementById('modalMeta').textContent = `${MODE_LABELS[state.mode]} · ${SPEED_LABELS[state.speed]}`;
  document.getElementById('modalUndo').style.display = undoSnapshot ? '' : 'none';
  resultModal.classList.add('show');
  announceWinner(winner, task);
  Confetti.burst();
  if (state.quickResult) {
    setTimeout(() => {
      if (resultModal.classList.contains('show')) hideResultModal();
    }, 2000);
  }
}

function hideResultModal() {
  resultModal.classList.remove('show');
}

function spin() {
  if (state.isSpinning || names.length < MIN_NAMES) return;
  const eligible = getEligibleNames();
  if (!eligible.length) {
    showHomeToast('Everyone is excluded — uncheck Exclude in Settings.');
    return;
  }
  if (state.requireTaskBeforeSpin && !taskInputSettings.value.trim()) {
    showHomeToast('Set a task first — tap task pill or ⚙ Settings.');
    return;
  }

  undoSnapshot = null;
  const preSpin = {
    wins: JSON.parse(JSON.stringify(state.wins)),
    lastWinner: state.lastWinner,
    fairBagDeck: [...state.fairBagDeck],
    fairBagRound: state.fairBagRound,
    fairBagSpinInRound: state.fairBagSpinInRound,
    historyLen: state.history.length
  };

  const winner = pickWinner();
  const winnerIndex = names.indexOf(winner);
  const { duration, extraTurns } = getSpinConfig();

  const landing = landingAngleForIndex(winnerIndex);
  const currentMod = state.currentRotation % 360;
  let delta = landing - currentMod;
  if (delta <= 0) delta += 360;

  const targetRotation = state.currentRotation + 360 * extraTurns + delta;
  state.isSpinning = true;
  setControlsDisabled(true);

  SpinAudio.init();
  SpinAudio.startSpin(duration);

  wheelRotator.style.transition = `transform ${duration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
  wheelRotator.style.transform = `rotate(${targetRotation}deg)`;
  state.currentRotation = targetRotation;

  const onEnd = (e) => {
    if (e.propertyName !== 'transform') return;
    wheelRotator.removeEventListener('transitionend', onEnd);

    SpinAudio.stopSpin();
    SpinAudio.playWin();

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    undoSnapshot = { winner, entryId, ...preSpin };

    state.wins[winner]++;
    state.lastWinner = winner;
    addHistoryEntry(winner, taskInputSettings.value, entryId);
    renderTally();
    updateStatusBar();
    updateLastResultStrip();
    showResultModal(winner, taskInputSettings.value);

    state.isSpinning = false;
    setControlsDisabled(false);
  };

  wheelRotator.addEventListener('transitionend', onEnd);
}

function renderSettingsList() {
  nameListEl.innerHTML = '';
  settingsDraft.forEach((name, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'name-row-wrap';
    const excluded = !!settingsDraftExcluded[name];
    wrap.innerHTML = `
      <div class="name-row">
        <input type="text" value="${escapeHtml(name)}" data-idx="${idx}" maxlength="24" aria-label="Person name">
        <button type="button" class="btn-remove" data-idx="${idx}" title="Remove" ${settingsDraft.length <= MIN_NAMES ? 'disabled' : ''}>×</button>
      </div>
      <label class="exclude-label">
        <input type="checkbox" class="exclude-cb" data-name="${escapeHtml(name)}" ${excluded ? 'checked' : ''}>
        Exclude from next spins
      </label>
    `;
    nameListEl.appendChild(wrap);
  });
}

function renderPresets() {
  presetList.innerHTML = state.taskPresets.map((p, i) => `
    <span class="preset-chip-wrap">
      <button type="button" class="preset-chip" data-preset="${escapeHtml(p)}" title="Tap to set task">${escapeHtml(p)}</button>
      <button type="button" class="preset-chip-remove" data-remove-preset="${i}" title="Remove preset" aria-label="Remove ${escapeHtml(p)}">×</button>
    </span>
  `).join('');
}

function syncSettingsToggles() {
  soundToggle.checked = state.soundEnabled;
  confettiToggle.checked = state.confettiEnabled;
  quickResultToggle.checked = state.quickResult;
  pinToggle.checked = state.pinEnabled;
  document.getElementById('pinLockResetToggle').checked = state.pinLockResetCounts;
  document.getElementById('requireTaskToggle').checked = state.requireTaskBeforeSpin;
  dailyResetToggle.checked = state.dailyResetEnabled;
  dailyResetTime.value = state.dailyResetTime || '09:00';
  const vol = Math.round((state.soundVolume ?? 0.8) * 100);
  document.getElementById('soundVolume').value = vol;
  document.getElementById('volumeLabel').textContent = `${vol}%`;
  document.getElementById('volumeRow').style.opacity = state.soundEnabled ? '1' : '0.45';
}

function getFilteredHistory() {
  const q = historySearch.value.trim().toLowerCase();
  const person = historyFilterPerson.value;
  const mode = historyFilterMode.value;
  const dateFilter = document.getElementById('historyFilterDate')?.value || '';
  const taskFilter = document.getElementById('historyFilterTask')?.value || '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - ((now.getDay() + 6) % 7) * 86400000;
  return state.history.filter(entry => {
    if (person && entry.winner !== person) return false;
    if (mode && entry.mode !== mode) return false;
    if (taskFilter && (entry.task || '') !== taskFilter) return false;
    if (dateFilter === 'today' && entry.timestamp < startOfToday) return false;
    if (dateFilter === 'week' && entry.timestamp < startOfWeek) return false;
    if (q) {
      const hay = `${entry.winner} ${entry.task} ${MODE_LABELS[entry.mode] || entry.mode}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderHistoryStats() {
  const el = document.getElementById('historyStats');
  const filtered = getFilteredHistory();
  const total = filtered.length;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const today = filtered.filter(e => e.timestamp >= todayStart.getTime()).length;
  const byPerson = {};
  filtered.forEach(e => { byPerson[e.winner] = (byPerson[e.winner] || 0) + 1; });
  const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0];
  el.innerHTML = `
    <div class="history-stat"><div class="val">${total}</div><div class="lbl">Spins</div></div>
    <div class="history-stat"><div class="val">${today}</div><div class="lbl">Today</div></div>
    <div class="history-stat"><div class="val">${top ? top[1] : 0}</div><div class="lbl">${top ? escapeHtml(top[0]) : 'Top'}</div></div>
  `;
}

function undoLastSpin() {
  if (!undoSnapshot || state.isSpinning) return;
  const snap = undoSnapshot;
  state.history = state.history.filter(e => e.id !== snap.entryId);
  state.wins = snap.wins;
  state.lastWinner = snap.lastWinner;
  state.fairBagDeck = [...snap.fairBagDeck];
  state.fairBagRound = snap.fairBagRound;
  state.fairBagSpinInRound = snap.fairBagSpinInRound;
  undoSnapshot = null;
  savePrefs();
  renderTally();
  renderWheel();
  updateStatusBar();
  updateLastResultStrip();
  hideResultModal();
  showHomeToast('Last spin undone.');
}

function renderHistoryChart() {
  const el = document.getElementById('historyChart');
  const filtered = getFilteredHistory();
  const counts = {};
  filtered.forEach(e => { counts[e.winner] = (counts[e.winner] || 0) + 1; });
  const entries = names.map(n => [n, counts[n] || 0]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  if (!filtered.length) { el.innerHTML = ''; return; }
  el.innerHTML = entries.map(([name, count]) => `
    <div class="chart-bar-row">
      <span class="chart-bar-label">${escapeHtml(name)}</span>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round(count / max * 100)}%"></div></div>
      <span class="chart-bar-val">${count}</span>
    </div>
  `).join('');
}

function renderHistoryFilters() {
  const people = [...new Set(state.history.map(h => h.winner))].sort();
  historyFilterPerson.innerHTML = '<option value="">All people</option>' +
    people.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  historyFilterMode.innerHTML = '<option value="">All modes</option>' +
    VALID_MODES.map(m => `<option value="${m}">${escapeHtml(MODE_LABELS[m])}</option>`).join('');
  const tasks = [...new Set(state.history.map(h => h.task || '').filter(Boolean))].sort();
  document.getElementById('historyFilterTask').innerHTML = '<option value="">All tasks</option>' +
    tasks.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

function renderHistoryList() {
  renderHistoryStats();
  renderHistoryChart();
  const filtered = getFilteredHistory();
  const limit = historyShowAll ? filtered.length : HISTORY_DEFAULT_SHOW;
  const shown = filtered.slice(0, limit);
  const showAllBtn = document.getElementById('showAllHistoryBtn');

  if (!filtered.length) {
    historyList.innerHTML = '<p class="history-empty">No spins recorded yet.</p>';
    showAllBtn.style.display = 'none';
    return;
  }

  historyList.innerHTML = shown.map(entry => {
    const dt = new Date(entry.timestamp);
    const when = dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const task = entry.task || 'this lead';
    return `
      <div class="history-item">
        <strong>${escapeHtml(entry.winner)}</strong> — ${escapeHtml(task)}
        <div class="history-meta">${escapeHtml(MODE_LABELS[entry.mode] || entry.mode)} · ${escapeHtml(SPEED_LABELS[entry.speed] || entry.speed)} · ${when}</div>
      </div>
    `;
  }).join('');

  if (filtered.length > HISTORY_DEFAULT_SHOW && !historyShowAll) {
    showAllBtn.style.display = '';
    showAllBtn.textContent = `Show all (${filtered.length})`;
  } else {
    showAllBtn.style.display = 'none';
  }
}

function openHistory() {
  if (state.isSpinning) return;
  historyShowAll = false;
  historySearch.value = '';
  document.getElementById('historyFilterDate').value = '';
  document.getElementById('historyFilterTask').value = '';
  historyFilterPerson.value = '';
  historyFilterMode.value = '';
  renderHistoryFilters();
  renderHistoryList();
  historyPage.classList.add('open');
  historyPage.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeHistory() {
  historyPage.classList.remove('open');
  historyPage.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function clearHistory() {
  if (!state.history.length) return;
  if (!confirm('Clear all spin history? This cannot be undone.')) return;
  state.history = [];
  savePrefs();
  renderHistoryList();
}

function downloadCSV(filename, rows) {
  const csv = rows.map(row => row.map(cell => {
    const s = String(cell ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportHistoryCSV(useFilter = false) {
  const entries = useFilter ? getFilteredHistory() : state.history;
  const rows = [['ID', 'Winner', 'Task', 'Mode', 'Speed', 'Timestamp']];
  entries.forEach(e => {
    rows.push([e.id, e.winner, e.task, MODE_LABELS[e.mode] || e.mode, SPEED_LABELS[e.speed] || e.speed, new Date(e.timestamp).toISOString()]);
  });
  const suffix = useFilter ? '-filtered' : '';
  downloadCSV(`fair-ads-history${suffix}.csv`, rows);
}

function exportTallyCSV() {
  const rows = [['Name', 'Wins', 'Excluded']];
  names.forEach(n => rows.push([n, state.wins[n] ?? 0, state.excluded[n] ? 'Yes' : 'No']));
  downloadCSV('fair-ads-tally.csv', rows);
}

function buildSummaryText() {
  const lines = ['Fair Ads Spinner — Session Summary', ''];
  lines.push(`Mode: ${MODE_LABELS[state.mode]} · Speed: ${SPEED_LABELS[state.speed]}`);
  const task = taskInputSettings.value.trim();
  if (task) lines.push(`Current task: ${task}`);
  lines.push('', 'Tally:');
  names.forEach(n => lines.push(`  ${n}: ${state.wins[n] ?? 0}${state.excluded[n] ? ' (excluded)' : ''}`));
  if (state.history.length) {
    lines.push('', `Recent spins (${Math.min(5, state.history.length)}):`);
    state.history.slice(0, 5).forEach(e => {
      lines.push(`  ${e.winner} — ${e.task || 'this lead'} (${new Date(e.timestamp).toLocaleString()})`);
    });
  }
  return lines.join('\n');
}

async function copySummaryText() {
  try {
    await navigator.clipboard.writeText(buildSummaryText());
    settingsError.textContent = 'Summary copied to clipboard.';
    setTimeout(() => { if (settingsError.textContent === 'Summary copied to clipboard.') settingsError.textContent = ''; }, 2000);
  } catch (_) {
    settingsError.textContent = 'Could not copy summary.';
  }
}

async function copyResultText() {
  try {
    await navigator.clipboard.writeText(lastResultText);
  } catch (_) { /* ignore */ }
}

function buildTeamLink() {
  const base = window.location.href.split('?')[0];
  const params = new URLSearchParams();
  params.set('names', names.join(','));
  params.set('mode', state.mode);
  params.set('speed', state.speed);
  const task = taskInputSettings.value.trim();
  if (task) params.set('task', task);
  return `${base}?${params.toString()}`;
}

async function copyTeamLink() {
  try {
    await navigator.clipboard.writeText(buildTeamLink());
    settingsError.textContent = 'Team link copied! Send it to your teammates.';
    setTimeout(() => {
      if (settingsError.textContent.startsWith('Team link copied')) settingsError.textContent = '';
    }, 2500);
  } catch (_) {
    settingsError.textContent = 'Could not copy link.';
  }
}

function doResetSessionCounts() {
  if (!confirm('Reset all session win counts to zero? History is kept.')) return;
  names.forEach(n => { state.wins[n] = 0; });
  undoSnapshot = null;
  initFairBag();
  renderTally();
  updateStatusBar();
  updateLastResultStrip();
  renderFairBagPanel();
  savePrefs();
  showSettingsToast('Session counts reset.');
}

function resetSessionCounts() {
  if (state.pinEnabled && state.pinLockResetCounts && !state.pinUnlocked) {
    pendingPinAction = doResetSessionCounts;
    openPinModal();
    return;
  }
  doResetSessionCounts();
}

function checkDailyReset() {
  if (!state.dailyResetEnabled) return;
  const now = new Date();
  const parts = (state.dailyResetTime || '09:00').split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const resetToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  const last = state.lastDailyReset ? new Date(state.lastDailyReset) : null;
  if (now >= resetToday && (!last || last < resetToday)) {
    resetSessionCounts();
    state.lastDailyReset = now.toISOString();
    savePrefs();
  }
}

function startDailyResetTimer() {
  if (dailyResetTimer) clearInterval(dailyResetTimer);
  checkDailyReset();
  dailyResetTimer = setInterval(checkDailyReset, 60000);
}

function openSettings() {
  if (state.isSpinning) return;
  settingsDraft = [...names];
  settingsDraftExcluded = { ...state.excluded };
  settingsError.textContent = '';
  syncSettingsToggles();
  syncModeSpeedUI();
  applyTheme(state.theme);
  renderSettingsList();
  renderPresets();
  settingsPage.classList.add('open');
  settingsPage.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  persistSettingsDraft();
  settingsPage.classList.remove('open');
  settingsPage.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  settingsError.textContent = '';
  settingsDraft = [...names];
}

function validateNames(list) {
  const trimmed = list.map(n => n.trim()).filter(Boolean);
  if (trimmed.length < MIN_NAMES) return 'Need at least 2 names.';
  if (trimmed.length > MAX_NAMES) return `Maximum ${MAX_NAMES} names.`;
  const lower = trimmed.map(n => n.toLowerCase());
  if (new Set(lower).size !== lower.length) return 'Names must be unique.';
  return null;
}

function persistSettingsDraft() {
  const draft = collectDraftNames();
  const err = validateNames(draft);
  if (err) {
    settingsError.textContent = err;
    settingsError.classList.remove('settings-toast');
    return false;
  }
  settingsError.textContent = '';
  const trimmed = draft.map(n => n.trim());
  const newExcluded = collectDraftExcluded(trimmed);
  const namesChanged = trimmed.length !== names.length ||
    trimmed.some((n, i) => n !== names[i]);
  const excludeChanged = trimmed.some(n => !!state.excluded[n] !== !!newExcluded[n]);

  if (namesChanged) {
    state.excluded = newExcluded;
    applyNames(trimmed);
  } else if (excludeChanged) {
    state.excluded = newExcluded;
    syncFairBagDeckWithEligible();
    renderWheel();
    updateStatusBar();
    savePrefs();
  }
  settingsDraft = [...names];
  settingsDraftExcluded = { ...state.excluded };
  return true;
}

function scheduleSettingsSave() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    if (persistSettingsDraft()) showSettingsToast('Team saved.');
  }, 600);
}

function buildBackupData() {
  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    names: [...names],
    state: {
      mode: state.mode,
      speed: state.speed,
      theme: state.theme,
      task: taskInputSettings.value,
      wins: state.wins,
      excluded: state.excluded,
      history: state.history,
      taskPresets: state.taskPresets,
      pinEnabled: state.pinEnabled,
      pinHash: state.pinHash,
      dailyResetEnabled: state.dailyResetEnabled,
      dailyResetTime: state.dailyResetTime,
      fairBagRound: state.fairBagRound,
      fairBagSpinInRound: state.fairBagSpinInRound,
      lastWinner: state.lastWinner
    }
  };
}

function exportFullBackup() {
  const json = JSON.stringify(buildBackupData(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fair-ads-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showSettingsToast('Backup downloaded.');
}

function importFullBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.names || !Array.isArray(data.names)) throw new Error('Invalid backup');
      const err = validateNames(data.names);
      if (err) throw new Error(err);
      names = data.names.map(n => String(n).trim()).slice(0, MAX_NAMES);
      const s = data.state || data;
      if (VALID_MODES.includes(s.mode)) state.mode = s.mode;
      if (s.speed) state.speed = s.speed;
      if (s.theme) state.theme = s.theme;
      if (typeof s.task === 'string') taskInputSettings.value = s.task;
      if (s.wins) state.wins = s.wins;
      if (s.excluded) state.excluded = s.excluded;
      if (Array.isArray(s.history)) state.history = s.history.slice(0, MAX_HISTORY);
      if (Array.isArray(s.taskPresets)) state.taskPresets = s.taskPresets;
      if (typeof s.pinEnabled === 'boolean') state.pinEnabled = s.pinEnabled;
      if (typeof s.pinHash === 'string') state.pinHash = s.pinHash;
      if (typeof s.dailyResetEnabled === 'boolean') state.dailyResetEnabled = s.dailyResetEnabled;
      if (s.dailyResetTime) state.dailyResetTime = s.dailyResetTime;
      if (typeof s.fairBagRound === 'number') state.fairBagRound = s.fairBagRound;
      if (typeof s.fairBagSpinInRound === 'number') state.fairBagSpinInRound = s.fairBagSpinInRound;
      if (s.lastWinner) state.lastWinner = s.lastWinner;
      initFairBag();
      syncSettingsToggles();
      syncModeSpeedUI();
      applyTheme(state.theme);
      renderSettingsList();
      renderPresets();
      renderWheel();
      renderTally();
      updateStatusBar();
      updateLastResultStrip();
      savePrefs();
      showSettingsToast('Backup restored!');
    } catch (e) {
      settingsError.textContent = 'Could not import backup — invalid file.';
    }
  };
  reader.readAsText(file);
}

function startTour() {
  tourStep = 0;
  document.getElementById('tourOverlay').classList.add('show');
  renderTourStep();
}

function renderTourStep() {
  const step = TOUR_STEPS[tourStep];
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourText').textContent = step.text;
  document.getElementById('tourDots').innerHTML = TOUR_STEPS.map((_, i) =>
    `<span class="tour-dot${i === tourStep ? ' active' : ''}"></span>`
  ).join('');
  document.getElementById('tourNext').textContent = tourStep >= TOUR_STEPS.length - 1 ? 'Done' : 'Next';
}

function endTour() {
  document.getElementById('tourOverlay').classList.remove('show');
  state.tourSeen = true;
  savePrefs();
}

function setupInstallBanner() {
  if (state.installBannerDismissed || window.matchMedia('(display-mode: standalone)').matches) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('installBanner').classList.add('show');
  });
}

function setupServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    swRegistration = reg;
    if (reg.waiting) document.getElementById('updateBanner').classList.add('show');
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          document.getElementById('updateBanner').classList.add('show');
        }
      });
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    document.getElementById('updateBanner').classList.remove('show');
  });
}

function applyNames(newNames) {
  names = newNames;
  const nextExcluded = {};
  names.forEach(n => { nextExcluded[n] = !!state.excluded[n]; });
  state.excluded = nextExcluded;
  initWins(true);
  initFairBag();
  syncFairBagDeckWithEligible();
  state.currentRotation = 0;
  wheelRotator.style.transition = 'none';
  wheelRotator.style.transform = 'rotate(0deg)';
  void wheelRotator.offsetHeight;
  wheelRotator.style.transition = '';
  renderWheel();
  renderTally();
  updateStatusBar();
  syncModeSpeedUI();
  saveToStorage();
}

function collectDraftNames() {
  return [...nameListEl.querySelectorAll('.name-row input')].map(inp => inp.value);
}

function collectDraftExcluded(nameList) {
  const map = {};
  nameList.forEach((name, idx) => {
    const wrap = nameListEl.children[idx];
    const cb = wrap?.querySelector('.exclude-cb');
    if (name.trim()) map[name.trim()] = !!(cb && cb.checked);
  });
  return map;
}

nameListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-remove');
  if (!btn || btn.disabled) return;
  settingsDraft = collectDraftNames();
  settingsDraftExcluded = collectDraftExcluded(settingsDraft);
  settingsDraft.splice(Number(btn.dataset.idx), 1);
  renderSettingsList();
  scheduleSettingsSave();
});

nameListEl.addEventListener('input', (e) => {
  if (e.target.matches('.name-row input') || e.target.matches('.exclude-cb')) scheduleSettingsSave();
});

document.getElementById('addNameBtn').addEventListener('click', () => {
  settingsDraft = collectDraftNames();
  settingsDraftExcluded = collectDraftExcluded(settingsDraft);
  if (settingsDraft.length >= MAX_NAMES) {
    settingsError.textContent = `Maximum ${MAX_NAMES} names.`;
    return;
  }
  settingsDraft.push('');
  settingsError.textContent = '';
  renderSettingsList();
  const inputs = nameListEl.querySelectorAll('.name-row input');
  inputs[inputs.length - 1].focus();
});

document.getElementById('clearExcludesBtn').addEventListener('click', () => {
  settingsDraft = collectDraftNames();
  settingsDraftExcluded = {};
  renderSettingsList();
  scheduleSettingsSave();
  showSettingsToast('All excludes cleared.');
});

document.getElementById('settingsSave').addEventListener('click', () => {
  if (persistSettingsDraft()) closeSettings();
});

document.getElementById('resetCountsBtn').addEventListener('click', resetSessionCounts);

document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsBack').addEventListener('click', () => closeSettings());
document.getElementById('historyBtn').addEventListener('click', openHistory);
document.getElementById('historyBack').addEventListener('click', closeHistory);
document.getElementById('helpBtn').addEventListener('click', openHelp);
document.getElementById('helpLinkModes').addEventListener('click', openHelp);
document.getElementById('modeWizardLink').addEventListener('click', openModeWizard);
document.getElementById('modeWizardBtn').addEventListener('click', openModeWizard);
document.getElementById('wizardClose').addEventListener('click', closeModeWizard);
document.getElementById('wizardOptions').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-wizard-idx]');
  if (btn) applyWizardChoice(Number(btn.dataset.wizardIdx));
});
document.getElementById('modeWizardModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modeWizardModal')) closeModeWizard();
});
document.getElementById('copyDaySummaryBtn').addEventListener('click', copyDaySummary);
document.getElementById('helpClose').addEventListener('click', closeHelp);
lockBtn.addEventListener('click', () => {
  if (state.pinEnabled && !state.pinUnlocked) openPinModal();
});

document.getElementById('themeButtons').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-theme]');
  if (!btn) return;
  applyTheme(btn.dataset.theme);
  savePrefs();
});

taskInputSettings.addEventListener('input', () => {
  updateStatusBar();
  savePrefs();
});

soundToggle.addEventListener('change', () => {
  state.soundEnabled = soundToggle.checked;
  syncSettingsToggles();
  savePrefs();
});

document.getElementById('soundVolume').addEventListener('input', (e) => {
  state.soundVolume = Number(e.target.value) / 100;
  document.getElementById('volumeLabel').textContent = `${e.target.value}%`;
  savePrefs();
});

document.getElementById('requireTaskToggle').addEventListener('change', () => {
  state.requireTaskBeforeSpin = document.getElementById('requireTaskToggle').checked;
  savePrefs();
});

document.getElementById('pinLockResetToggle').addEventListener('change', () => {
  state.pinLockResetCounts = document.getElementById('pinLockResetToggle').checked;
  savePrefs();
});

document.getElementById('recentTasks').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-recent-task]');
  if (!chip) return;
  taskInputSettings.value = chip.dataset.recentTask;
  updateStatusBar();
  savePrefs();
  showHomeToast(`Task: ${chip.dataset.recentTask}`);
});

confettiToggle.addEventListener('change', () => {
  state.confettiEnabled = confettiToggle.checked;
  savePrefs();
});

quickResultToggle.addEventListener('change', () => {
  state.quickResult = quickResultToggle.checked;
  savePrefs();
});

dailyResetToggle.addEventListener('change', () => {
  state.dailyResetEnabled = dailyResetToggle.checked;
  savePrefs();
  startDailyResetTimer();
});

dailyResetTime.addEventListener('change', () => {
  state.dailyResetTime = dailyResetTime.value || '09:00';
  savePrefs();
  startDailyResetTimer();
});

pinToggle.addEventListener('change', () => {
  if (pinToggle.checked && !state.pinHash) {
    settingsError.textContent = 'Save a 4-digit PIN first.';
    pinToggle.checked = false;
    return;
  }
  state.pinEnabled = pinToggle.checked;
  if (!state.pinEnabled) state.pinUnlocked = false;
  updateLockUI();
  savePrefs();
});

document.getElementById('resetPinBtn').addEventListener('click', () => {
  if (!confirm('Remove PIN lock and clear saved PIN on this browser?\n\nAnyone with access to Settings can do this — PIN is not recoverable from a server.')) return;
  state.pinHash = null;
  state.pinEnabled = false;
  state.pinUnlocked = false;
  pinToggle.checked = false;
  document.getElementById('pinInput').value = '';
  updateLockUI();
  savePrefs();
  settingsError.textContent = 'PIN lock removed. You can set a new PIN anytime.';
});

document.getElementById('savePinBtn').addEventListener('click', async () => {
  const pin = document.getElementById('pinInput').value.trim();
  if (!/^\d{4}$/.test(pin)) {
    settingsError.textContent = 'PIN must be exactly 4 digits.';
    return;
  }
  state.pinHash = await hashPin(pin);
  document.getElementById('pinInput').value = '';
  showSettingsToast('PIN saved securely.');
  savePrefs();
});

presetList.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove-preset]');
  if (removeBtn) {
    e.stopPropagation();
    state.taskPresets.splice(Number(removeBtn.dataset.removePreset), 1);
    renderPresets();
    savePrefs();
    return;
  }
  const chip = e.target.closest('[data-preset]');
  if (!chip) return;
  taskInputSettings.value = chip.dataset.preset;
  updateStatusBar();
  savePrefs();
});

document.getElementById('addPresetBtn').addEventListener('click', () => {
  const val = document.getElementById('newPresetInput').value.trim();
  if (!val) return;
  if (state.taskPresets.includes(val)) {
    settingsError.textContent = 'Preset already exists.';
    return;
  }
  state.taskPresets.push(val);
  document.getElementById('newPresetInput').value = '';
  renderPresets();
  savePrefs();
});

document.getElementById('copyTeamLinkBtn').addEventListener('click', copyTeamLink);
document.getElementById('exportHistoryBtn').addEventListener('click', exportHistoryCSV);
document.getElementById('exportHistoryBtn2').addEventListener('click', () => exportHistoryCSV(true));
document.getElementById('exportTallyBtn').addEventListener('click', exportTallyCSV);
document.getElementById('copySummaryBtn').addEventListener('click', copySummaryText);
document.getElementById('copyWeeklyReportBtn').addEventListener('click', copyWeeklyReport);
document.getElementById('exportBackupBtn').addEventListener('click', exportFullBackup);
document.getElementById('importBackupBtn').addEventListener('click', () => document.getElementById('importBackupInput').click());
document.getElementById('importBackupInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) importFullBackup(file);
  e.target.value = '';
});
document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
document.getElementById('showAllHistoryBtn').addEventListener('click', () => {
  historyShowAll = true;
  renderHistoryList();
});

historySearch.addEventListener('input', renderHistoryList);
historyFilterPerson.addEventListener('change', () => { historyShowAll = false; renderHistoryList(); });
historyFilterMode.addEventListener('change', () => { historyShowAll = false; renderHistoryList(); });
document.getElementById('historyFilterDate').addEventListener('change', () => { historyShowAll = false; renderHistoryList(); });
document.getElementById('historyFilterTask').addEventListener('change', () => { historyShowAll = false; renderHistoryList(); });

statusTask.addEventListener('click', () => {
  openSettings();
  setTimeout(() => taskInputSettings.focus(), 350);
});
statusTask.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); statusTask.click(); }
});

helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) closeHelp();
});

modeGroups.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-opt');
  if (!btn || state.isSpinning) return;
  const newMode = btn.dataset.mode;
  if (newMode === state.mode) return;
  if (state.pinEnabled && !state.pinUnlocked) {
    pendingPinAction = () => {
      state.mode = newMode;
      syncModeButtons();
      initFairBag();
      updateStatusBar();
      savePrefs();
      showSettingsToast(`Mode: ${MODE_LABELS[newMode]}`);
    };
    openPinModal();
    return;
  }
  state.mode = newMode;
  syncModeButtons();
  initFairBag();
  updateStatusBar();
  savePrefs();
  showSettingsToast(`Mode: ${MODE_LABELS[newMode]}`);
});

document.getElementById('speedButtons').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-speed]');
  if (!btn || state.isSpinning) return;
  const newSpeed = btn.dataset.speed;
  if (newSpeed === state.speed) return;
  if (state.pinEnabled && !state.pinUnlocked) {
    pendingPinAction = () => {
      state.speed = newSpeed;
      syncModeSpeedUI();
      updateStatusBar();
      savePrefs();
      showSettingsToast(`Speed: ${SPEED_LABELS[newSpeed]}`);
    };
    openPinModal();
    return;
  }
  state.speed = newSpeed;
  syncModeSpeedUI();
  updateStatusBar();
  savePrefs();
  showSettingsToast(`Speed: ${SPEED_LABELS[newSpeed]}`);
});

spinBtn.addEventListener('click', spin);
document.getElementById('modalCopy').addEventListener('click', copyResultText);
document.getElementById('modalCopySlack').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastSlackText); showHomeToast('Slack format copied!'); } catch (_) {}
});
document.getElementById('modalShare').addEventListener('click', shareResult);
document.getElementById('modalUndo').addEventListener('click', undoLastSpin);
document.getElementById('modalClose').addEventListener('click', hideResultModal);
document.getElementById('modalAgain').addEventListener('click', () => {
  hideResultModal();
  spin();
});

resultModal.addEventListener('click', (e) => {
  if (e.target === resultModal) hideResultModal();
});

pinModal.addEventListener('click', (e) => {
  if (e.target === pinModal) closePinModal();
});
document.getElementById('pinCancel').addEventListener('click', closePinModal);

document.getElementById('pinUnlockInput').addEventListener('input', (e) => {
  pinUnlockBuffer = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = pinUnlockBuffer;
  updatePinDots();
  if (pinUnlockBuffer.length === 4) tryPinUnlock(pinUnlockBuffer);
});

document.addEventListener('keydown', (e) => {
  if (pinModal.classList.contains('show') && /^\d$/.test(e.key)) {
    e.preventDefault();
    handlePinKey(e.key);
    return;
  }
  if (e.key === 'Escape') {
    hideResultModal();
    closePinModal();
    if (settingsPage.classList.contains('open')) closeSettings();
    if (historyPage.classList.contains('open')) closeHistory();
    closeHelp();
    closeModeWizard();
    return;
  }
  if (e.key === ' ' || e.code === 'Space') {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (settingsPage.classList.contains('open') || historyPage.classList.contains('open')) return;
    if (helpModal.classList.contains('show') || pinModal.classList.contains('show') ||
        document.getElementById('modeWizardModal').classList.contains('show')) return;
    e.preventDefault();
    if (resultModal.classList.contains('show')) {
      hideResultModal();
    }
    spin();
  }
});

document.getElementById('updateRefreshBtn').addEventListener('click', () => {
  if (swRegistration?.waiting) swRegistration.waiting.postMessage('skipWaiting');
  window.location.reload();
});
document.getElementById('installGoBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('installBanner').classList.remove('show');
});
document.getElementById('installDismissBtn').addEventListener('click', () => {
  state.installBannerDismissed = true;
  document.getElementById('installBanner').classList.remove('show');
  savePrefs();
});
document.getElementById('tourSkip').addEventListener('click', endTour);
document.getElementById('tourNext').addEventListener('click', () => {
  if (tourStep >= TOUR_STEPS.length - 1) endTour();
  else { tourStep++; renderTourStep(); }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'auto') applyTheme('auto');
});

setupServiceWorkerUpdates();
setupInstallBanner();

loadFromStorage();
applyUrlParams();
applyTheme(state.theme);
syncModeSpeedUI();
syncSettingsToggles();
updateLockUI();
initWins(true);
initFairBag();
Confetti.init();
renderWheel();
renderTally();
updateStatusBar();
updateLastResultStrip();
renderFairBagPanel();
renderRecentTasks();
startDailyResetTimer();
savePrefs();

if (!state.tourSeen) setTimeout(startTour, 800);

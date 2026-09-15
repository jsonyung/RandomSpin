import {
  STORAGE_KEY, APP_VERSION, VALID_MODES, MODE_LABELS, MODE_CATEGORIES, SPEED_LABELS,
  DEFAULT_NAMES, DEFAULT_PRESETS, MAX_NAMES, MIN_NAMES, MAX_HISTORY, HISTORY_DEFAULT_SHOW,
  SEG_COLORS, SPEED_CONFIG
} from './config.js';
import { state, TOUR_STEPS } from './state.js';
import { el } from './dom.js';

export const SpinAudio = {
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

export const Confetti = {
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

export async function hashPin(pin) {
  const s = String(pin);
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fairAdsSpinner:' + s));
    return 'sha256:' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'legacy:' + btoa(s);
}

export async function verifyPin(pin) {
  if (!state.pinHash) return false;
  const s = String(pin);
  if (state.pinHash.startsWith('legacy:')) return state.pinHash === 'legacy:' + btoa(s);
  const h = await hashPin(s);
  return h === state.pinHash;
}

export function showSettingsToast(msg, ms = 2800) {
  el.settingsError.textContent = msg;
  el.settingsError.classList.add('settings-toast');
  clearTimeout(showSettingsToast._t);
  showSettingsToast._t = setTimeout(() => {
    if (el.settingsError.textContent === msg) {
      el.settingsError.textContent = '';
      el.settingsError.classList.remove('settings-toast');
    }
  }, ms);
}

export function updateLockUI() {
  const showLock = state.pinEnabled && !state.pinUnlocked;
  el.lockBtn.style.display = showLock ? '' : 'none';
  el.headerSpacer.style.display = showLock ? 'none' : '';
  el.pinLockBanner?.classList.toggle('show', showLock);
  el.assignmentSection?.classList.toggle('pin-locked', showLock);
  el.animationSection?.classList.toggle('pin-locked', showLock);
}

export function requirePinUnlock(action) {
  if (!state.pinEnabled || state.pinUnlocked) {
    action();
    return;
  }
  state.pendingPinAction = action;
  openPinModal();
}

export function openPinModal() {
  state.pinUnlockBuffer = '';
  document.getElementById('pinError').textContent = '';
  updatePinDots();
  el.pinModal.classList.add('show');
  document.getElementById('pinUnlockInput').focus();
}

export function closePinModal() {
  el.pinModal.classList.remove('show');
  state.pinUnlockBuffer = '';
  updatePinDots();
  state.pendingPinAction = null;
}

export function updatePinDots() {
  document.querySelectorAll('#pinDots .pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < state.pinUnlockBuffer.length);
  });
}

export async function tryPinUnlock(digits) {
  if (await verifyPin(digits)) {
    state.pinUnlocked = true;
    updateLockUI();
    closePinModal();
    if (state.pendingPinAction) {
      const fn = state.pendingPinAction;
      state.pendingPinAction = null;
      fn();
    }
    if (el.settingsPage.classList.contains('open')) {
      showSettingsToast('Unlocked — you can change mode & speed this session.');
    } else {
      showHomeToast('Unlocked for this session.');
    }
  } else {
    document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
    state.pinUnlockBuffer = '';
    updatePinDots();
  }
}

export function handlePinKey(digit) {
  if (state.pinUnlockBuffer.length >= 4) return;
  state.pinUnlockBuffer += digit;
  updatePinDots();
  if (state.pinUnlockBuffer.length === 4) tryPinUnlock(state.pinUnlockBuffer);
}

export function resolveTheme(theme) {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  state.theme = theme;
  document.body.setAttribute('data-theme', resolveTheme(theme));
  document.querySelectorAll('#themeButtons button').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  renderWheel();
}

export function showHomeToast(msg, ms = 2600) {
  el.homeToast.textContent = msg;
  el.homeToast.classList.add('show');
  clearTimeout(showHomeToast._t);
  showHomeToast._t = setTimeout(() => el.homeToast.classList.remove('show'), ms);
}

export function getSpinConfig() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return { duration: 0.01, extraTurns: 0 };
  return SPEED_CONFIG[state.speed];
}

export function lastWinTimestamp(name) {
  for (const e of state.history) {
    if (e.winner === name) return e.timestamp;
  }
  return 0;
}

export function syncFairBagDeckWithEligible() {
  const eligible = new Set(getEligibleNames());
  state.fairBagDeck = state.fairBagDeck.filter(n => eligible.has(n));
  if (state.fairBagDeck.length === 0 && eligible.size > 0) refillFairBagDeck();
}

export function updateLastResultStrip() {
  if (!state.history.length) {
    el.lastResultStrip.innerHTML = '';
    return;
  }
  const e = state.history[0];
  const task = e.task || 'this lead';
  const when = formatRelativeTime(e.timestamp);
  el.lastResultStrip.innerHTML = `Last: <strong>${escapeHtml(e.winner)}</strong> · ${escapeHtml(task)} · ${when}` +
    (state.undoSnapshot ? ` <button type="button" id="undoFromStrip">Undo</button>` : '');
  const undoBtn = document.getElementById('undoFromStrip');
  if (undoBtn) undoBtn.addEventListener('click', undoLastSpin);
}

export function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function announceWinner(winner, task) {
  const label = task.trim() || 'this lead';
  document.getElementById('ariaLive').textContent = `${winner} chosen for ${label}`;
}

export function getRecentTasks() {
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

export function renderRecentTasks() {
  const recent = getRecentTasks();
  if (!recent.length) { el.recentTasks.innerHTML = ''; return; }
  el.recentTasks.innerHTML = recent.map(t =>
    `<button type="button" class="recent-task-chip" data-recent-task="${escapeHtml(t)}">${escapeHtml(t)}</button>`
  ).join('');
}

export function renderFairBagPanel() {
  if (state.mode !== 'fairBag') {
    el.fairBagPanel.style.display = 'none';
    return;
  }
  const remaining = state.fairBagDeck.filter(n => getEligibleNames().includes(n));
  if (!remaining.length) {
    el.fairBagPanel.style.display = 'none';
    return;
  }
  el.fairBagPanel.style.display = 'flex';
  const next = remaining[0];
  el.fairBagPanel.innerHTML = `<span class="fairbag-label">Still this round · next up: ${escapeHtml(next)}</span>` +
    remaining.map(n =>
      `<span class="remaining-chip${n === next ? ' next' : ''}">${escapeHtml(n)}</span>`
    ).join('');
}

export function getTodayHistory() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return state.history.filter(e => e.timestamp >= start.getTime());
}

export function buildDaySummary() {
  const today = getTodayHistory();
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const lines = [`📊 Fair Ads Spinner — ${dateStr}`, ''];
  lines.push(`Mode: ${MODE_LABELS[state.mode]} · Team: ${state.names.join(', ')}`);
  lines.push('', 'Today\'s tally:');
  const counts = {};
  today.forEach(e => { counts[e.winner] = (counts[e.winner] || 0) + 1; });
  state.names.forEach(n => lines.push(`  ${n}: ${counts[n] || 0} lead${counts[n] === 1 ? '' : 's'}`));
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

export function buildWeeklyReport() {
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
  state.names.forEach(n => lines.push(`  ${n}: ${counts[n] || 0}`));
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

export async function copyDaySummary() {
  try {
    await navigator.clipboard.writeText(buildDaySummary());
    showHomeToast('Today\'s summary copied!');
  } catch (_) { showHomeToast('Could not copy.'); }
}

export async function copyWeeklyReport() {
  try {
    await navigator.clipboard.writeText(buildWeeklyReport());
    showSettingsToast('Weekly report copied!');
  } catch (_) { el.settingsError.textContent = 'Could not copy report.'; }
}

export async function shareResult() {
  const text = state.lastResultText;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Lead assignment', text });
      return;
    } catch (_) { /* fall through */ }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(wa, '_blank', 'noopener');
}

export const WIZARD_OPTIONS = [
  { label: '⚖️ Equal ads for everyone', sub: 'Shuffled deck — Fair Bag', mode: 'fairBag' },
  { label: '🎲 Pure luck — coin flip', sub: 'No balance rules — Pure Random', mode: 'pureRandom' },
  { label: '📈 Catch-up for whoever is behind', sub: 'Weighted mode', mode: 'weighted' },
  { label: '🚫 No back-to-back wins', sub: 'Anti-Repeat', mode: 'antiRepeat' },
  { label: '⚙️ Browse all modes in Settings', sub: '', action: 'settings' }
];

export function openModeWizard() {
  if (state.isSpinning) return;
  el.wizardOptions.innerHTML = WIZARD_OPTIONS.map((o, i) =>
    `<button type="button" class="wizard-opt" data-wizard-idx="${i}">${o.label}${o.sub ? `<br><span style="font-weight:400;font-size:0.78rem;color:var(--muted)">${o.sub}</span>` : ''}</button>`
  ).join('');
  el.modeWizardModal.classList.add('show');
}

export function closeModeWizard() {
  el.modeWizardModal.classList.remove('show');
}

export function applyWizardChoice(idx) {
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
    state.pendingPinAction = apply;
    openPinModal();
    return;
  }
  apply();
}

export function openHelp() {
  if (state.isSpinning) return;
  el.helpModal.classList.add('show');
}

export function closeHelp() {
  el.helpModal.classList.remove('show');
}

export function modeHintText() {
  const n = getEligibleNames().length || state.names.length;
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

export function updateModeHint() {
  el.modeHint.innerHTML = `<strong>${MODE_CATEGORIES[state.mode]}</strong> — ${modeHintText()}`;
}

export function syncModeButtons() {
  document.querySelectorAll('.mode-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
  updateModeHint();
}

export function initWins(keepExisting = false) {
  const next = {};
  state.names.forEach(n => {
    next[n] = keepExisting && state.wins[n] != null ? state.wins[n] : 0;
  });
  state.wins = next;
}

export function getEligibleNames() {
  return state.names.filter(n => !state.excluded[n]);
}

export function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      names: [...state.names],
      theme: state.theme,
      soundEnabled: state.soundEnabled,
      confettiEnabled: state.confettiEnabled,
      quickResult: state.quickResult,
      mode: state.mode,
      speed: state.speed,
      task: el.taskInputSettings.value,
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

export function saveToStorage() {
  savePrefs();
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
      || localStorage.getItem('fairAdsSpinner_v4')
      || localStorage.getItem('fairAdsSpinner_v3')
      || localStorage.getItem('fairAdsSpinner_v2')
      || localStorage.getItem('fairAdsSpinner_v1');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.names) && data.names.length >= MIN_NAMES) {
      state.names = data.names.map(n => String(n).trim()).filter(Boolean).slice(0, MAX_NAMES);
    }
    if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'auto') state.theme = data.theme;
    if (typeof data.soundEnabled === 'boolean') state.soundEnabled = data.soundEnabled;
    if (typeof data.confettiEnabled === 'boolean') state.confettiEnabled = data.confettiEnabled;
    if (typeof data.quickResult === 'boolean') state.quickResult = data.quickResult;
    if (VALID_MODES.includes(data.mode)) state.mode = data.mode;
    if (data.speed === 'quick' || data.speed === 'normal' || data.speed === 'dramatic') state.speed = data.speed;
    if (typeof data.task === 'string') el.taskInputSettings.value = data.task;
    if (data.wins && typeof data.wins === 'object') state.wins = data.wins;
    if (data.excluded && typeof data.excluded === 'object') state.excluded = data.excluded;
    if (Array.isArray(data.history)) state.history = data.history.slice(0, MAX_HISTORY);
    if (Array.isArray(data.taskPresets) && data.taskPresets.length) state.taskPresets = data.taskPresets;
    if (typeof data.pinEnabled === 'boolean') state.pinEnabled = data.pinEnabled;
    if (typeof data.pinHash === 'string') state.pinHash = data.pinHash;
    if (typeof data.dailyResetEnabled === 'boolean') state.dailyResetEnabled = data.dailyResetEnabled;
    if (typeof data.dailyResetTime === 'string') state.dailyResetTime = data.dailyResetTime;
    else if (typeof data['el.dailyResetTime'] === 'string') state.dailyResetTime = data['el.dailyResetTime'];
    if (data.lastDailyReset) state.lastDailyReset = data.lastDailyReset;
    if (typeof data.fairBagRound === 'number') state.fairBagRound = data.fairBagRound;
    if (typeof data.fairBagSpinInRound === 'number') state.fairBagSpinInRound = data.fairBagSpinInRound;
    if (typeof data.lastWinner === 'string') state.lastWinner = data.lastWinner;
    if (typeof data.tourSeen === 'boolean') state.tourSeen = data.tourSeen;
    if (typeof data.installBannerDismissed === 'boolean') state.installBannerDismissed = data.installBannerDismissed;
    if (typeof data.soundVolume === 'number') state.soundVolume = Math.min(1, Math.max(0, data.soundVolume));
    else if (typeof data['el.soundVolume'] === 'number') state.soundVolume = Math.min(1, Math.max(0, data['el.soundVolume']));
    if (typeof data.requireTaskBeforeSpin === 'boolean') state.requireTaskBeforeSpin = data.requireTaskBeforeSpin;
    if (typeof data.pinLockResetCounts === 'boolean') state.pinLockResetCounts = data.pinLockResetCounts;
  } catch (_) { /* ignore */ }
  if (state.names.length < MIN_NAMES) state.names = [...DEFAULT_NAMES];
  if (!state.taskPresets.length) state.taskPresets = [...DEFAULT_PRESETS];
}

export function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('names')) {
    const parsed = params.get('names').split(',').map(s => s.trim()).filter(Boolean);
    if (parsed.length >= MIN_NAMES) state.names = parsed.slice(0, MAX_NAMES);
  }
  const mode = params.get('mode');
  if (mode && VALID_MODES.includes(mode)) state.mode = mode;
  const speed = params.get('speed');
  if (speed === 'quick' || speed === 'normal' || speed === 'dramatic') state.speed = speed;
  const task = params.get('task');
  if (task) el.taskInputSettings.value = task;
}

export function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initFairBag() {
  state.fairBagDeck = fisherYates(getEligibleNames());
  if (state.fairBagDeck.length === 0) state.fairBagDeck = fisherYates(state.names);
  state.fairBagRound = 1;
  state.fairBagSpinInRound = 0;
}

export function refillFairBagDeck() {
  state.fairBagDeck = fisherYates(getEligibleNames());
  if (state.fairBagDeck.length === 0) state.fairBagDeck = fisherYates(state.names);
  state.fairBagSpinInRound = 0;
  state.fairBagRound++;
}

export function pickFairBag() {
  if (state.fairBagDeck.length === 0) refillFairBagDeck();
  state.fairBagSpinInRound++;
  return state.fairBagDeck.shift();
}

export function pickFromPool(pool) {
  if (!pool.length) pool = [...state.names];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickPureRandom() {
  const pool = getEligibleNames();
  return pickFromPool(pool.length ? pool : state.names);
}

export function pickWeighted() {
  const pool = getEligibleNames().length ? getEligibleNames() : state.names;
  const weights = pool.map(n => 1 / (state.wins[n] + 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function pickAntiRepeat() {
  let pool = getEligibleNames().length ? getEligibleNames() : [...state.names];
  if (state.lastWinner && pool.length > 1) {
    pool = pool.filter(n => n !== state.lastWinner);
    if (!pool.length) pool = getEligibleNames().length ? getEligibleNames() : [...state.names];
  }
  return pickFromPool(pool);
}

export function pickLastExcluded() {
  let pool = getEligibleNames().length ? getEligibleNames() : [...state.names];
  if (state.lastWinner && pool.length > 1) {
    pool = pool.filter(n => n !== state.lastWinner);
    if (!pool.length) pool = state.names.filter(n => n !== state.lastWinner);
  }
  return pickFromPool(pool.length ? pool : state.names);
}

export function pickLowestFirst() {
  const pool = getEligibleNames().length ? getEligibleNames() : state.names;
  const minWins = Math.min(...pool.map(n => state.wins[n] ?? 0));
  const tied = pool.filter(n => (state.wins[n] ?? 0) === minWins);
  return pickFromPool(tied);
}

export function pickStrictBalance() {
  const pool = getEligibleNames().length ? getEligibleNames() : state.names;
  const minWins = Math.min(...pool.map(n => state.wins[n] ?? 0));
  const tied = pool.filter(n => (state.wins[n] ?? 0) === minWins);
  const oldest = Math.min(...tied.map(n => lastWinTimestamp(n)));
  const drought = tied.filter(n => lastWinTimestamp(n) === oldest);
  return pickFromPool(drought);
}

export function pickWinner() {
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

export function addHistoryEntry(winner, task, id) {
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

export function segmentSize() {
  return 360 / state.names.length;
}

export function landingAngleForIndex(index) {
  const seg = segmentSize();
  return 360 - index * seg - seg / 2;
}

export function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export function fitFontSize(name, segDeg) {
  const len = name.length;
  if (segDeg >= 60) return len > 8 ? 11 : len > 5 ? 13 : 15;
  if (segDeg >= 45) return len > 8 ? 9 : len > 5 ? 11 : 13;
  return len > 6 ? 8 : 10;
}

export function nameColor(name) {
  const idx = state.names.indexOf(name);
  return SEG_COLORS[(idx >= 0 ? idx : 0) % SEG_COLORS.length];
}

export function renderWheel() {
  const n = state.names.length;
  const seg = 360 / n;
  const cx = 100, cy = 100, outerR = 96, innerR = 38;
  let svg = '';

  svg += `<circle cx="${cx}" cy="${cy}" r="${outerR + 2}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>`;

  for (let i = 0; i < n; i++) {
    const start = i * seg;
    const end = (i + 1) * seg;
    const excluded = !!state.excluded[state.names[i]];
    const color = excluded ? '#64748b' : SEG_COLORS[i % SEG_COLORS.length];
    const opacity = excluded ? ' opacity="0.45"' : '';
    svg += `<path d="${describeArc(cx, cy, outerR, start, end)}" fill="${color}"${opacity} stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>`;
  }

  for (let t = 0; t < 48; t++) {
    const a = t * 7.5;
    const inner = polarToCartesian(cx, cy, outerR - 5, a);
    const outer = polarToCartesian(cx, cy, outerR - 0.5, a);
    svg += `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="rgba(255,255,255,0.22)" stroke-width="0.8"/>`;
  }

  const centerColor = getComputedStyle(document.body).getPropertyValue('--wheel-center').trim() || '#120f1a';
  svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${centerColor}" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>`;

  for (let i = 0; i < n; i++) {
    const mid = (i + 0.5) * seg;
    const pos = polarToCartesian(cx, cy, 66, mid);
    const fs = fitFontSize(state.names[i], seg);
    let rot = mid;
    if (mid > 90 && mid < 270) rot += 180;
    svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" stroke="rgba(0,0,0,0.35)" stroke-width="2" paint-order="stroke" transform="rotate(${rot}, ${pos.x}, ${pos.y})">${escapeHtml(state.names[i])}</text>`;
  }

  el.wheelSvg.innerHTML = svg;
}

export function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderTally() {
  el.tallyEl.style.gridTemplateColumns = `repeat(${Math.min(state.names.length, 4)}, 1fr)`;
  const maxWins = Math.max(0, ...state.names.map((name) => state.wins[name] || 0));
  el.tallyEl.innerHTML = state.names.map((name, i) => {
    const color = SEG_COLORS[i % SEG_COLORS.length];
    const count = state.wins[name] || 0;
    const leader = maxWins > 0 && count === maxWins;
    return `
    <div class="tally-item${leader ? ' leader' : ''}">
      <div class="tally-avatar" style="background:${color}">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div class="tally-name">${escapeHtml(name)}</div>
      <div class="tally-count" style="color:${color}">${count}</div>
      <div class="tally-crown" style="color:${color}">👑</div>
    </div>`;
  }).join('');
}

export function syncModeSpeedUI() {
  syncModeButtons();
  document.querySelectorAll('#speedButtons button').forEach(b => {
    b.classList.toggle('active', b.dataset.speed === state.speed);
  });
}

const MODE_ICONS = {
  fairBag: '🛍',
  pureRandom: '🎲',
  weighted: '⚖',
  antiRepeat: '🔁',
  lastExcluded: '⏭',
  lowestFirst: '📉',
  strictBalance: '⚖'
};

export function updateStatusBar() {
  const locked = state.pinEnabled && !state.pinUnlocked;
  const modeLabel = MODE_LABELS[state.mode] || state.mode;
  const modeIcon = MODE_ICONS[state.mode] || '🎯';
  if (locked) {
    el.statusMode.textContent = `🔒 ${modeLabel}`;
  } else {
    el.statusMode.innerHTML = `<span class="pill-icon" aria-hidden="true">${modeIcon}</span>${modeLabel}<span class="pill-dot green" aria-hidden="true"></span>`;
  }
  el.statusSpeed.textContent = locked ? `🔒 ${SPEED_LABELS[state.speed]}` : SPEED_LABELS[state.speed];
  el.statusMode.classList.toggle('locked', locked);
  el.statusSpeed.classList.toggle('locked', locked);
  const task = el.taskInputSettings.value.trim();
  if (task) {
    el.statusTask.innerHTML = `<span class="pill-icon" aria-hidden="true">📋</span>${escapeHtml(task)}<span class="pill-dot purple" aria-hidden="true"></span>`;
    el.statusTask.title = task;
    el.statusTask.style.display = '';
  } else {
    el.statusTask.style.display = 'none';
  }
  if (state.mode === 'fairBag') {
    const eligible = getEligibleNames().length || state.names.length;
    const spin = state.fairBagSpinInRound === 0 ? 1 : state.fairBagSpinInRound;
    el.wheelRoundBadge.innerHTML = `<span aria-hidden="true">↻</span> Round ${state.fairBagRound} · ${spin}/${eligible}`;
    el.wheelRoundBadge.style.display = '';
    el.statusRound.style.display = 'none';
  } else {
    el.wheelRoundBadge.style.display = 'none';
    el.statusRound.style.display = 'none';
  }
  renderFairBagPanel();
  renderRecentTasks();
}

export function setControlsDisabled(disabled) {
  el.spinBtn.disabled = disabled;
  document.getElementById('settingsBtn').disabled = disabled;
  document.getElementById('helpBtn').disabled = disabled;
  document.getElementById('historyBtn').disabled = disabled;
  document.querySelectorAll('#speedButtons button').forEach(btn => {
    btn.disabled = disabled;
  });
  document.querySelectorAll('.mode-opt').forEach(btn => { btn.disabled = disabled; });
}

export function showResultModal(winner, task) {
  const taskLabel = task.trim() || 'this lead';
  state.lastResultText = `${winner} has been chosen for ${taskLabel}!`;
  state.lastSlackText = `@${winner} — ${taskLabel} (via Fair Ads Spinner)`;
  const color = nameColor(winner);
  el.modalWinner.textContent = winner;
  el.modalWinnerAvatar.textContent = winner.charAt(0).toUpperCase();
  el.modalWinnerAvatar.style.background = color;
  el.modalTask.textContent = taskLabel;
  el.modalMessage.textContent = `${winner} has been chosen for ${taskLabel}`;
  document.getElementById('modalMeta').innerHTML = `<span aria-hidden="true">ℹ</span> ${MODE_LABELS[state.mode]} · ${SPEED_LABELS[state.speed]} · New spin available immediately`;
  document.getElementById('modalUndo').style.display = state.undoSnapshot ? '' : 'none';
  el.resultModal.classList.add('show');
  announceWinner(winner, task);
  Confetti.burst();
  if (state.quickResult) {
    setTimeout(() => {
      if (el.resultModal.classList.contains('show')) hideResultModal();
    }, 2000);
  }
}

export function hideResultModal() {
  el.resultModal.classList.remove('show');
}

export function spin() {
  if (state.isSpinning || state.names.length < MIN_NAMES) return;
  const eligible = getEligibleNames();
  if (!eligible.length) {
    showHomeToast('Everyone is excluded — uncheck Exclude in Settings.');
    return;
  }
  if (state.requireTaskBeforeSpin && !el.taskInputSettings.value.trim()) {
    showHomeToast('Set a task first — tap task pill or ⚙ Settings.');
    return;
  }

  state.undoSnapshot = null;
  const preSpin = {
    wins: JSON.parse(JSON.stringify(state.wins)),
    lastWinner: state.lastWinner,
    fairBagDeck: [...state.fairBagDeck],
    fairBagRound: state.fairBagRound,
    fairBagSpinInRound: state.fairBagSpinInRound,
    historyLen: state.history.length
  };

  const winner = pickWinner();
  const winnerIndex = state.names.indexOf(winner);
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

  el.wheelRotator.style.transition = `transform ${duration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
  el.wheelRotator.style.transform = `rotate(${targetRotation}deg)`;
  state.currentRotation = targetRotation;

  const onEnd = (e) => {
    if (e.propertyName !== 'transform') return;
    el.wheelRotator.removeEventListener('transitionend', onEnd);

    SpinAudio.stopSpin();
    SpinAudio.playWin();

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    state.undoSnapshot = { winner, entryId, ...preSpin };

    state.wins[winner]++;
    state.lastWinner = winner;
    addHistoryEntry(winner, el.taskInputSettings.value, entryId);
    renderTally();
    updateStatusBar();
    updateLastResultStrip();
    showResultModal(winner, el.taskInputSettings.value);

    state.isSpinning = false;
    setControlsDisabled(false);
  };

  el.wheelRotator.addEventListener('transitionend', onEnd);
}

export function renderSettingsList() {
  el.nameListEl.innerHTML = '';
  state.settingsDraft.forEach((name, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'name-row-wrap';
    const excluded = !!state.settingsDraftExcluded[name];
    wrap.innerHTML = `
      <div class="name-row">
        <input type="text" value="${escapeHtml(name)}" data-idx="${idx}" maxlength="24" aria-label="Person name">
        <button type="button" class="btn-remove" data-idx="${idx}" title="Remove" ${state.settingsDraft.length <= MIN_NAMES ? 'disabled' : ''}>×</button>
      </div>
      <label class="exclude-label">
        <input type="checkbox" class="exclude-cb" data-name="${escapeHtml(name)}" ${excluded ? 'checked' : ''}>
        Exclude from next spins
      </label>
    `;
    el.nameListEl.appendChild(wrap);
  });
}

export function renderPresets() {
  el.presetList.innerHTML = state.taskPresets.map((p, i) => `
    <span class="preset-chip-wrap">
      <button type="button" class="preset-chip" data-preset="${escapeHtml(p)}" title="Tap to set task">${escapeHtml(p)}</button>
      <button type="button" class="preset-chip-remove" data-remove-preset="${i}" title="Remove preset" aria-label="Remove ${escapeHtml(p)}">×</button>
    </span>
  `).join('');
}

export function syncSettingsToggles() {
  el.soundToggle.checked = state.soundEnabled;
  el.confettiToggle.checked = state.confettiEnabled;
  el.quickResultToggle.checked = state.quickResult;
  el.pinToggle.checked = state.pinEnabled;
  el.pinLockResetToggle.checked = state.pinLockResetCounts;
  el.requireTaskToggle.checked = state.requireTaskBeforeSpin;
  el.dailyResetToggle.checked = state.dailyResetEnabled;
  el.dailyResetTime.value = state.dailyResetTime || '09:00';
  const vol = Math.round((state.soundVolume ?? 0.8) * 100);
  el.soundVolume.value = vol;
  el.volumeLabel.textContent = `${vol}%`;
  el.volumeRow.style.opacity = state.soundEnabled ? '1' : '0.45';
}

export function getFilteredHistory() {
  const q = el.historySearch.value.trim().toLowerCase();
  const person = el.historyFilterPerson.value;
  const mode = el.historyFilterMode.value;
  const dateFilter = el.historyFilterDate?.value || '';
  const taskFilter = el.historyFilterTask?.value || '';
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

export function renderHistoryStats() {
  const filtered = getFilteredHistory();
  const total = filtered.length;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const today = filtered.filter(e => e.timestamp >= todayStart.getTime()).length;
  const byPerson = {};
  filtered.forEach(e => { byPerson[e.winner] = (byPerson[e.winner] || 0) + 1; });
  const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0];
  el.historyStats.innerHTML = `
    <div class="history-stat"><div class="val">${total}</div><div class="lbl">Spins</div></div>
    <div class="history-stat"><div class="val">${today}</div><div class="lbl">Today</div></div>
    <div class="history-stat"><div class="val">${top ? top[1] : 0}</div><div class="lbl">${top ? escapeHtml(top[0]) : 'Top'}</div></div>
  `;
}

export function undoLastSpin() {
  if (!state.undoSnapshot || state.isSpinning) return;
  const snap = state.undoSnapshot;
  state.history = state.history.filter(e => e.id !== snap.entryId);
  state.wins = snap.wins;
  state.lastWinner = snap.lastWinner;
  state.fairBagDeck = [...snap.fairBagDeck];
  state.fairBagRound = snap.fairBagRound;
  state.fairBagSpinInRound = snap.fairBagSpinInRound;
  state.undoSnapshot = null;
  savePrefs();
  renderTally();
  renderWheel();
  updateStatusBar();
  updateLastResultStrip();
  hideResultModal();
  showHomeToast('Last spin undone.');
}

export function renderHistoryChart() {
  const filtered = getFilteredHistory();
  const counts = {};
  filtered.forEach(e => { counts[e.winner] = (counts[e.winner] || 0) + 1; });
  const entries = state.names.map(n => [n, counts[n] || 0]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  if (!filtered.length) { el.historyChart.innerHTML = ''; return; }
  el.historyChart.innerHTML = entries.map(([name, count]) => `
    <div class="chart-bar-row">
      <span class="chart-bar-label">${escapeHtml(name)}</span>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round(count / max * 100)}%"></div></div>
      <span class="chart-bar-val">${count}</span>
    </div>
  `).join('');
}

export function renderHistoryFilters() {
  const people = [...new Set(state.history.map(h => h.winner))].sort();
  el.historyFilterPerson.innerHTML = '<option value="">All people</option>' +
    people.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  el.historyFilterMode.innerHTML = '<option value="">All modes</option>' +
    VALID_MODES.map(m => `<option value="${m}">${escapeHtml(MODE_LABELS[m])}</option>`).join('');
  const tasks = [...new Set(state.history.map(h => h.task || '').filter(Boolean))].sort();
  el.historyFilterTask.innerHTML = '<option value="">All tasks</option>' +
    tasks.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

export function renderHistoryList() {
  renderHistoryStats();
  renderHistoryChart();
  const filtered = getFilteredHistory();
  const limit = state.historyShowAll ? filtered.length : HISTORY_DEFAULT_SHOW;
  const shown = filtered.slice(0, limit);
  const showAllBtn = el.showAllHistoryBtn;

  if (!filtered.length) {
    el.historyList.innerHTML = '<p class="history-empty">No spins recorded yet.</p>';
    showAllBtn.style.display = 'none';
    return;
  }

  el.historyList.innerHTML = shown.map(entry => {
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

  if (filtered.length > HISTORY_DEFAULT_SHOW && !state.historyShowAll) {
    showAllBtn.style.display = '';
    showAllBtn.textContent = `Show all (${filtered.length})`;
  } else {
    showAllBtn.style.display = 'none';
  }
}

export function openHistory() {
  if (state.isSpinning) return;
  state.historyShowAll = false;
  el.historySearch.value = '';
  el.historyFilterDate.value = '';
  el.historyFilterTask.value = '';
  el.historyFilterPerson.value = '';
  el.historyFilterMode.value = '';
  renderHistoryFilters();
  renderHistoryList();
  el.historyPage.classList.add('open');
  el.historyPage.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeHistory() {
  el.historyPage.classList.remove('open');
  el.historyPage.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

export function clearHistory() {
  if (!state.history.length) return;
  if (!confirm('Clear all spin history? This cannot be undone.')) return;
  state.history = [];
  savePrefs();
  renderHistoryList();
}

export function downloadCSV(filename, rows) {
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

export function exportHistoryCSV(useFilter = false) {
  const entries = useFilter ? getFilteredHistory() : state.history;
  const rows = [['ID', 'Winner', 'Task', 'Mode', 'Speed', 'Timestamp']];
  entries.forEach(e => {
    rows.push([e.id, e.winner, e.task, MODE_LABELS[e.mode] || e.mode, SPEED_LABELS[e.speed] || e.speed, new Date(e.timestamp).toISOString()]);
  });
  const suffix = useFilter ? '-filtered' : '';
  downloadCSV(`fair-ads-history${suffix}.csv`, rows);
}

export function exportTallyCSV() {
  const rows = [['Name', 'Wins', 'Excluded']];
  state.names.forEach(n => rows.push([n, state.wins[n] ?? 0, state.excluded[n] ? 'Yes' : 'No']));
  downloadCSV('fair-ads-tally.csv', rows);
}

export function buildSummaryText() {
  const lines = ['Fair Ads Spinner — Session Summary', ''];
  lines.push(`Mode: ${MODE_LABELS[state.mode]} · Speed: ${SPEED_LABELS[state.speed]}`);
  const task = el.taskInputSettings.value.trim();
  if (task) lines.push(`Current task: ${task}`);
  lines.push('', 'Tally:');
  state.names.forEach(n => lines.push(`  ${n}: ${state.wins[n] ?? 0}${state.excluded[n] ? ' (excluded)' : ''}`));
  if (state.history.length) {
    lines.push('', `Recent spins (${Math.min(5, state.history.length)}):`);
    state.history.slice(0, 5).forEach(e => {
      lines.push(`  ${e.winner} — ${e.task || 'this lead'} (${new Date(e.timestamp).toLocaleString()})`);
    });
  }
  return lines.join('\n');
}

export async function copySummaryText() {
  try {
    await navigator.clipboard.writeText(buildSummaryText());
    el.settingsError.textContent = 'Summary copied to clipboard.';
    setTimeout(() => { if (el.settingsError.textContent === 'Summary copied to clipboard.') el.settingsError.textContent = ''; }, 2000);
  } catch (_) {
    el.settingsError.textContent = 'Could not copy summary.';
  }
}

export async function copyResultText() {
  try {
    await navigator.clipboard.writeText(state.lastResultText);
  } catch (_) { /* ignore */ }
}

export function buildTeamLink() {
  const base = window.location.href.split('?')[0];
  const params = new URLSearchParams();
  params.set('names', state.names.join(','));
  params.set('mode', state.mode);
  params.set('speed', state.speed);
  const task = el.taskInputSettings.value.trim();
  if (task) params.set('task', task);
  return `${base}?${params.toString()}`;
}

export async function copyTeamLink() {
  try {
    await navigator.clipboard.writeText(buildTeamLink());
    el.settingsError.textContent = 'Team link copied! Send it to your teammates.';
    setTimeout(() => {
      if (el.settingsError.textContent.startsWith('Team link copied')) el.settingsError.textContent = '';
    }, 2500);
  } catch (_) {
    el.settingsError.textContent = 'Could not copy link.';
  }
}

export function doResetSessionCounts() {
  if (!confirm('Reset all session win counts to zero? History is kept.')) return;
  state.names.forEach(n => { state.wins[n] = 0; });
  state.undoSnapshot = null;
  initFairBag();
  renderTally();
  updateStatusBar();
  updateLastResultStrip();
  renderFairBagPanel();
  savePrefs();
  showSettingsToast('Session counts reset.');
}

export function resetSessionCounts() {
  if (state.pinEnabled && state.pinLockResetCounts && !state.pinUnlocked) {
    state.pendingPinAction = doResetSessionCounts;
    openPinModal();
    return;
  }
  doResetSessionCounts();
}

export function checkDailyReset() {
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

export function startDailyResetTimer() {
  if (state.dailyResetTimer) clearInterval(state.dailyResetTimer);
  checkDailyReset();
  state.dailyResetTimer = setInterval(checkDailyReset, 60000);
}

export function openSettings() {
  if (state.isSpinning) return;
  state.settingsDraft = [...state.names];
  state.settingsDraftExcluded = { ...state.excluded };
  el.settingsError.textContent = '';
  syncSettingsToggles();
  syncModeSpeedUI();
  applyTheme(state.theme);
  renderSettingsList();
  renderPresets();
  el.settingsPage.classList.add('open');
  el.settingsPage.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeSettings() {
  persistSettingsDraft();
  el.settingsPage.classList.remove('open');
  el.settingsPage.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  el.settingsError.textContent = '';
  state.settingsDraft = [...state.names];
}

export function validateNames(list) {
  const trimmed = list.map(n => n.trim()).filter(Boolean);
  if (trimmed.length < MIN_NAMES) return 'Need at least 2 names.';
  if (trimmed.length > MAX_NAMES) return `Maximum ${MAX_NAMES} names.`;
  const lower = trimmed.map(n => n.toLowerCase());
  if (new Set(lower).size !== lower.length) return 'Names must be unique.';
  return null;
}

export function persistSettingsDraft() {
  const draft = collectDraftNames();
  const err = validateNames(draft);
  if (err) {
    el.settingsError.textContent = err;
    el.settingsError.classList.remove('settings-toast');
    return false;
  }
  el.settingsError.textContent = '';
  const trimmed = draft.map(n => n.trim());
  const newExcluded = collectDraftExcluded(trimmed);
  const namesChanged = trimmed.length !== state.names.length ||
    trimmed.some((n, i) => n !== state.names[i]);
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
  state.settingsDraft = [...state.names];
  state.settingsDraftExcluded = { ...state.excluded };
  return true;
}

export function scheduleSettingsSave() {
  clearTimeout(state.settingsSaveTimer);
  state.settingsSaveTimer = setTimeout(() => {
    if (persistSettingsDraft()) showSettingsToast('Team saved.');
  }, 600);
}

export function buildBackupData() {
  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    names: [...state.names],
    state: {
      mode: state.mode,
      speed: state.speed,
      theme: state.theme,
      task: el.taskInputSettings.value,
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

export function exportFullBackup() {
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

export function importFullBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.names || !Array.isArray(data.names)) throw new Error('Invalid backup');
      const err = validateNames(data.names);
      if (err) throw new Error(err);
      state.names = data.names.map(n => String(n).trim()).slice(0, MAX_NAMES);
      const s = data.state || data;
      if (VALID_MODES.includes(s.mode)) state.mode = s.mode;
      if (s.speed) state.speed = s.speed;
      if (s.theme) state.theme = s.theme;
      if (typeof s.task === 'string') el.taskInputSettings.value = s.task;
      if (s.wins) state.wins = s.wins;
      if (s.excluded) state.excluded = s.excluded;
      if (Array.isArray(s.history)) state.history = s.history.slice(0, MAX_HISTORY);
      if (Array.isArray(s.taskPresets)) state.taskPresets = s.taskPresets;
      if (typeof s.pinEnabled === 'boolean') state.pinEnabled = s.pinEnabled;
      if (typeof s.pinHash === 'string') state.pinHash = s.pinHash;
      if (typeof s.dailyResetEnabled === 'boolean') state.dailyResetEnabled = s.dailyResetEnabled;
      if (typeof s.dailyResetTime === 'string') state.dailyResetTime = s.dailyResetTime;
      else if (typeof s['el.dailyResetTime'] === 'string') state.dailyResetTime = s['el.dailyResetTime'];
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
      el.settingsError.textContent = 'Could not import backup — invalid file.';
    }
  };
  reader.readAsText(file);
}

export function startTour() {
  state.tourStep = 0;
  el.tourOverlay.classList.add('show');
  renderTourStep();
}

export function renderTourStep() {
  const step = TOUR_STEPS[state.tourStep];
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourText').textContent = step.text;
  document.getElementById('tourDots').innerHTML = TOUR_STEPS.map((_, i) =>
    `<span class="tour-dot${i === state.tourStep ? ' active' : ''}"></span>`
  ).join('');
  document.getElementById('tourNext').textContent = state.tourStep >= TOUR_STEPS.length - 1 ? 'Done' : 'Next';
}

export function endTour() {
  el.tourOverlay.classList.remove('show');
  state.tourSeen = true;
  savePrefs();
}

export function setupInstallBanner() {
  if (state.installBannerDismissed || window.matchMedia('(display-mode: standalone)').matches) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    el.installBanner.classList.add('show');
  });
}

export function setupServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    state.swRegistration = reg;
    if (reg.waiting) el.updateBanner.classList.add('show');
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          el.updateBanner.classList.add('show');
        }
      });
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    el.updateBanner.classList.remove('show');
  });
}

export function applyNames(newNames) {
  state.names = newNames;
  const nextExcluded = {};
  state.names.forEach(n => { nextExcluded[n] = !!state.excluded[n]; });
  state.excluded = nextExcluded;
  initWins(true);
  initFairBag();
  syncFairBagDeckWithEligible();
  state.currentRotation = 0;
  el.wheelRotator.style.transition = 'none';
  el.wheelRotator.style.transform = 'rotate(0deg)';
  void el.wheelRotator.offsetHeight;
  el.wheelRotator.style.transition = '';
  renderWheel();
  renderTally();
  updateStatusBar();
  syncModeSpeedUI();
  saveToStorage();
}

export function collectDraftNames() {
  return [...el.nameListEl.querySelectorAll('.name-row input')].map(inp => inp.value);
}

export function collectDraftExcluded(nameList) {
  const map = {};
  nameList.forEach((name, idx) => {
    const wrap = el.nameListEl.children[idx];
    const cb = wrap?.querySelector('.exclude-cb');
    if (name.trim()) map[name.trim()] = !!(cb && cb.checked);
  });
  return map;
}
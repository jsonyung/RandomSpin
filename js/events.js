import { MAX_NAMES, MODE_LABELS, SPEED_LABELS } from './config.js';
import {
  state, names, settingsDraft, settingsDraftExcluded, historyShowAll, pendingPinAction,
  lastSlackText, pinUnlockBuffer, undoSnapshot, deferredInstallPrompt, tourStep, swRegistration, TOUR_STEPS
} from './state.js';
import { el } from './dom.js';
import * as app from './app-logic.js';

export function bindEvents() {
el.nameListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-remove');
  if (!btn || btn.disabled) return;
  settingsDraft = app.collectDraftNames();
  settingsDraftExcluded = app.collectDraftExcluded(settingsDraft);
  settingsDraft.splice(Number(btn.dataset.idx), 1);
  app.renderSettingsList();
  app.scheduleSettingsSave();
});

el.nameListEl.addEventListener('input', (e) => {
  if (e.target.matches('.name-row input') || e.target.matches('.exclude-cb')) app.scheduleSettingsSave();
});

document.getElementById('addNameBtn').addEventListener('click', () => {
  settingsDraft = app.collectDraftNames();
  settingsDraftExcluded = app.collectDraftExcluded(settingsDraft);
  if (settingsDraft.length >= MAX_NAMES) {
    el.settingsError.textContent = `Maximum ${MAX_NAMES} names.`;
    return;
  }
  settingsDraft.push('');
  el.settingsError.textContent = '';
  app.renderSettingsList();
  const inputs = el.nameListEl.querySelectorAll('.name-row input');
  inputs[inputs.length - 1].focus();
});

document.getElementById('clearExcludesBtn').addEventListener('click', () => {
  settingsDraft = app.collectDraftNames();
  settingsDraftExcluded = {};
  app.renderSettingsList();
  app.scheduleSettingsSave();
  app.showSettingsToast('All excludes cleared.');
});

document.getElementById('settingsSave').addEventListener('click', () => {
  if (app.persistSettingsDraft()) app.closeSettings();
});

document.getElementById('resetCountsBtn').addEventListener('click', app.resetSessionCounts);

document.getElementById('settingsBtn').addEventListener('click', app.openSettings);
document.getElementById('settingsBack').addEventListener('click', () => app.closeSettings());
document.getElementById('historyBtn').addEventListener('click', app.openHistory);
document.getElementById('historyBack').addEventListener('click', app.closeHistory);
document.getElementById('helpBtn').addEventListener('click', app.openHelp);
document.getElementById('helpLinkModes').addEventListener('click', app.openHelp);
document.getElementById('modeWizardLink').addEventListener('click', app.openModeWizard);
document.getElementById('modeWizardBtn').addEventListener('click', app.openModeWizard);
document.getElementById('wizardClose').addEventListener('click', app.closeModeWizard);
el.wizardOptions.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-wizard-idx]');
  if (btn) app.applyWizardChoice(Number(btn.dataset.wizardIdx));
});
el.modeWizardModal.addEventListener('click', (e) => {
  if (e.target === el.modeWizardModal) app.closeModeWizard();
});
document.getElementById('copyDaySummaryBtn').addEventListener('click', app.copyDaySummary);
document.getElementById('helpClose').addEventListener('click', app.closeHelp);
el.lockBtn.addEventListener('click', () => {
  if (state.pinEnabled && !state.pinUnlocked) app.openPinModal();
});

document.getElementById('themeButtons').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-theme]');
  if (!btn) return;
  app.applyTheme(btn.dataset.theme);
  app.savePrefs();
});

el.taskInputSettings.addEventListener('input', () => {
  app.updateStatusBar();
  app.savePrefs();
});

el.soundToggle.addEventListener('change', () => {
  state.soundEnabled = el.soundToggle.checked;
  app.syncSettingsToggles();
  app.savePrefs();
});

el.soundVolume.addEventListener('input', (e) => {
  state.soundVolume = Number(e.target.value) / 100;
  el.volumeLabel.textContent = `${e.target.value}%`;
  app.savePrefs();
});

el.requireTaskToggle.addEventListener('change', () => {
  state.requireTaskBeforeSpin = el.requireTaskToggle.checked;
  app.savePrefs();
});

el.pinLockResetToggle.addEventListener('change', () => {
  state.pinLockResetCounts = el.pinLockResetToggle.checked;
  app.savePrefs();
});

el.recentTasks.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-recent-task]');
  if (!chip) return;
  el.taskInputSettings.value = chip.dataset.recentTask;
  app.updateStatusBar();
  app.savePrefs();
  app.showHomeToast(`Task: ${chip.dataset.recentTask}`);
});

el.confettiToggle.addEventListener('change', () => {
  state.confettiEnabled = el.confettiToggle.checked;
  app.savePrefs();
});

el.quickResultToggle.addEventListener('change', () => {
  state.quickResult = el.quickResultToggle.checked;
  app.savePrefs();
});

el.dailyResetToggle.addEventListener('change', () => {
  state.dailyResetEnabled = el.dailyResetToggle.checked;
  app.savePrefs();
  app.startDailyResetTimer();
});

el.dailyResetTime.addEventListener('change', () => {
  state.dailyResetTime = el.dailyResetTime.value || '09:00';
  app.savePrefs();
  app.startDailyResetTimer();
});

el.pinToggle.addEventListener('change', () => {
  if (el.pinToggle.checked && !state.pinHash) {
    el.settingsError.textContent = 'Save a 4-digit PIN first.';
    el.pinToggle.checked = false;
    return;
  }
  state.pinEnabled = el.pinToggle.checked;
  if (!state.pinEnabled) state.pinUnlocked = false;
  app.updateLockUI();
  app.savePrefs();
});

document.getElementById('resetPinBtn').addEventListener('click', () => {
  if (!confirm('Remove PIN lock and clear saved PIN on this browser?\n\nAnyone with access to Settings can do this — PIN is not recoverable from a server.')) return;
  state.pinHash = null;
  state.pinEnabled = false;
  state.pinUnlocked = false;
  el.pinToggle.checked = false;
  document.getElementById('pinInput').value = '';
  app.updateLockUI();
  app.savePrefs();
  el.settingsError.textContent = 'PIN lock removed. You can set a new PIN anytime.';
});

document.getElementById('savePinBtn').addEventListener('click', async () => {
  const pin = document.getElementById('pinInput').value.trim();
  if (!/^\d{4}$/.test(pin)) {
    el.settingsError.textContent = 'PIN must be exactly 4 digits.';
    return;
  }
  state.pinHash = await app.hashPin(pin);
  document.getElementById('pinInput').value = '';
  app.showSettingsToast('PIN saved securely.');
  app.savePrefs();
});

el.presetList.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove-preset]');
  if (removeBtn) {
    e.stopPropagation();
    state.taskPresets.splice(Number(removeBtn.dataset.removePreset), 1);
    app.renderPresets();
    app.savePrefs();
    return;
  }
  const chip = e.target.closest('[data-preset]');
  if (!chip) return;
  el.taskInputSettings.value = chip.dataset.preset;
  app.updateStatusBar();
  app.savePrefs();
});

document.getElementById('addPresetBtn').addEventListener('click', () => {
  const val = document.getElementById('newPresetInput').value.trim();
  if (!val) return;
  if (state.taskPresets.includes(val)) {
    el.settingsError.textContent = 'Preset already exists.';
    return;
  }
  state.taskPresets.push(val);
  document.getElementById('newPresetInput').value = '';
  app.renderPresets();
  app.savePrefs();
});

document.getElementById('copyTeamLinkBtn').addEventListener('click', app.copyTeamLink);
document.getElementById('exportHistoryBtn').addEventListener('click', app.exportHistoryCSV);
document.getElementById('exportHistoryBtn2').addEventListener('click', () => app.exportHistoryCSV(true));
document.getElementById('exportTallyBtn').addEventListener('click', app.exportTallyCSV);
document.getElementById('copySummaryBtn').addEventListener('click', app.copySummaryText);
document.getElementById('copyWeeklyReportBtn').addEventListener('click', app.copyWeeklyReport);
document.getElementById('exportBackupBtn').addEventListener('click', app.exportFullBackup);
document.getElementById('importBackupBtn').addEventListener('click', () => el.importBackupInput.click());
el.importBackupInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) app.importFullBackup(file);
  e.target.value = '';
});
document.getElementById('clearHistoryBtn').addEventListener('click', app.clearHistory);
el.showAllHistoryBtn.addEventListener('click', () => {
  historyShowAll = true;
  app.renderHistoryList();
});

el.historySearch.addEventListener('input', app.renderHistoryList);
el.historyFilterPerson.addEventListener('change', () => { historyShowAll = false; app.renderHistoryList(); });
el.historyFilterMode.addEventListener('change', () => { historyShowAll = false; app.renderHistoryList(); });
el.historyFilterDate.addEventListener('change', () => { historyShowAll = false; app.renderHistoryList(); });
el.historyFilterTask.addEventListener('change', () => { historyShowAll = false; app.renderHistoryList(); });

el.statusTask.addEventListener('click', () => {
  app.openSettings();
  setTimeout(() => el.taskInputSettings.focus(), 350);
});
el.statusTask.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.statusTask.click(); }
});

el.helpModal.addEventListener('click', (e) => {
  if (e.target === el.helpModal) app.closeHelp();
});

el.modeGroups.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-opt');
  if (!btn || state.isSpinning) return;
  const newMode = btn.dataset.mode;
  if (newMode === state.mode) return;
  if (state.pinEnabled && !state.pinUnlocked) {
    pendingPinAction = () => {
      state.mode = newMode;
      app.syncModeButtons();
      app.initFairBag();
      app.updateStatusBar();
      app.savePrefs();
      app.showSettingsToast(`Mode: ${MODE_LABELS[newMode]}`);
    };
    app.openPinModal();
    return;
  }
  state.mode = newMode;
  app.syncModeButtons();
  app.initFairBag();
  app.updateStatusBar();
  app.savePrefs();
  app.showSettingsToast(`Mode: ${MODE_LABELS[newMode]}`);
});

document.getElementById('speedButtons').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-speed]');
  if (!btn || state.isSpinning) return;
  const newSpeed = btn.dataset.speed;
  if (newSpeed === state.speed) return;
  if (state.pinEnabled && !state.pinUnlocked) {
    pendingPinAction = () => {
      state.speed = newSpeed;
      app.syncModeSpeedUI();
      app.updateStatusBar();
      app.savePrefs();
      app.showSettingsToast(`Speed: ${SPEED_LABELS[newSpeed]}`);
    };
    app.openPinModal();
    return;
  }
  state.speed = newSpeed;
  app.syncModeSpeedUI();
  app.updateStatusBar();
  app.savePrefs();
  app.showSettingsToast(`Speed: ${SPEED_LABELS[newSpeed]}`);
});

el.spinBtn.addEventListener('click', app.spin);
document.getElementById('modalCopy').addEventListener('click', app.copyResultText);
document.getElementById('modalCopySlack').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastSlackText); app.showHomeToast('Slack format copied!'); } catch (_) {}
});
document.getElementById('modalShare').addEventListener('click', app.shareResult);
document.getElementById('modalUndo').addEventListener('click', app.undoLastSpin);
document.getElementById('modalClose').addEventListener('click', app.hideResultModal);
document.getElementById('modalAgain').addEventListener('click', () => {
  app.hideResultModal();
  app.spin();
});

el.resultModal.addEventListener('click', (e) => {
  if (e.target === el.resultModal) app.hideResultModal();
});

el.pinModal.addEventListener('click', (e) => {
  if (e.target === el.pinModal) app.closePinModal();
});
document.getElementById('pinCancel').addEventListener('click', app.closePinModal);

document.getElementById('pinUnlockInput').addEventListener('input', (e) => {
  pinUnlockBuffer = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = pinUnlockBuffer;
  app.updatePinDots();
  if (pinUnlockBuffer.length === 4) app.tryPinUnlock(pinUnlockBuffer);
});

document.addEventListener('keydown', (e) => {
  if (el.pinModal.classList.contains('show') && /^\d$/.test(e.key)) {
    e.preventDefault();
    app.handlePinKey(e.key);
    return;
  }
  if (e.key === 'Escape') {
    app.hideResultModal();
    app.closePinModal();
    if (el.settingsPage.classList.contains('open')) app.closeSettings();
    if (el.historyPage.classList.contains('open')) app.closeHistory();
    app.closeHelp();
    app.closeModeWizard();
    return;
  }
  if (e.key === ' ' || e.code === 'Space') {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (el.settingsPage.classList.contains('open') || el.historyPage.classList.contains('open')) return;
    if (el.helpModal.classList.contains('show') || el.pinModal.classList.contains('show') ||
        el.modeWizardModal.classList.contains('show')) return;
    e.preventDefault();
    if (el.resultModal.classList.contains('show')) {
      app.hideResultModal();
    }
    app.spin();
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
  el.installBanner.classList.remove('show');
});
document.getElementById('installDismissBtn').addEventListener('click', () => {
  state.installBannerDismissed = true;
  el.installBanner.classList.remove('show');
  app.savePrefs();
});
document.getElementById('tourSkip').addEventListener('click', app.endTour);
document.getElementById('tourNext').addEventListener('click', () => {
  if (tourStep >= TOUR_STEPS.length - 1) app.endTour();
  else { tourStep++; app.renderTourStep(); }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'auto') app.applyTheme('auto');
});
}

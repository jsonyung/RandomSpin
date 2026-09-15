#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lines = fs.readFileSync(path.join(root, 'js/_legacy.js'), 'utf8').split('\n');
const eventsLines = lines.slice(1641, 2003).join('\n');

const domMap = {
  nameListEl: 'el.nameListEl', settingsError: 'el.settingsError', taskInputSettings: 'el.taskInputSettings',
  lockBtn: 'el.lockBtn', soundToggle: 'el.soundToggle', confettiToggle: 'el.confettiToggle',
  quickResultToggle: 'el.quickResultToggle', dailyResetToggle: 'el.dailyResetToggle',
  dailyResetTime: 'el.dailyResetTime', pinToggle: 'el.pinToggle', presetList: 'el.presetList',
  historySearch: 'el.historySearch', historyFilterPerson: 'el.historyFilterPerson',
  historyFilterMode: 'el.historyFilterMode', statusTask: 'el.statusTask', helpModal: 'el.helpModal',
  modeGroups: 'el.modeGroups', spinBtn: 'el.spinBtn', resultModal: 'el.resultModal',
  pinModal: 'el.pinModal', settingsPage: 'el.settingsPage', historyPage: 'el.historyPage',
};

let code = eventsLines;
for (const [k, v] of Object.entries(domMap)) {
  code = code.replace(new RegExp(`\\b${k}\\b`, 'g'), v);
}
code = code.replace(/document\.getElementById\('historyFilterDate'\)/g, 'el.historyFilterDate');
code = code.replace(/document\.getElementById\('historyFilterTask'\)/g, 'el.historyFilterTask');
code = code.replace(/document\.getElementById\('recentTasks'\)/g, 'el.recentTasks');
code = code.replace(/document\.getElementById\('soundVolume'\)/g, 'el.soundVolume');
code = code.replace(/document\.getElementById\('volumeLabel'\)/g, 'el.volumeLabel');
code = code.replace(/document\.getElementById\('requireTaskToggle'\)/g, 'el.requireTaskToggle');
code = code.replace(/document\.getElementById\('pinLockResetToggle'\)/g, 'el.pinLockResetToggle');
code = code.replace(/document\.getElementById\('importBackupInput'\)/g, 'el.importBackupInput');
code = code.replace(/document\.getElementById\('showAllHistoryBtn'\)/g, 'el.showAllHistoryBtn');
code = code.replace(/document\.getElementById\('modeWizardModal'\)/g, 'el.modeWizardModal');
code = code.replace(/document\.getElementById\('wizardOptions'\)/g, 'el.wizardOptions');
code = code.replace(/document\.getElementById\('installBanner'\)/g, 'el.installBanner');

const fns = fs.readFileSync(path.join(root, 'js/app-logic.js'), 'utf8')
  .match(/export (?:async )?function (\w+)/g)
  ?.map(s => s.replace(/export (?:async )?function /, '')) || [];

for (const fn of fns.sort((a, b) => b.length - a.length)) {
  code = code.replace(new RegExp(`(?<![\\.\\w])${fn}(?=\\()`, 'g'), `app.${fn}`);
}

const header = `import { MAX_NAMES, MODE_LABELS, SPEED_LABELS } from './config.js';
import {
  state, names, settingsDraft, settingsDraftExcluded, historyShowAll, pendingPinAction,
  lastSlackText, pinUnlockBuffer, undoSnapshot, deferredInstallPrompt, tourStep, swRegistration, TOUR_STEPS
} from './state.js';
import { el } from './dom.js';
import * as app from './app-logic.js';

export function bindEvents() {
`;

fs.writeFileSync(path.join(root, 'js/events.js'), header + code + '\n}\n');

const initLines = lines.slice(2004, 2026).join('\n');
const initCode = initLines.replace(/\bConfetti\b/g, 'app.Confetti').replace(/(?<![\\.\\w])(\w+)(?=\()/g, (m, fn) => {
  if (fns.includes(fn)) return `app.${fn}`;
  return m;
});

const initHeader = `import { state, tourStep, TOUR_STEPS } from './state.js';
import * as app from './app-logic.js';

export function bootstrap() {
`;

fs.writeFileSync(path.join(root, 'js/init.js'), initHeader + initCode + '\n}\n');
console.log('events.js and init.js rebuilt');

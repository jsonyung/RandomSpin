import { state, TOUR_STEPS } from './state.js';
import * as app from './app-logic.js';

export function bootstrap() {
app.setupServiceWorkerUpdates();
app.setupInstallBanner();

app.loadFromStorage();
app.applyUrlParams();
app.applyTheme(state.theme);
app.syncModeSpeedUI();
app.syncSettingsToggles();
app.updateLockUI();
app.initWins(true);
app.initFairBag();
app.Confetti.init();
app.renderWheel();
app.renderTally();
app.updateStatusBar();
app.updateLastResultStrip();
app.renderFairBagPanel();
app.renderRecentTasks();
app.startDailyResetTimer();
app.savePrefs();

if (!state.tourSeen) setTimeout(app.startTour, 800);
}

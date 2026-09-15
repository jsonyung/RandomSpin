# Fair Ads Spinner

Spin the wheel to fairly assign ads and leads to your team. Works offline as a PWA.

**Live:** [jsonyung.github.io/RandomSpin](https://jsonyung.github.io/RandomSpin/)

## Quick start

1. Open the app → complete the 30-second tour (or tap **?** anytime)
2. **Settings ⚙** → set team names, task/reason, and mode (**Fair Bag** recommended)
3. When a lead comes in → **SPIN** or press **Space**
4. **Copy Result** → paste in Slack/WhatsApp

## Fairness modes

| Mode | Use when |
|------|----------|
| **Fair Bag** | Equal ads — everyone gets 1 per round, shuffled order |
| **Pure Random** | True luck — no balance rules |
| **Weighted** | Soft catch-up for whoever is behind |
| **Anti-Repeat / Last Excluded / Lowest First / Strict Balance** | Extra control |

## Features

- Task presets, spin history (500), CSV export, daily count reset
- PIN lock for mode/speed, undo last spin, full backup import/export
- Shareable team URL: `?names=Peter,Simon&mode=fairBag&speed=normal&task=Facebook+lead`

## Install (mobile / desktop)

Browser menu → **Add to Home Screen** / **Install app**

## Files

- `index.html` — entire app (HTML, CSS, JS)
- `manifest.webmanifest` — PWA manifest
- `sw.js` — offline service worker
- `icon-192.png`, `icon-512.png` — app icons

## License

MIT — use freely for your team.

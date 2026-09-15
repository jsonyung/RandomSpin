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

- **Fair Bag preview** — see who's still in this round + who's next
- **Recent task chips** on home — tap to reuse last tasks
- **Which mode?** wizard — pick fairness mode in 1 tap
- **Today's summary** + **weekly report** — copy for Slack/manager
- **History chart** + filter by task + export filtered CSV
- **Share result** — native share or WhatsApp
- **Sound volume**, require task before spin, PIN on reset counts
- Task presets, spin history (500), daily count reset, undo last spin
- Full backup import/export (no backend needed)
- Shareable team URL: `?names=Peter,Simon&mode=fairBag&speed=normal&task=Facebook+lead`

## Future ideas (no backend)

- Gamification: streaks, badges, XP per lead handled
- Custom wheel themes / team branding
- Optional cloud sync when you're ready

## Install (mobile / desktop)

Browser menu → **Add to Home Screen** / **Install app**

## Files

- `index.html` — entire app (HTML, CSS, JS)
- `manifest.webmanifest` — PWA manifest
- `sw.js` — offline service worker
- `icon-192.png`, `icon-512.png` — app icons

## License

MIT — use freely for your team.

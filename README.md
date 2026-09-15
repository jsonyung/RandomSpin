# Fair Ads Spinner

Spin the wheel to fairly assign ads and leads to your team. Works offline as a PWA.

**Live:** [jsonyung.github.io/RandomSpin](https://jsonyung.github.io/RandomSpin/)

## Project structure

```
RandomSpin/
├── index.html          # App shell (HTML only)
├── css/
│   ├── main.css        # Entry — imports variables + layout
│   ├── variables.css   # Theme tokens (dark / light)
│   └── layout.css      # Components, pages, responsive
├── js/
│   ├── main.js         # Entry point
│   ├── config.js       # Constants (modes, colors, limits)
│   ├── state.js        # Mutable state + session vars
│   ├── dom.js          # DOM element bindings
│   ├── app-logic.js    # Core logic (wheel, modes, storage, UI)
│   ├── events.js       # Event listeners
│   └── init.js         # Bootstrap on load
├── tools/              # Dev scripts (not shipped to users)
├── manifest.webmanifest
├── sw.js               # Service worker (offline cache)
└── icon-192.png, icon-512.png
```

No build step — ES modules load directly on GitHub Pages.

## Quick start

1. Open the app → complete the tour or tap **?**
2. **Settings ⚙** → team names, task, **Fair Bag** mode
3. **SPIN** or Space when a lead comes in
4. **Copy Result** → paste in chat

## Features

- 7 fairness modes (Fair Bag, Pure Random, Weighted, + extras)
- Fair Bag round preview, recent tasks, mode wizard
- History chart, filters, CSV export, undo last spin
- PIN lock, daily reset, full backup import/export
- PWA — install for offline use

## Local development

```bash
# Any static server, e.g.:
python3 -m http.server 8765
# Open http://localhost:8765
```

## License

MIT — use freely for your team.

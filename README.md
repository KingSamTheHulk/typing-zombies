# Dead Letters

> A typing zombie shooter. Every zombie carries a letter — type it to blow the dead away with a shotgun before they reach you. Endless waves, combo scoring, no frameworks.

[![Live demo](https://img.shields.io/badge/live%20demo-play-8dff6b.svg)](https://kingsamthehulk.github.io/typing-zombies/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**▶ Play it live: [kingsamthehulk.github.io/typing-zombies](https://kingsamthehulk.github.io/typing-zombies/)**

Dead Letters is a small canvas game with zero dependencies. Pieces of the horde shamble out of the dark, each marked with a letter. Hit the matching key and your survivor snaps a shotgun toward it and fires. Miss the key and you waste a shell; let a zombie get too close and it takes a heart.

## Features

- **Type-to-shoot combat** — the letter above a zombie is the trigger. Living zombies always carry unique letters, so every keypress is an unambiguous shot.
- **Shotgun feel** — muzzle flash, tracers, sparks, ejected shells, blood, screen shake, and a synthesized boom via the Web Audio API.
- **Endless waves** — each wave sends more zombies, faster, with shorter gaps between spawns.
- **Combo scoring** — chain kills within a short window to raise the per-kill score; a wrong key or a bite resets the chain.
- **Persistent best score** — stored in `localStorage`.
- **Responsive canvas** — fills the window, renders at device pixel ratio (capped at 2), and freezes the scene on pause.
- **Zero dependencies** — plain ES modules, a tiny static Node server, and Node's built-in test runner.

## Quick start

Requires **Node.js 18 or newer**.

```bash
git clone https://github.com/KingSamTheHulk/typing-zombies.git
cd typing-zombies
npm start
```

Then open **http://127.0.0.1:3000**.

For automatic restarts while editing:

```bash
npm run dev
```

Because the game is purely static, you can also serve `public/` with any static file server.

## Deployment

The repo ships with [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes `public/` to GitHub Pages on every push to `main`.

1. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main` (or run the workflow from the **Actions** tab).
3. The game is live at **https://kingsamthehulk.github.io/typing-zombies/**.

The Pages build is fully static — the best score is saved per-visitor in `localStorage`.

## How to play

| Action    | Key                                   |
| --------- | ------------------------------------- |
| Fire      | Type the letter shown on a zombie     |
| Pause     | `Esc`                                 |
| Start / restart | `Enter`                        |
| Mute      | Click the ♪ button                    |

- Each zombie is tagged with a letter. Typing that letter fires at it — you never aim manually.
- Zombies get larger and more threatening as they approach. Their letter badge turns from green to red when they are close.
- A careful pull of the trigger on the wrong letter still fires (and still costs accuracy and combo), so keep your eyes on the letters.
- Clearing a wave awards a score bonus and restores one heart (up to five).
- When all hearts are gone, you are overrun.

## Scoring

- Kill: `(100 + combo × 20) × wave bonus`, where the wave bonus is `1 + 0.05 × (wave − 1)`.
- Combo increases with every kill and stays alive for **2.6 s**; a miss resets it.
- Wave clear: `+100 × wave` plus one heart.
- Accuracy is successful shots divided by all letter keypresses.

## Difficulty curve

`waveConfig(wave)` in `public/engine.js` drives the pacing:

| Setting | Wave 1 | Wave 5 | Wave 10 |
| --- | --- | --- | --- |
| Zombies to spawn | 7 | 15 | 25 |
| Spawn interval | 1580 ms | 1100 ms | 500 ms |
| Walk speed | 32 px/s | 60 px/s | 95 px/s |
| Max alive at once | 5 | 9 | 14 |

Spawn intervals clamp at 320 ms and max-alive at 14, so late waves become a sustained typing sprint.

## Project structure

```
typing-zombies/
├── server.js              # Minimal static file server
├── package.json           # Scripts and metadata
├── public/
│   ├── index.html         # HUD, overlays, canvas
│   ├── styles.css         # Dark neon-horror theme
│   ├── engine.js          # Pure logic: waves, letters, targeting, scoring
│   └── game.js            # Canvas rendering, input, audio, game loop
├── test/
│   └── engine.test.js     # Unit tests for the pure logic
└── README.md
```

`engine.js` is intentionally free of DOM and canvas code so it can run in both the browser and Node. `game.js` owns all rendering and side effects.

## Technical notes

- **Rendering** — one full-window canvas. The scene is a pseudo-3D graveyard: zombies spawn at the horizon and grow as they approach, with a parallax skyline, moon glow, drifting embers, and a flashlight cone that follows the gun.
- **Audio** — all sounds are synthesized at runtime with the Web Audio API (filtered noise bursts plus oscillators). No audio files.
- **Input** — a single `keydown` listener; modifier combos and key repeat are ignored. Buttons are blurred after use so hidden controls cannot steal keystrokes.
- **Persistence** — best score goes to `localStorage`. If storage is unavailable the game still runs.
- **Auto-pause** — switching tabs pauses the game.
- **Device pixel ratio** — canvases are backed at `min(devicePixelRatio, 2)` for crisp HiDPI drawing.

### Tuning knobs

| What | Where |
| --- | --- |
| Wave size, speed, spawn gap | `waveConfig` in `public/engine.js` |
| Bite distance | `BITE_RADIUS` in `public/engine.js` |
| Combo window | `COMBO_WINDOW_MS` in `public/engine.js` |
| Score formula | `scoreForKill` in `public/engine.js` |
| Player health | `maxHealth` in `public/game.js` |
| Palette / visual style | `ZOMBIE_PALETTES`, draw functions in `public/game.js` |

## Testing

```bash
npm test
```

Tests cover wave scaling, key normalization, target selection, unique-letter assignment, score progression, and accuracy math.

## License

MIT. Not affiliated with any existing zombie or typing-game franchise.

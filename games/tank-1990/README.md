# Tank 1990

A browser-based clone of *Battle City* (Tank 1990): drive a tank around a
tile-based arena, destroy waves of enemy tanks and a boss, and keep your
base from being blown up.

## Features

- **Tile-based arena** — a 13x13 grid of destructible brick, indestructible
  steel, impassable water, and a defendable base tile; bullets chip away
  brick tiles (and destroy the base) while steel blocks them but survives.
- **Keyboard controls** — arrow keys or WASD to move, <kbd>Space</kbd> to
  fire (rate-limited by a fire cooldown); the overlay's "Start" button or
  <kbd>Space</kbd>/<kbd>Enter</kbd> begins or restarts a run.
- **On-screen touch controls** — a D-pad and fire button for mobile/touch
  play, mirrored to the same keyboard input state.
- **Wave-based enemy spawning** — enemy tanks trickle in from three fixed
  spawn points (up to 4 on the field at once), with each wave requiring more
  kills than the last (base of 6, +2 per wave) before a boss tank appears.
- **Boss fights** — a larger, tougher boss tank with scaling HP per wave,
  its own health bar, a banner announcement on spawn, and a two-bullet
  spread shot instead of a single bullet.
- **Simple enemy/boss AI** — enemies and the boss pick a random direction on
  a timer (or when blocked by a collision), wander the map, and fire on
  their own cooldown.
- **Lives and respawn** — the player has 3 lives; losing one triggers a
  respawn with a brief invulnerability window (visualized as blinking).
- **Scoring & waves** — killing an enemy tank scores 100 points, killing the
  boss scores 1000 and advances to the next wave; the HUD tracks lives,
  score, best score, and current wave.
- **Best score tracking** — the high score is persisted in `localStorage`
  and shown on both the home screen and the in-game HUD.
- **Game over conditions** — running out of lives or letting the base get
  destroyed both end the run with a reason shown in the overlay.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/tank-1990
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                          | Purpose                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `home.html`                     | Landing screen with best-score display and play link              |
| `tank-1990.html`                | Gameplay page: HUD, canvas, boss banner, overlay, touch D-pad/fire |
| `css/home.css`                   | Home screen theme and layout                                      |
| `css/tank-1990.css`              | Game screen theme, HUD, boss banner, and touch control styling    |
| `js/constants.js`                | Tile types, map layout, tank/bullet tuning, spawn points          |
| `js/tile-map.js`                 | Tile grid: solidity checks, brick/base damage, and rendering       |
| `js/bullet.js`                   | Bullet movement and rendering                                     |
| `js/tank.js`                     | Tank entity: cooldown, muzzle position, and canvas rendering       |
| `js/tank-1990-home.js`           | Reads and displays the best score on the home screen               |
| `js/tank-1990-main.js`           | Game loop: input, enemy/boss AI, collisions, waves, HUD, rendering  |

## Notes

The 13x13 arena layout (`MAP_LAYOUT` in `js/constants.js`) is a hand-authored
ASCII grid (`.` empty, `B` brick, `S` steel, `W` water, `E` base) parsed by
`TileMap`. Water blocks tanks but not bullets, while steel blocks both but
is never destroyed — only brick tiles and the base can be worn down by
gunfire. Enemy and boss AI is intentionally simple: no pathfinding toward the
player, just randomized-direction wandering with periodic, timer-driven
shots, re-rolling direction whenever movement is blocked.

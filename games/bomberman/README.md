# Bomberman

A browser-based clone of the classic Bomberman arcade game — move around a
destructible grid, plant bombs to clear soft blocks and enemies, collect
power-ups, and survive escalating waves that culminate in a boss fight.

## Features

- **Destructible tile map** — a randomly generated grid of hard (indestructible)
  and soft (bombable) blocks each run, with the four corner spawn areas kept
  clear.
- **Bomb & chain-reaction explosions** — place a bomb (capped by your current
  bomb count) that detonates after a fuse, destroying soft blocks in a cross
  pattern up to your flame range and chain-triggering any other bombs caught
  in the blast.
- **Wave-based enemy spawning** — enemies trickle in from the non-player
  spawn points each wave, with the enemy count per wave and the on-field cap
  both increasing as you progress.
- **Wandering enemy AI** — enemies and the boss pick a random direction on a
  timer (or when blocked) and walk until the next decision tick; no
  pathfinding towards the player.
- **Boss fights** — once a wave's enemies are cleared, a boss spawns with a
  scaling HP pool and its own health bar, telegraphed by an on-screen
  "BOSS XUẤT HIỆN!" banner; defeating it advances to the next wave.
- **Power-ups** — destroyed soft blocks have a chance to drop a bomb-count,
  flame-range, or speed upgrade, each capped at a maximum value.
- **Lives, respawn & invulnerability** — losing a life respawns the player at
  the start position with a brief flashing invulnerability window; running
  out of lives ends the run.
- **Scoring & best score** — points for defeating enemies, bosses, and
  collecting power-ups; the best score is persisted in `localStorage` and
  shown on the home screen and in the in-game HUD.
- **Keyboard & touch controls** — Arrow keys or WASD to move, Space to place
  a bomb; on touch devices an on-screen D-pad and bomb button take over.
- **Pause-free start/game-over overlay** — an overlay shows before the run
  starts and again on game over, with Space/Enter or a button to (re)start.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/bomberman
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                     | Purpose                                                        |
| ------------------------ | --------------------------------------------------------------- |
| `home.html`               | Home screen with best-score display and link to start a run    |
| `bomberman.html`          | Gameplay screen (HUD, canvas, overlays, touch D-pad/bomb button) |
| `css/home.css`            | Home screen theme and layout                                   |
| `css/bomberman.css`       | Gameplay theme, HUD, canvas, and touch-control styling          |
| `js/constants.js`         | Tile size, entity stats, power-up caps, spawn points, `localStorage` key |
| `js/bomberman-map.js`     | `BombermanMap` class — grid generation, collision queries, tile rendering |
| `js/entity.js`            | `Entity` class shared by player, enemies, and boss (position, rendering) |
| `js/bomb.js`              | `Bomb` and `PowerUp` classes and their rendering                |
| `js/bomberman-home.js`    | Loads and displays the best score on the home screen            |
| `js/bomberman-main.js`    | Game loop, input handling, AI, bomb/explosion logic, waves, HUD, scoring |

## Notes

Enemy and boss "AI" is purely a random-walk timer (`aiTimer`, re-rolled on a
random interval or when the entity is blocked by a wall/bomb) — there is no
line-of-sight or pathfinding logic chasing the player.

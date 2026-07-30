# Pooyan

A browser-based retro arcade shooter in the style of the classic *Pooyan* —
you control an archer fixed on the left edge of the screen, firing arrows to
pop balloons drifting in and rocks falling from above before they reach you.

## Features

- **Vertical dodge-and-shoot gameplay** — move up/down along a fixed lane
  and fire arrows to the right; balloons bob in from the right edge on a
  sine-wave path while rocks fall straight down, both scored differently
  when popped (100 pts for balloons, 60 pts for rocks).
- **Lives & invulnerability** — 3 lives per run; getting hit costs a life
  and grants a brief flashing invulnerability window before you can be hit
  again.
- **Rising difficulty** — every 800 points of score bumps balloon/rock speed
  up one step, capped at 6 steps, so runs get progressively harder.
- **Best score tracking** — the highest score reached is saved in
  `localStorage` and shown on both the home screen and the in-game HUD.
- **Keyboard and touch controls** — Arrow Up/Down (or W/S) to move and
  Space to shoot, plus on-screen D-pad and fire button for touch devices.
- **Pause-free start/restart overlay** — a single overlay handles the
  start screen and game-over screen, restartable with Space/Enter or a
  tap on the fire button.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/pooyan
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                  | Purpose                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `home.html`            | Start screen showing the best score and a link into the game     |
| `pooyan.html`          | Gameplay screen (canvas, HUD, overlay, touch D-pad/fire button)   |
| `css/home.css`         | Home screen theme and layout                                     |
| `css/pooyan.css`       | In-game HUD, canvas, and touch-control styling                   |
| `js/constants.js`      | Game tuning constants (speeds, sizes, spawn timing, scoring)      |
| `js/pooyan-home.js`    | Reads the best score from `localStorage` for the home screen      |
| `js/pooyan-main.js`    | Game loop: input, spawning, collisions, scoring, rendering        |

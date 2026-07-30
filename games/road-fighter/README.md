# Road Fighter

A browser-based top-down racing game inspired by *Road Fighter* — steer down
a winding road, dodge oncoming traffic, and grab fuel canisters before your
tank runs dry, scoring points for both distance and survival.

## Features

- **Curving road with speed control** — the road sweeps left and right on a
  sine-wave path; Arrow Left/Right (or A/D) steer, Arrow Up/Down (or W/S)
  accelerate/brake, and the car eases back to cruising speed when idle.
- **Fuel management** — fuel drains continuously (faster at higher speed)
  and refills by driving through fuel pickups; running out ends the run.
- **Traffic and off-road hazards** — colored cars spawn ahead on the road;
  colliding with one, or steering off the road's edges, ends the run
  immediately.
- **Scoring** — points accrue continuously based on speed/distance, plus
  bonuses for passing traffic (+15) and collecting fuel (+5).
- **Best score tracking** — the highest score is saved in `localStorage`
  and shown on both the home screen and the in-game HUD.
- **Live HUD** — score, best score, current speed, and a fuel gauge update
  every frame during play.
- **Start/game-over overlay** — a single overlay shows instructions before
  the run and the reason for game over (crash, off-road, or out of fuel)
  afterward; restart with Space/Enter/Arrow Up or the overlay button.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/road-fighter
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                          | Purpose                                                        |
| ------------------------------ | ----------------------------------------------------------------- |
| `home.html`                    | Start screen showing the best score and a link into the game     |
| `road-fighter.html`            | Gameplay screen (canvas, HUD, fuel gauge, overlay)                |
| `css/home.css`                 | Home screen theme and layout                                     |
| `css/road-fighter.css`         | In-game HUD, canvas, and fuel bar styling                        |
| `js/constants.js`              | Game tuning constants (speeds, road geometry, spawn timing, fuel) |
| `js/road-fighter-home.js`      | Reads the best score from `localStorage` for the home screen      |
| `js/road-fighter-main.js`      | Game loop: input, road curve, spawning, collisions, scoring       |

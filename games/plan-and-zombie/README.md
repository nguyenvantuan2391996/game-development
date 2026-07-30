# Plants vs Zombies

A browser-based *Plants vs Zombies*-style tower defense game — plant
sun-collecting and zombie-fighting plants across a 5-lane garden grid to stop
a wave of zombies from reaching your house.

## Features

- **Seed bank with cooldowns** — pick a plant card (if you can afford it and
  its cooldown is up), then click a grid cell to place it; each card shows a
  cooldown overlay and grays out when you can't afford it.
- **Three plant types** — Sunflower (produces sun over time), Peashooter
  (auto-fires damaging peas at zombies in its lane), and Wall-nut (high HP,
  no attack, just blocks the lane).
- **Falling & clickable sun** — sun drops periodically from the sky at a
  random column, drifts to a resting height, and can be clicked to collect;
  idle suns fade out after a few seconds if not collected.
- **Escalating zombie waves** — zombies spawn on a timer that speeds up as
  more spawn, with each successive zombie getting slightly more HP and speed;
  the run ends in a win once a fixed total number of zombies has been spawned
  and defeated.
- **Zombie eating mechanic** — a zombie that reaches a plant stops to eat it
  (damage tick every ~0.65s) instead of walking through, until the plant dies
  or the zombie is killed.
- **Lawn mowers** — each of the 5 lanes has a one-time lawn mower that
  auto-triggers and wipes out every zombie in that lane if one reaches the
  house edge; a lane without its mower left triggers an immediate loss.
- **Procedural sound effects** — planting, collecting sun, hitting a zombie,
  a denied purchase, and win/lose stingers are all synthesized live via the
  Web Audio API (no audio files), with a mute toggle in the HUD.
- **Win/lose overlay** — a full-screen overlay reports the outcome and kill
  count, with buttons to restart or return to the home screen.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/plan-and-zombie
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                        | Purpose                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `home.html`                  | Landing page with how-to-play list and a static board preview      |
| `game.html`                  | Gameplay screen (HUD, seed bank, board, win/lose overlay)           |
| `css/plan-and-zombie.css`    | Landing page theme and board preview styling                       |
| `css/game.css`               | In-game layout: board grid, plants, zombies, peas, HUD, overlay     |
| `js/constants.js`            | Grid dimensions, starting sun, plant type definitions, zombie base stats, spawn/sun-drop pacing |
| `js/game.js`                 | Game loop: board/seed-bank setup, planting, sun spawning/collection, zombie spawning/movement/eating, projectiles, mowers, win/lose, procedural audio |

## Notes

There is no `localStorage` persistence in this game — every reload starts a
fresh run with `STARTING_SUN` (150) and no saved progress or best score.
Balancing constants worth knowing about live in `js/constants.js`: zombies
gain +15 HP every 3 spawns and +2 speed every 4 spawns (capped at +12), the
spawn interval shrinks from 6500ms toward a 2200ms floor by 150ms per spawn,
and the run is won once `TOTAL_ZOMBIES_TO_WIN` (14) zombies have all spawned
and been killed.

# Swing Copters

A browser-based *Flappy Bird*-style arcade game built with Phaser 3: a small
helicopter-backpack character stays at a fixed height while pairs of beams
scroll down the screen, and you flip its horizontal direction to dodge
through the gaps.

## Features

- **One-input controls** — tap/click anywhere or press <kbd>Space</kbd> to
  flip the character's horizontal direction; it drifts left or right at a
  constant speed until you tap again.
- **Procedural obstacles** — pairs of beams with a randomly-positioned gap
  spawn from the top on a timer and scroll downward past the character.
- **Progressive difficulty** — the beams' fall speed increases every 5 points
  (up to a cap), so the game gets faster the longer a run lasts.
- **Two ways to die** — colliding with a beam or drifting into the left/right
  screen edge both end the run immediately.
- **Scoring** — one point per beam pair successfully passed, shown live in
  the HUD.
- **Best score tracking** — the high score is persisted in `localStorage` and
  shown on both the home screen and the in-game HUD.
- **Idle/restart flow** — the game starts in a "ready" state with an
  instruction prompt, and tapping again after a game over restarts the scene.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/swing-copters
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                              | Purpose                                                     |
| ---------------------------------- | -------------------------------------------------------------- |
| `home.html`                        | Landing screen with best-score display and play link          |
| `swing-copters.html`               | Gameplay page; loads Phaser from a CDN and the game script     |
| `css/home.css`                     | Home screen theme and layout                                  |
| `css/swing-copters.css`            | Game page layout/theme (canvas is rendered by Phaser)          |
| `js/swing-copters-home.js`         | Reads and displays the best score on the home screen           |
| `js/swing-copters-main.js`         | Phaser scene: textures, character, beam spawning, physics, scoring, and game-over/restart flow |

## Notes

Unlike a typical Flappy Bird clone, the character's vertical position
(`CHAR_Y`) never moves — instead the beam pairs are the ones that scroll
downward via `body.setVelocityY`, which gives the same visual effect of the
character "flying up" through obstacles while keeping the physics simple.
Textures for the character and beams are generated procedurally at runtime
with `Phaser.GameObjects.Graphics` rather than loaded from image assets.

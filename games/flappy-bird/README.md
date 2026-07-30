# Flappy Bird

A browser recreation of the classic *Flappy Bird* — tap or hit Space to flap
through gaps in a stream of scrolling pipes, scoring one point per pipe
cleared, built with the Phaser 3 game framework.

## Features

- **Tap/Space to flap** — click, tap, or press <kbd>Space</kbd> to give the
  bird an upward boost; the same input starts the run from the ready screen
  and restarts it after a game over.
- **Procedural pipe pairs** — pipes spawn on a timer with a randomized gap
  position and scroll left at a constant speed, forcing continuous reaction.
- **Physics-driven bird** — gravity and flap velocity are handled by Phaser's
  Arcade physics; the bird's tilt angle follows its vertical velocity for a
  diving/climbing effect, and it idly floats before the run starts.
- **Scoring** — the score increments each time the bird passes a pipe pair,
  shown live in the HUD.
- **Best score tracking** — the highest score is saved to `localStorage` and
  shown on both the home screen and in-game HUD.
- **Collision-based game over** — hitting the ground or any pipe ends the run,
  tints the bird, and shows the final score with a restart prompt.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/flappy-bird
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                        | Purpose                                                    |
| ---------------------------- | ------------------------------------------------------------ |
| `home.html`                  | Landing screen with best-score display and play button      |
| `flappy-bird.html`           | Gameplay screen; hosts the Phaser canvas                     |
| `css/home.css`               | Home screen theme and layout                                 |
| `css/flappy-bird.css`        | In-game layout (canvas container, back link)                 |
| `js/flappy-bird-home.js`     | Reads the best score from `localStorage` for the home screen |
| `js/flappy-bird-main.js`     | Phaser scene: textures, physics, pipe spawning, scoring, game-over/restart flow |

## Notes

All visuals (bird, pipes, ground) are generated at runtime as Phaser textures
drawn with the Graphics API — there are no image assets, and gameplay tuning
(gravity, flap velocity, pipe gap/speed/spawn rate) lives as constants at the
top of `js/flappy-bird-main.js`.

# Snake

A browser-based take on the classic Snake game, with a second mode where a
Q-learning reinforcement-learning agent plays and trains itself in real time
instead of a human.

## Features

- **Normal mode** — classic grid-based Snake controlled with the arrow keys
  or WASD; eating food grows the snake and scores a point, hitting a wall or
  your own body ends the run.
- **AI Q-learning mode** — a tabular Q-learning agent (`js/q-learning-agent.js`)
  plays automatically, choosing to turn left, go straight, or turn right each
  tick based on an 11-bit state (danger straight/left/right, food direction,
  current heading) and learning from a reward signal (+10 for eating,
  -10 for dying, +1/-1 for moving closer to/further from the food).
- **Live training HUD** — episode count and current epsilon (exploration
  rate) are shown while the AI plays, decaying over time as it exploits its
  learned Q-table more often.
- **Adjustable AI speed** — Slow/Medium/Fast/Turbo buttons change the tick
  interval so you can watch early random flailing or fast-forward through
  many training episodes.
- **Persistent Q-table** — the learned Q-table, episode counter, and epsilon
  are saved to `localStorage` every 20 episodes, so training resumes across
  page reloads; a "clear & retrain" button wipes it and starts over.
- **Best score tracking** — normal and AI modes track separate best scores
  in `localStorage`.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/snake
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                       | Purpose                                                          |
| --------------------------- | ------------------------------------------------------------------ |
| `home.html`                 | Mode selection screen (Normal vs. AI Q-learning)                  |
| `snake.html`                 | Gameplay screen (HUD, canvas, AI speed/reset controls, overlay)    |
| `css/home.css`               | Home screen theme and layout                                      |
| `css/snake.css`               | Game screen theme, HUD, and overlay styling                       |
| `js/constants.js`             | Grid/cell size, direction vectors, `localStorage` key names        |
| `js/snake-engine.js`          | Core game rules: movement, collision detection, food spawning      |
| `js/q-learning-agent.js`      | State representation and the Q-learning agent (choose/learn/save)  |
| `js/snake-home.js`            | Home screen mode selection                                        |
| `js/snake-main.js`            | Wires up rendering, input, normal-mode loop, and AI training loop   |

## Notes

The Q-learning state (`getState` in `js/q-learning-agent.js`) is a compact
11-bit string encoding three danger flags (relative to current heading),
four food-direction flags, and four current-heading flags — not the raw
grid — which keeps the Q-table small enough to train live in the browser.
Actions are relative turns (`-1` left, `0` straight, `1` right) rather than
absolute directions, so the same state generalizes across all four headings.
Training happens continuously during AI-mode play: every tick is a Q-learning
update, and each death ends one "episode," after which epsilon decays and the
snake resets — there's no separate offline training step.

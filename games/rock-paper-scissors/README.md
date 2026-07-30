# Rock Paper Scissors

A browser-based rock/paper/scissors game against an AI opponent that learns
your play patterns as you go, using n-gram pattern matching backed by a
1st-order Markov chain fallback — not a fixed-odds random computer.

## Features

- **Predictive AI opponent** (`js/rps-ai.js`) — before each round, the AI
  looks for the longest recent sequence of your past moves (order 3, then 2)
  that it has seen enough times before (at least 2 prior occurrences) and
  predicts your next move from what followed that sequence historically;
  if no pattern has enough evidence yet, it falls back to a plain 1st-order
  Markov table (last move → next move frequency), and if there's no data at
  all yet, it guesses uniformly at random. It then plays the move that beats
  its prediction.
- **Live confidence readout** — after each round, the AI shows what it
  predicted, how confident it was (as a percentage), and which pattern
  length that prediction was based on.
- **Persistent learning** — the AI's move-history and pattern tables are
  saved to `localStorage` after every round, so it keeps adapting to you
  across page reloads instead of starting over each session; a "Xoá học &
  học lại" button wipes it and starts fresh.
- **Scoreboard** — tracks wins/losses/ties for the session, plus the current
  win streak and the best win streak ever (saved separately in
  `localStorage`).

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/rock-paper-scissors
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                             | Purpose                                                             |
| --------------------------------- | ---------------------------------------------------------------------|
| `home.html`                       | Best-streak display and start button                                 |
| `rock-paper-scissors.html`        | Gameplay screen: HUD, hand panels, choice buttons, reset button       |
| `css/home.css`                    | Home screen theme and layout                                         |
| `css/rock-paper-scissors.css`     | Game screen theme, HUD, hand panels, result banner, choice buttons    |
| `js/constants.js`                 | Move labels/emoji, counter-move table, n-gram tuning, `localStorage` keys |
| `js/rps-ai.js`                    | The prediction/learning AI: n-gram tables, Markov fallback, save/load |
| `js/rock-paper-scissors-main.js`  | Round flow, scoring, HUD updates, reset handling                     |
| `js/home.js`                      | Reads and displays the saved best win streak                         |

## Notes

The AI is fully deterministic given its learned state — there's no hidden
randomness layered on top of a confident prediction, so a player who plays
truly randomly will simply push the AI back to its uniform-random fallback
(no pattern will ever accumulate enough evidence), which is the expected,
correct behavior for a pattern-matching predictor rather than a bug.

An earlier version of this game had a room-selection lobby backed by a
third-party mock API, leading into a gameplay screen with no JavaScript
logic at all (a pure CSS/`:checked` trick with a reflex/luck-based
hit-selection quirk). That lobby was removed entirely as part of the AI
rewrite, since the round it led into never actually used the joined room's
data anyway.

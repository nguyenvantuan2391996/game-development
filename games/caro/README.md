# Caro

A browser-based implementation of Caro (Gomoku/five-in-a-row) — place X or O
marks on a large grid and be the first to connect five in a row, horizontally,
vertically, or diagonally.

## Features

- **Three game modes** — 2 players on the same device, player vs. computer
  (you play X), or computer vs. computer, which plays itself out
  automatically move by move.
- **Configurable board size** — pick rows/columns independently or lock them
  to a square board via a toggle, from 10x10 up to 60x60; cell size scales
  down automatically on larger boards.
- **Five-in-a-row detection** — checks horizontal, vertical, and both
  diagonal directions from the last move; a win highlights the full winning
  line of cells.
- **Draw detection** — the game ends in a draw once every cell is filled with
  no winner.
- **Heuristic computer opponent** — the AI scores every empty cell by the
  longest run it would create for itself and the longest run it would block
  for the opponent (via lookup tables in `js/constants.js`), then picks
  randomly among the tied best-scoring cells — no search/minimax, purely a
  one-ply scoring heuristic.
- **Computer vs. computer auto-play** — in that mode, moves are made one per
  second for both sides (the first move is forced to the board center) until
  a win or draw.
- **End-of-game modal** — a custom overlay (styled to match the game, not a
  native `alert`) announces the winner or a draw, with buttons to restart or
  return to the home screen.
- **Turn & move-count HUD** — shows whose turn it is (X/O), the number of
  moves played, and the configured board size.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/caro
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                  | Purpose                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `home.html`            | Game-type and board-size selection screen                        |
| `caro.html`             | Gameplay screen (HUD, board table)                              |
| `css/caro.css`          | Theme, layout, board/cell, and overlay styling                   |
| `js/constants.js`       | Board sizes, mode identifiers, AI scoring lookup tables           |
| `js/utils.js`           | Custom modal (`showModal`) and error alert helper                 |
| `js/caro-home.js`       | Home screen: mode/size card selection, navigation to the game     |
| `js/caro-main.js`       | Board setup, click handling, win/draw checks, AI move selection, computer-vs-computer loop |

## Notes

The computer's move scoring combines two lookup tables from
`js/constants.js`: `MAP_SCORE_COMPUTER` (reward for the run the AI would
build) and `MAP_POINT_HUMAN` (reward for the run it would deny the human),
summed per candidate cell — there is no lookahead beyond the immediate move.

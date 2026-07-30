# Xiangqi (Chinese Chess)

A browser-based implementation of Xiangqi (Chinese Chess) on an HTML canvas
board, playable either as a local two-player game or against a Minimax +
alpha-beta AI opponent.

## Features

- **Full Xiangqi rules** — all seven piece types (general, advisor, elephant,
  horse, chariot, cannon, soldier) with their correct movement rules,
  including the palace confinement for generals/advisors, the river-crossing
  restriction for elephants and soldiers, the horse/elephant "leg"/"eye"
  blocking rule, and the cannon's screen-jump capture.
- **Legal move filtering** — pseudo-legal moves are filtered to exclude any
  move that would leave the mover's own general in check.
- **Two play modes** — local 2-player (pass-and-play on one device) or
  vs. AI, where the human always plays Red and the AI plays Black.
- **Minimax AI with alpha-beta pruning** — the AI (`js/xiangqi-ai.js`) searches
  3 plies deep (negamax with alpha-beta cutoffs and capture-first move
  ordering) and picks randomly among top-scoring moves to avoid fully
  deterministic play.
- **Board evaluation heuristic** — piece-value based (general/chariot/cannon/
  horse/soldier/advisor/elephant), with bonus value for soldiers that have
  crossed the river and for cannons/horses positioned closer to the center
  file.
- **Click-to-move interface** — click a piece to see its legal destinations
  highlighted on the board, then click a highlighted square to move; the
  last move's squares are also highlighted.
- **Game-end detection** — checkmate and stalemate (no legal moves) are both
  detected and reported, with the winner announced in an overlay.
- **AI "thinking" indicator** — a HUD chip appears while the AI is computing
  its move, and player input is blocked until it finishes.
- **Restart** — a restart button (and the game-over overlay) resets the
  board to the starting position at any time.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/xiangqi
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                     | Purpose                                                          |
| ------------------------- | -------------------------------------------------------------------|
| `home.html`                | Mode selection screen (2-player vs. AI)                          |
| `xiangqi.html`             | Gameplay page: HUD (turn, AI thinking indicator), canvas, overlay |
| `css/home.css`             | Home screen theme and layout                                     |
| `css/xiangqi.css`          | Game screen theme, HUD, and overlay styling                       |
| `js/xiangqi-engine.js`     | Board setup, per-piece move generation, check detection, legal moves |
| `js/xiangqi-ai.js`         | Board evaluation and the negamax/alpha-beta search used by the AI |
| `js/xiangqi-home.js`       | Home screen mode selection                                        |
| `js/xiangqi-main.js`       | Canvas rendering, click-to-move input, turn flow, AI move triggering |

## Notes

The AI has a single fixed strength (depth 3, defined as `AI_DEPTH` in
`js/xiangqi-main.js`) — there's no difficulty selector or configurable
search depth. It always plays Black against a human-controlled Red, and its
search uses negamax with alpha-beta pruning plus simple capture-first move
ordering to prune more aggressively; among moves that tie for the best score
it picks one at random so it doesn't always repeat the same line. The game
has no persistence — no move history, saved games, or scores are written to
`localStorage`; every reload or restart starts from the initial position.

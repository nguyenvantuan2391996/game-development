# Chess

A browser-based chess game with full standard rules, played on a canvas
board — either two players taking turns on the same device, or a human
(White) against a Minimax/Alpha-Beta AI (Black).

## Features

- **Full rule set** — legal move generation for all pieces, castling
  (kingside/queenside, with the usual not-through-check restrictions),
  en passant, pawn promotion (auto-promotes to queen), and check detection
  that filters out moves leaving your own king in check.
- **Checkmate & stalemate detection** — the game ends and shows an overlay
  announcing checkmate (with the winner) or stalemate (draw) once the side
  to move has no legal moves.
- **Two modes** — 2 players (alternate turns manually) or vs. AI (you play
  White, the AI plays Black), selected on the home screen.
- **Minimax + Alpha-Beta AI** — the computer searches to a fixed depth
  (3 plies) using Negamax with alpha-beta pruning, ordering candidate moves
  by captured-piece value to improve pruning efficiency.
- **Board evaluation heuristic** — material value per piece plus a
  center-control bonus (higher for central squares) and a pawn-advancement
  bonus that scale the AI's positional preferences.
- **Click-to-move interface** — click a piece to see its legal destinations
  highlighted (captures shown differently from empty-square moves), then
  click a highlighted square to move; clicking elsewhere deselects.
- **Move & check highlighting** — the last move's origin/destination squares
  are tinted, and a king square is tinted red while its side is in check.
- **Turn HUD & AI "thinking" indicator** — shows whose turn it is and displays
  an "AI đang suy nghĩ..." chip while the AI is computing its move.
- **Restart** — a restart button (in the HUD or the end-of-game overlay)
  resets the board to the starting position at any time.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/chess
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                   | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `home.html`             | Mode selection screen (2 players vs. AI)                          |
| `chess.html`            | Gameplay screen (HUD, canvas board, overlays)                     |
| `css/home.css`          | Home screen theme and layout                                      |
| `css/chess.css`         | Gameplay theme, HUD, and canvas layout                             |
| `js/chess-engine.js`    | Board setup, move generation/legality, check detection, apply/undo move |
| `js/chess-ai.js`        | Board evaluation, move ordering, Negamax with alpha-beta pruning  |
| `js/chess-home.js`      | Home screen mode selection and navigation to the game              |
| `js/chess-main.js`      | Canvas rendering, click-to-move UI, turn flow, AI trigger, restart |

## Notes

The AI in `js/chess-ai.js` (`findBestChessMove`) searches a fixed depth of 3
plies (`AI_DEPTH` in `js/chess-main.js`) via Negamax with alpha-beta pruning
(`negamaxChess`); ties for the best-scoring move are broken randomly so the
AI doesn't always play the exact same line from a given position.

# Pikachu

A browser-based Pikachu / Onet-style tile-matching puzzle game — clear the
board by selecting pairs of identical tiles that can be connected by a
straight or bent line with at most two turns, racing against the clock.

## Features

- **Configurable board size** — choose a square board or independent row/column
  counts from a set of preset sizes (10 to 60) on the home screen before
  starting.
- **Classic connect-path matching** — two tiles match only if a line between
  them (straight, one turn, or two turns) can be drawn through empty cells,
  including an invisible walkable border just outside the grid, matching the
  original Pikachu/Onet rule.
- **Path-line animation** — a successful match draws an animated SVG polyline
  along the connecting path before the tiles fade out.
- **Combo popups** — matches made within 3 seconds of each other build a
  combo counter, shown as a floating "Combo x N!" popup.
- **Hint (with time penalty)** — highlights a valid matching pair and its
  connecting path for a moment; costs 5 seconds added to the clock.
- **Shuffle (with time penalty)** — manually reshuffle all remaining tiles in
  place; costs 10 seconds. Also offered automatically (free) when no
  matchable pair remains on the board.
- **Timer and move counter** — elapsed time and number of pick attempts are
  tracked live in the HUD.
- **Best time tracking** — the fastest completion time (and move count) is
  saved per board size in `localStorage` and shown in the HUD and win dialog.
- **Win dialog** — on clearing the board, a modal reports the final time and
  move count, flags a new record, and offers replay or return-to-home actions.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/pikachu
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                    | Purpose                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `home.html`              | Board size picker (square toggle, row/column size cards)           |
| `pikachu.html`           | Gameplay screen (HUD, board table, SVG path-line overlay)           |
| `css/pikachu.css`        | Theme, board/tile layout, path-line and popup animations            |
| `js/constants.js`        | Tuning constants: image count, board size presets, hint/shuffle penalties, combo window, `localStorage` key prefix |
| `js/utils.js`            | Shared modal helper (`showModal`) used for win/error dialogs        |
| `js/pikachu-home.js`     | Home screen: size-card selection state, navigation to the game      |
| `js/pikachu-main.js`     | Board generation, connect-path algorithm, click/match handling, timer, hint/shuffle, best-time persistence |

## Notes

The tile-matching logic in `js/pikachu-main.js` (`getConnectPath`) implements
the classic Onet connection rule: it first tries a direct line, then an
L-shaped path through one shared corner, then scans every column and every
row just outside the grid for a Z-shaped path with up to two turns through
empty cells. The same function powers both match validation and the hint
feature (`findHintPair` brute-forces all same-image tile pairs until it finds
one with a valid path).

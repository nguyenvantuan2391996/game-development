# Caro: a win-checking function that never asks "whose piece?" — it just trusts a global variable

Caro (Gomoku, connect-five) is the second board game in this repo with a real AI, but it takes a completely different approach from the AIs elsewhere that learn over time: no memory between games, no neural network, just a pure heuristic — score every empty cell by "the longest chain the computer would get by playing here" plus "the longest chain the human already has that this move would block," no deep search, no lookahead. What makes this game stand out in the repo is that it has three separate play modes — two players, player vs. computer, computer vs. computer — all sharing one core set of functions. And that sharing is exactly where things get interesting.

The most notable piece of logic is how the AI scores an empty cell, combining two independent lookup tables:

```javascript
let computerRun = Math.max(getHorizontal(i, j, O), getVertical(i, j, O), getRightDiagonal(i, j, O), getLeftDiagonal(i, j, O));
let humanRun = Math.max(getHorizontal(i, j, X), getVertical(i, j, X), getRightDiagonal(i, j, X), getLeftDiagonal(i, j, X));
let score = MAP_SCORE_COMPUTER.get(Math.min(6, computerRun)) + MAP_POINT_HUMAN.get(Math.min(5, humanRun - 1));
```

The four counting functions — `getHorizontal`, `getVertical`, and the two diagonals — all start counting from `count = 1`, meaning they always assume the cell being examined *already* belongs to the given `player`, even though it's actually empty, then count outward in both directions. For `computerRun` that number is used directly, since it means "the chain the computer would have after playing here." But for `humanRun` it gets subtracted by 1 before the lookup, because the meaning is different: not "the chain the human would have" (meaningless, since this is the computer's move) but "the chain the human already has, not counting the hypothetically-filled cell." Two formulas that look syntactically identical but carry opposite meanings — offense looks forward, defense looks at the present — reusing the exact same pair of counting functions for both.

What struck me most rereading this code wasn't the AI, though — it was the `checkWin` function:

```javascript
function checkWin(points) {
  return (
    getHorizontal(Number(points[0]), Number(points[1]), player) >= 5 ||
    getVertical(Number(points[0]), Number(points[1]), player) >= 5 ||
    getRightDiagonal(Number(points[0]), Number(points[1]), player) >= 5 ||
    getLeftDiagonal(Number(points[0]), Number(points[1]), player) >= 5
  );
}
```

`checkWin(points)` takes exactly one argument — the coordinates of the move just played. It has no parameter telling it "check the win for X or for O" — instead it silently reads a global variable called `player` to know whose five-in-a-row to look for. This works correctly across all three game modes, but only because at the exact moment `checkWin` gets called, `player` has always been manually arranged to point at whoever just moved — repeated verbatim in three separate places, with nothing enforcing or flagging it if one of those three ever gets reordered.

Tracing through all three code paths: in two-player mode, `markCell(..., player)` places the piece and `checkWin(points)` fires *before* `player = player === X ? O : X;` flips the turn, so `player` is still correctly the person who just moved. In player-vs-computer mode, the human is always X, and `player` is guaranteed to be reset to `X` at the end of the previous turn; after the check, `player = O;` gets assigned right before the computer moves and `checkWin` fires a second time. Computer-vs-computer mode repeats the exact same logic inside `ComputerAndComputer`. All three are correct — but correct by manual discipline, not by any structural constraint preventing a mistake. If someone, including future-me, ever swapped the order of two of these lines — say, folding the turn-swap up above the win check for tidiness — `checkWin` would silently check the wrong piece. No exception, nothing visibly wrong, just a win quietly missed or falsely reported.

This isn't a bug that's actually happening in the current code — I traced all three paths and the assignment order is correct as written. But it's the most memorable kind of structural fragility I found rereading this file: a function that depends on global state instead of an explicit parameter always carries an implicit contract — "make sure you call me at the right moment" — that nothing in the language enforces. The risk isn't in getting it wrong the first time; it's in editing one of those three call sites later without remembering that all three are silently relying on the same ordering convention.

There's one more small detail worth mentioning: `getPointsComputer()` gets called unconditionally even on the very first move of computer-vs-computer mode, even though its result is guaranteed to be thrown away by the "force the first move to the center" rule:

```javascript
let pointsComputerA = getPointsComputer();
if (isFirst) {
  isFirst = false;
  pointsComputerA = [
    Math.floor(matrixGame.length / 2),
    Math.floor(matrixGame[0].length / 2),
  ];
}
```

On a completely empty board, `getPointsComputer` still scans every empty cell — up to 3600 of them on a 60x60 board — calling all four chain-counting functions twice per cell, before the result gets discarded entirely. Nothing breaks, it's just wasted computation on the one move whose result is never used — checking `isFirst` before calling the function instead of after would avoid it entirely.

There's one more inconsistency worth noting in the AI's scoring table: `MAP_SCORE_COMPUTER` only assigns a near-maximal score (`99999`) to a chain of length 6 (`Math.min(6, computerRun)`), while the actual win condition only requires a chain of 5 (`checkWin` uses `>= 5`). A move that creates exactly a 5-chain — already a win by the rules — only gets a very high score, not an absolute one. In practice this has never caused any observable issue, because the maximum score achievable from any other combination never actually exceeds that number given the current values in the table — but it's still a semantic gap between "the threshold that counts as an absolute win" in the rules and in the AI's scoring, one that just happens not to cause bad behavior thanks to enough distance between the numbers involved.

What I take away from rereading `caro-main.js` in full is that the four chain-counting functions were written once, for win detection, then reused almost verbatim for AI scoring — a fairly tidy design decision, avoiding writing the same counting logic twice for two different purposes. But that same reuse is exactly why the meaning of the same number (`humanRun` versus `humanRun - 1`) becomes easy to misread without paying close attention to the calling context. A win-check function that depends on a global variable can be perfectly correct today, but "verified correct right now" and "structured to always be correct" are two very different levels of confidence — the first only takes one careful read of the code, the second requires redesigning the thing so the mistake becomes impossible in the first place.

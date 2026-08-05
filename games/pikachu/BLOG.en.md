# Pikachu (Onet): a freshly shuffled board that can be "dead" from move zero and nobody would know

This game has a pretty thorough `checkStuck()` function — after every successful match, it scans the whole board looking for any remaining matchable pair, and if there isn't one, it automatically offers the player a free shuffle. This mechanism runs correctly, runs consistently, after every successful move throughout a game. There's exactly one moment it's never called: right after the board is first generated, before the player's very first move. If the random layout algorithm — which doesn't care in the slightest whether the resulting board is even solvable — happens to produce a board that's already "dead," with no matchable pair left, nothing in the code catches that until the player figures it out themselves after several failed clicks.

Pikachu (or Onet, depending on where you grew up) is the only game in this repo where the entire fun factor rests on exactly one geometry algorithm: checking whether two tiles with the same image can be connected by a straight line, a single bend, or a double bend. No physics, no opponent AI, no real-time reflexes — just a pathfinding problem on a grid, called back hundreds of times per game, on every click, every hint request, every "is there still a match left" check.

Reading through `getConnectPath`, the algorithm tries four connection shapes in increasing order of complexity:

```javascript
function getConnectPath(a, b) {
  const [r1, c1] = a;
  const [r2, c2] = b;
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;

  if (isPathClear(r1, c1, r2, c2)) return [[r1, c1], [r2, c2]];

  if (isCellEmpty(r1, c2) && isPathClear(r1, c1, r1, c2) && isPathClear(r1, c2, r2, c2)) {
    return [[r1, c1], [r1, c2], [r2, c2]];
  }
  if (isCellEmpty(r2, c1) && isPathClear(r1, c1, r2, c1) && isPathClear(r2, c1, r2, c2)) {
    return [[r1, c1], [r2, c1], [r2, c2]];
  }

  for (let k = -1; k <= columns; k++) {
    if (!isCellEmpty(r1, k) || !isCellEmpty(r2, k)) continue;
    if (!isPathClear(r1, c1, r1, k)) continue;
    if (!isPathClear(r1, k, r2, k)) continue;
    if (!isPathClear(r2, k, r2, c2)) continue;
    return [[r1, c1], [r1, k], [r2, k], [r2, c2]];
  }

  for (let k = -1; k <= rows; k++) {
    if (!isCellEmpty(k, c1) || !isCellEmpty(k, c2)) continue;
    if (!isPathClear(r1, c1, k, c1)) continue;
    if (!isPathClear(k, c1, k, c2)) continue;
    if (!isPathClear(k, c2, r2, c2)) continue;
    return [[r1, c1], [k, c1], [k, c2], [r2, c2]];
  }

  return null;
}
```

The most subtle detail sits in the two loops on `k`, running from `-1` to `columns` (or `rows`) — instead of `0` to `columns - 1`, which is what you'd write instinctively if you only thought within the bounds of the real grid. Those boundary values `-1` and `columns` are precisely the "phantom ring" just outside the real board, always treated as empty by `isCellEmpty`:

```javascript
function isCellEmpty(r, c) {
  if (r < 0 || r >= matrixGame.length || c < 0 || c >= matrixGame[0].length) {
    return true;
  }
  return matrixGame[r][c] === "";
}
```

One boundary check is all it takes to turn the entire "outside the board" space into an infinitely walkable ring — no extra memory allocated for a larger-than-real grid, no special-casing needed anywhere else. Thanks to that, a double-bend connection can validly "loop around" outside the board — exactly matching the spirit of the original rule, where two tiles sitting in opposite corners of the board can connect by wrapping around the outer edge, even though at a glance "there's no path" if you only think within the real grid's bounds. This is also exactly the detail most likely to be forgotten if you don't remember the original rule precisely — without it, plenty of edge-tile pairs that should legitimately connect under real Onet rules would incorrectly register as unconnectable.

What's even more interesting is `findHintPair` — the hint function — which needs no separate algorithm of its own at all. It's simply a brute force over every same-image pair until it finds the first one where `getConnectPath`, the exact same function used to validate every click, returns something other than `null`:

```javascript
function findHintPair() {
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;
  for (let r1 = 0; r1 < rows; r1++) {
    for (let c1 = 0; c1 < columns; c1++) {
      if (matrixGame[r1][c1] === "") continue;
      for (let r2 = r1; r2 < rows; r2++) {
        for (let c2 = r2 === r1 ? c1 + 1 : 0; c2 < columns; c2++) {
          if (matrixGame[r2][c2] === "") continue;
          if (matrixGame[r1][c1] !== matrixGame[r2][c2]) continue;
          const path = getConnectPath([r1, c1], [r2, c2]);
          if (path) return { a: { r: r1, c: c1 }, b: { r: r2, c: c2 }, path };
        }
      }
    }
  }
  return null;
}
```

This is also where the most interesting bug I found while rereading the file lives. `checkStuck()` is written with real care:

```javascript
function checkStuck() {
  if (pairsMatched >= pairsTotal) return;
  if (findHintPair()) return;
  showToast("No more matches available!", "Shuffle", () => shuffleBoard(false));
}
```

But tracing every call site across the codebase, this function is only ever called from exactly one place: inside `handleClick`, right after a pair has just been successfully matched (the `else { checkStuck(); }` branch, when `pairsMatched !== pairsTotal`). The `init()` function — where `buildMatrix(rows, columns)` generates a fresh board — never calls `checkStuck()` after building the board. And `buildMatrix` itself has no verification step whatsoever guaranteeing the freshly generated board is even solvable — it just scatters image pairs into empty cells in a fully random order, with no regard for whether the resulting layout produces at least one valid connection:

```javascript
function buildMatrix(rows, columns) {
  const totalCells = rows * columns;
  const available = [];
  for (let i = 0; i < totalCells; i++) available.push(i);

  const flat = new Array(totalCells).fill("");
  while (available.length > 0) {
    const imageId = getRandomInt(1, NUM_IMAGES + 1);
    for (let i = 0; i < 2 && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      const cell = available[idx];
      flat[cell] = "images/" + imageId + ".png";
      available.splice(idx, 1);
    }
  }
  // ...
}
```

The consequence: in theory, it's entirely possible — though statistically rare, thanks to the very "generous" double-bend-through-the-ring rule, which means there's almost always at least one connectable pair while the board is still full — for a freshly generated board to have zero matchable pairs left, before the very first move is even made. In that case, the player would click pair after pair, always getting "no match," with no toast notification or shuffle offer ever appearing automatically — because `checkStuck()` only fires after a successful match, and if there's never been a successful match, it never gets the chance to run.

The double-bend-through-the-ring rule is extremely generous, so the odds of there being zero connectable pairs among the hundreds available, across all four connection shapes, are quite low. But "quite low" isn't "zero," and nothing in the code proves it's zero — this is an unverified assumption, not a demonstrated fact. What I take away from finding this: a "self-detecting deadlock" mechanism is only as good as every moment it's actually wired up to run — not just the moments that are easiest to think of, like after every move. The initial state tends to get skipped in this kind of check precisely because "nothing has happened yet" — intuition defaults to assuming the starting state is fine, when in fact it's just as much a state that needs verifying as any other state produced by that same random function.

The real fix isn't just patching the symptom by calling `checkStuck()` (or a variant that doesn't depend on `pairsMatched`) right after `buildMatrix` finishes inside `init()` — though that alone would already be a meaningful improvement. A more thorough fix would need a "regenerate if dead" loop right inside `buildMatrix` itself: after scattering the tiles, call `findHintPair()`, and if it returns `null`, reshuffle and try again, with a cap on retries to avoid an infinite loop in some extreme edge case. That addresses the problem at the root, instead of only detecting it and offering a shuffle after a dead board has already been shown to the player.

Pikachu is the only game in this repo where the entire experience rests on exactly one correctly implemented geometry algorithm — and that algorithm, `getConnectPath`, reads back completely correctly on a reread, down to its subtlest detail, the phantom ring for double-bend paths. The bug I found doesn't live in the core algorithm at all — it lives in a very human gap: a safeguard written with entirely good intentions, but only wired up to one of the two moments it actually needed to be present. Sometimes the biggest hole in a system isn't in its most complicated logic — it's in exactly the moment "nothing has happened yet," the one nobody thought to check either.

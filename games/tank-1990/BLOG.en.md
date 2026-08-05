# Tank 1990: a win condition that never gets a chance to decide anything on its own

There are exactly two places in Tank 1990's code that check "has the base been destroyed": one sits right inside the bullet collision handler, calling `triggerGameOver` the instant a bullet breaks the base's last tile; the other sits at the end of the main loop, re-reading `map.baseAlive` after everything else in the frame has updated, and calls `triggerGameOver` too. Skimming past it, this looks like a reasonable safety net — "in case" the first spot misses something. But when I traced the whole codebase to write this post, `baseAlive` turns out to have exactly one place that ever sets it to `false`, and that place sits right on the execution path leading to the first call. The second safety net isn't a "just in case" — it's a path that never gets walked, distinct from the one that already got walked before it.

Tank 1990 is a Battle City clone, and as of when I built it, it's the most architecturally complex game in the repo in terms of concurrently interacting entities: a 13×13 map that can be partially destroyed, up to 4 enemy tanks on the field at once plus a boss, bullets from both sides, and a base to defend. It's also the first game in the repo where I split things into separate class files (`TileMap`, `Bullet`, `Tank`) instead of stuffing everything into one `*-main.js` — the problem was complex enough that splitting files stopped being a style choice and became the sensible one. `TileMap` knows nothing about tanks, `Tank` knows nothing about the map, and all the coordination — who collides with whom — lives in the main loop.

Back to `baseAlive`. There's exactly one place in the entire codebase that sets it to `false`:

```javascript
// tile-map.js — damageTile()
if (t === TILE_BASE) {
    this.grid[row][col] = TILE_EMPTY;
    this.baseAlive = false;
    return "base";
}
```

And `damageTile` is only ever called from one place:

```javascript
// tank-1990-main.js — updateBullets()
if (map.isSolidForBullet(col, row)) {
    const result = map.damageTile(col, row);
    b.alive = false;
    if (result === "base") triggerGameOver("Base destroyed!");   // (1)
}
```

Which means the instant `baseAlive` flips to `false`, `triggerGameOver` is already called directly at line (1), within the same function call. The second check, at the end of the main loop:

```javascript
// tank-1990-main.js — loop()
if (map.baseAlive === false && state === "playing") {
    triggerGameOver("Base destroyed!");    // (2)
}
```

...always runs *after* line (1) in that same frame, since `updateBullets()` is called before this check in the body of `loop()`. And by then `state` is already `"gameover"` — the `state === "playing"` condition at line (2) is already false, so this branch never actually calls `triggerGameOver` with any new effect. Even under the hypothetical of it firing twice, `triggerGameOver` itself already guards with `if (state === "gameover") return;` at the top, so line (2) does no harm — but it also never has been, and structurally can never be, the *first* path leading to game-over-by-base-destruction.

What made me stop and think was: why is this different from a similar-looking situation I ran into in Tetris, where a comparable defensive branch (`br < 0` in the collision check) is dead code worth keeping, because it could get activated if a different design decision — piece spawn position — ever changed? In Tank 1990 there's no other plausible path that could ever set `baseAlive` to `false` besides that one `damageTile` call, short of someone adding an entirely new base-destruction mechanic, like a direct tank collision instead of a bullet. Until that happens, line (2) is genuinely redundant code, not a safety net for any specific future scenario.

The lesson here: not every duplicated check carries the same meaning. Some are safety nets for an alternate path that might exist someday, worth keeping. Others are re-checking a condition that can only ever become true through one path that's already been handled — those add nothing. Telling the two apart requires tracing *every* place a state variable gets written, not just reading each check in isolation.

One more small thing I noticed rereading `Tank`: `player.alive` gets initialized to `true` in the constructor and never gets set back to `false` anywhere, unlike `enemy.alive`/`boss.alive`, both of which flip to `false` the moment they're destroyed. Since `render()` only draws when `player && player.alive`, and that condition is always true, the `alive` field on the player object becomes a field that never changes value. Harmless — no visual bug results, since the Game Over screen covers the whole canvas with an overlay anyway — but it's a small asymmetry between three tank types sharing one class: two follow the proper `alive: true → false` lifecycle, one doesn't.

There's one more gameplay detail worth mentioning, because it's not a bug but a subtle design decision: enemy AI changes direction randomly on a timer, *but also switches direction the instant it gets blocked*. Without that detail, an enemy tank could easily roll a random direction straight into a wall and just sit there until the timer runs out — looking pretty dumb and breaking the illusion of an AI that's actually trying to move, even though the AI itself is still entirely random with no real pathfinding behind it.

Looking back, Tank 1990 is the most architecturally complex game in the repo as of this writing, and true to that complexity, most of the logic held up on review — no collision or AI bugs surfaced when I went back through it. The most interesting find turned out to be a subtle non-bug: a check that looks like a reasonable safety net, but once you trace the full lifecycle of the variable it's checking, turns out to have never — and structurally, given the current code, can never — get the chance to be the actual cause of any outcome different from the path that always precedes it.

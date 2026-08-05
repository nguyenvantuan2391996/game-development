# Bomberman: the last life can get deducted more than once in the same frame

The temporary invulnerability flag `player.invulnerable` does exactly two jobs in this game: it stops a single explosion from hitting the player repeatedly, and — by accident, but fairly effectively — it stops two *different* explosions from the same chain reaction from both hitting the player within the same frame, because the first explosion to land a hit flips the flag immediately, which then blocks the second explosion (processed right after, in the same loop) automatically. That self-protecting mechanism works well — except in exactly one case: when that hit is the one that takes the player's last life. On the path to Game Over, the invulnerability flag never gets set, and that implicit layer of protection disappears at exactly the moment it's needed most.

Bomberman is the second most complex clone in this repo, after Tank 1990, and it's noticeably more complex in its chain-reaction logic: a bomb going off can trigger other bombs sitting inside its blast radius, each chained explosion spawns its own new blast zone, and all of those blast zones — no matter how many separate bombs they originated from — can get processed within a single frame if their fuses happen to be close enough together. The chain-reaction logic, the heart of the whole game, lives in one recursive function:

```javascript
function explodeBomb(bomb, now) {
    if (bomb.exploded) return;
    bomb.exploded = true;
    bombs = bombs.filter((b) => b !== bomb);

    const cells = [{ col: bomb.col, row: bomb.row }];
    [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT].forEach((dir) => {
        for (let i = 1; i <= bomb.flameRange; i++) {
            ...
            if (map.destroySoft(col, row)) { maybeDropPowerup(col, row); break; }
        }
    });

    explosions.push({ cells, expiresAt: now + EXPLOSION_DURATION_MS, hit: new Set() });

    bombs.slice().forEach((other) => {
        if (cells.some((c) => c.col === other.col && c.row === other.row)) {
            explodeBomb(other, now);   // recursive — can spawn multiple explosion objects in the same frame
        }
    });
}
```

The `bomb.exploded` flag stops a bomb from exploding twice, guarding against infinite recursion if two bombs sit inside each other's blast radius. But every time `explodeBomb` runs — whether called directly or recursively from another `explodeBomb` — it creates its own separate `explosion` object, with its own separate "already hit" `Set`, then pushes it into a shared `explosions` array. That's the crux of the bug: that `hit` set only prevents *the same* explosion from hitting a target twice — it does nothing to stop *different* explosions in the same chain reaction from all hitting the same target within the same frame.

In the normal case (player still has lives left), the hit-handling code looks fine on its own:

```javascript
function hitPlayer() {
    player.lives -= 1;
    if (player.lives <= 0) {
        triggerGameOver("You're out of lives!");   // does NOT set invulnerable
    } else {
        respawnPlayer();                            // sets invulnerable = true IMMEDIATELY
    }
}
```

`respawnPlayer()` sets `player.invulnerable = true` synchronously, right within the same call to `hitPlayer()`. So if `updateExplosions` is iterating over multiple `explosion` objects within the same frame (from a chain reaction), the first explosion to hit the player flips `invulnerable` immediately, making the `!player.invulnerable` check false for every subsequent explosion later in the same loop — a self-protection mechanism that works correctly, even though nobody designed it specifically for the multiple-explosions-in-one-frame case. But the moment `player.lives` drops to 0 on that very first hit, the `triggerGameOver` branch runs instead of `respawnPlayer`, and `player.invulnerable` never gets set. `triggerGameOver` has a re-entry guard (`if (state === "gameover") return;`) that stops the overlay from showing twice — but `hitPlayer()` itself has no equivalent guard. If a second explosion in the same chain reaction also covers the exact tile the player is standing on, `hitPlayer()` gets called again, driving `player.lives` further into negative territory.

Visually, the player still only ever sees one Game Over screen, thanks to the guard inside `triggerGameOver`, and the displayed score isn't wrong — but `player.lives` in memory can end up deeper into negative numbers than it should. This isn't some theoretical branch with no real path leading to it — all it takes is two bombs chaining together whose blast zones both cover the tile the player is standing on, at the exact moment the last life is lost, for this race condition to actually happen. It's just been hidden by other layers of protection, so the consequence never surfaces clearly on screen.

The most interesting thing about tracing this bug is noticing the asymmetry between the two functions: `triggerGameOver()` has a re-entry guard, while `hitPlayer()` — the function that calls it — doesn't. If `hitPlayer()` checked `state === "gameover"` and bailed out early right at the top, the entire downstream chain, including the missing `invulnerable` assignment, would stop mattering, because the function would simply never run a second time. A re-entry guard only protects the body of the function it lives inside — it does nothing for other call sites that reach the same function from different places. To actually block the whole chain of consequences, the guard needs to sit on the *first* function in the repeatedly-called chain, not the last one.

Bomberman's chain-reaction logic is written correctly and holds up well — the hardest algorithmic part of the whole game works right from the start. The bug I found doesn't live there — it lives in a much subtler blind spot: a state flag accidentally taking on a protective role it was never designed for, working fine most of the time thanks to a side effect, except in exactly one branch — losing the last life — where that side effect never fires. Protection mechanisms that "emerge naturally" from how functions happen to call each other tend to be more fragile than ones that are explicitly designed — they work right up until the moment some branch quietly breaks an assumption nobody ever wrote down.

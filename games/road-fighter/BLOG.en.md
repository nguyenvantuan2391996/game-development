# Road Fighter: a road that never stores a single point

Of every game in this repo, Road Fighter is the only top-down racer, modeled after the arcade classic of the same name. The part I enjoyed most about building it wasn't the driving or the dodging — it was how the winding road itself gets represented: not as an array of points or line segments, but as a continuous sine function of distance traveled.

```javascript
function roadCenterForScreenY(screenY, scrollDist) {
    const aheadDist = scrollDist + (GAME_HEIGHT - screenY);
    return GAME_WIDTH / 2 + Math.sin(aheadDist * ROAD_CURVE_FREQ) * ROAD_CURVE_AMPLITUDE;
}
```

Feed it a screen-space Y position and the total distance scrolled so far, and it hands back the road's center at that exact point — no lookup table, no interpolating between stored waypoints, just one `sin` call. To draw the whole road, I just call this once per horizontal strip of the canvas. To check whether the player has drifted off the edge, I call the exact same function at the player's Y position.

The nicer trick is how traffic cars and fuel pickups stay "glued" to the exact bend in the road where they spawned. Instead of storing an absolute Y coordinate, each object stores a `relativeDistance` — how far it still is from the player — which counts down every frame by exactly the player's speed, mirroring how `scrollDistance` counts up. Because both quantities change by the same amount in opposite directions every frame, their sum never changes over an object's lifetime — meaning the point on the curve where that enemy car sits stays fixed, even though its `screenY` shifts every frame as it scrolls down the screen. No per-object speed syncing needed; the whole world's scroll speed automatically tracks the player's.

Fuel consumption follows the same idea: it drains proportionally to how fast the player is going relative to cruise speed.

```javascript
fuel -= FUEL_DRAIN_PER_SEC * (playerSpeed / CRUISE_SPEED) * dt;
score += playerSpeed * dt * 0.08;
```

Driving fast scores faster and burns fuel faster at the same time — a natural risk/reward tradeoff that falls out of tying both formulas to the same `playerSpeed` variable, with no extra mechanic needed to enforce it.

But rereading `updateWorld` while writing this post, I found something subtler. The loop that checks collisions and awards points for passing a car looks like this:

```javascript
traffic.forEach((t) => {
    t.relativeDistance -= playerSpeed * dt;
    const screenY = GAME_HEIGHT - t.relativeDistance;
    const carTop = screenY - TRAFFIC_HEIGHT / 2;

    if (!t.scored && carTop > PLAYER_SCREEN_Y + PLAYER_HEIGHT / 2) {
        t.scored = true;
        score += 15;
    }

    if (rectsOverlap(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT, t.x - TRAFFIC_WIDTH / 2, carTop, TRAFFIC_WIDTH, TRAFFIC_HEIGHT)) {
        triggerGameOver("You crashed into a car!");
    }
});
```

`triggerGameOver` is safe to call more than once thanks to a guard at the top (`if (state === "gameover") return;`), so the game-over overlay never stacks on top of itself. But the `forEach` itself never stops — `Array.prototype.forEach` in JavaScript has no way to `break` partway through. If, in that same frame, another car further along in the `traffic` array happens to cross the "cleared" threshold, the condition `!t.scored && carTop > ...` still holds, and `score += 15` still runs — right after `triggerGameOver` already read `score` and froze it into `finalScore` to display on the overlay and save to `localStorage`.

The result is that the live `score` variable (used to draw the HUD) and `finalScore` (the frozen number shown on the "Game Over" overlay) can drift apart by up to 15 points, within the single frame the crash happens. In practice basically nobody notices — the overlay covers the canvas immediately, and a 15-point drift on a score that typically runs into the hundreds isn't something anyone would catch by eye. But what makes it interesting is the shape of the bug: `triggerGameOver` protects exactly its own concern (don't show the overlay twice), while the data (`score`) has no protection at all from statements that run after it inside the same loop. The real fix is one keyword — swap `forEach` for a `for...of` loop so a collision can `break` out immediately, no structural changes needed. The `fuelItems.forEach` that runs right after, and the off-road boundary check further down, carry the same risk, since neither of them checks `state` before running either.

This isn't a crash or an obviously broken screen — it's the kind of bug that only shows up when you read the statements in the exact order they execute, not something dozens of playthroughs would ever surface. That's the lesson I keep coming back to from Road Fighter: a "state-ending" function with a good guard clause still isn't enough if the loop calling it doesn't know to stop on its own.

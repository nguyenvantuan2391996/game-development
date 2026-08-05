# Flappy Bird: when the AI's "deaths" get counted more times than it actually dies

The Flappy Bird game in this repo has a small secret the README never mentions: alongside the normal play mode, there's an AI mode — a Q-learning agent that flaps on its own, learns over thousands of pipe collisions, and saves what it learned to `localStorage`. No neural network, no ML library, just a plain JavaScript object acting as a lookup table.

The hard part of getting a lookup table to "learn" Flappy Bird isn't the Q-learning formula — that's a few lines. The hard part is compressing a continuous world (bird position, fall speed, distance to the next pipe) into a small enough number of discrete states for the table to actually converge inside a browser tab:

```javascript
function getFlappyState(bird, nextPipe) {
    const dx = nextPipe.x - bird.x;
    const dy = bird.y - nextPipe.gapCenterY;
    const vy = bird.body.velocity.y;

    const dxBucket = clampInt(Math.floor(dx / 40), -1, 9);
    const dyBucket = clampInt(Math.round(dy / 40), -8, 8);
    let velBucket;
    if (vy < -300) velBucket = 0;
    else if (vy < 0) velBucket = 1;
    else if (vy < 200) velBucket = 2;
    else if (vy < 500) velBucket = 3;
    else velBucket = 4;

    return dxBucket + "_" + dyBucket + "_" + velBucket;
}
```

Three small integers — horizontal distance bucketed to 40px, vertical distance to the gap center bucketed to 40px, fall speed collapsed into five coarse bands — instead of millions of absolute-coordinate combinations. The whole state space fits in a few hundred possibilities, small enough for the agent to learn something after a few thousand "lives," running entirely on the player's machine.

The second subtle choice is a line that's easy to skim past: the agent lives in a module-scoped `sharedAgent` variable, not a Scene property. The reason is that Phaser's `Scene.restart()` throws away the old Scene instance and builds a fresh one — if the agent lived inside the Scene, it would be wiped clean every time the bird hit a pipe. Keeping it outside, initialized exactly once, is the only way learning survives thousands of consecutive "deaths."

But that same restart mechanism hides a fairly interesting bug. When the bird collides, the episode-handling code looks like this:

```javascript
if (this.state === "gameover") {
    this.agent.episode += 1;
    this.agent.decayEpsilon();
    if (this.agent.episode % 20 === 0) this.agent.save();
    this.updateAiHud();
    this.time.delayedCall(80, () => {
        if (this.scene) this.scene.restart();
    });
    return;
}
```

This block lives inside `aiUpdate()`, called from `update()` — Phaser's per-frame loop. `gameOver()` does call `this.physics.pause()`, but pausing physics does not pause the Scene's update loop; in Phaser those are two entirely separate concerns. From the moment `state` flips to `"gameover"` until the `delayedCall(80, ...)` actually fires the restart — roughly 5 frames at 60fps — the Scene keeps calling `aiUpdate()` every frame, and nothing stops that block from running again.

The result: one real death can get counted as 5 episodes, epsilon decays 5 times faster than intended, and worse — 5 separate `delayedCall` invocations get queued to call `scene.restart()`, even though only the first one still means anything by the time it fires. Nothing looks wrong on the HUD — the episode counter still climbs steadily, just faster than the number of times the bird actually hit something, a drift with no visible reference point to catch it by eye.

What makes this interesting is that `gameOver()` — the physics collision handler — already has the right kind of re-entry guard (`if (this.state === "gameover") return;`). Only the training side-effect block inside `aiUpdate()` is missing one, despite living in the same class and checking the exact same `this.state` variable. The lesson isn't new, but it's worth repeating: any block that reacts to `if (state === X)` has to ask whether that condition is guaranteed to hold for exactly one frame — if not, it needs its own guard, not a quiet assumption that it "probably only runs once."

The learning algorithm itself, taken in isolation, is entirely correct — the Q-value update follows the formula, epsilon-greedy follows the standard strategy, the state discretization is sensible. The bug lives exactly at the boundary that's easiest to miss: where the training loop meets the render loop, the place where both sides are "correct" on their own and only break when they run into each other more times than anyone planned for.

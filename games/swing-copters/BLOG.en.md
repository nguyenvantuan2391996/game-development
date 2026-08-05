# Swing Copters: the "standing still" game that inherited a bug from its Flappy Bird sibling

Open `js/q-learning-agent.js` in Swing Copters next to the same-named file in the Flappy Bird folder and run `diff` between them — almost everything matches. The only real difference is one function: `getFlappyState` got renamed and re-derived into `getSwingState`, while the rest of the `QLearningAgent` class (alpha, gamma, epsilon-greedy, the Q-value update) didn't change a single character. This is the Q-learning AI architecture I built once for Flappy Bird and deliberately reused for a second game. And along with that reuse, a bug I'd already logged in Flappy Bird came with it, intact, into this exact game.

Swing Copters is Flappy Bird's technical twin — same Phaser 3, same scene structure, the same undocumented AI mode. But gameplay-wise it flips the core assumption completely: instead of a character fixed on the horizontal axis and moving vertically, here the character is fixed on the *vertical* axis (its Y position never changes) and only moves sideways, while the obstacles — pairs of beams — scroll down from above. Visually the player still feels like they're "flying up through obstacles," but physically it's the opposite:

```javascript
// Swing Copters: the character has NO gravity, the beams have velocityY (scrolling down)
[leftBeam, rightBeam].forEach((beam) => {
    beam.body.setAllowGravity(false);
    beam.body.setImmovable(true);
    beam.body.setVelocityY(this.riseSpeed);   // the beams drift down, not the character drifting up
});
```

That choice keeps the physics much simpler than actually simulating a character "flying up" would (which would mean recalculating camera position or scrolling the whole world) — a single axis of motion on the obstacles is enough to produce the illusion. When difficulty ramps up (every 5 points), I re-apply the new velocity to *every* beam currently on screen, not just the ones spawned afterward — so there's never a weird moment where an old beam drifts slower than a brand-new one appearing at the same time.

The most interesting part, though, is what I didn't write from scratch: the AI. `sharedAgent`, `aiUpdate()`, the entire training loop was copied almost verbatim from Flappy Bird, with only the state-discretization function swapped out for the reversed axis. And, predictably, the episode-handling block on game over came along unchanged too:

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

This is the exact bug I already dissected in the Flappy Bird post: the block lives inside `aiUpdate()`, called every frame from Phaser's `update()`. `physics.pause()` (called inside `gameOver()`) does not pause the Scene's update loop — so during the roughly 80ms between `state` flipping to `"gameover"` and `scene.restart()` actually firing, that block keeps getting called, with no re-entry guard to stop it. The result: `episode` and `epsilon` can get bumped several times for a single death, and the HUD counter still climbs steadily, so nothing "looks wrong" to catch by eye.

What I find more interesting than the bug itself is how it spread. This is concrete evidence of a risk specific to reusing code by copy-paste, as opposed to sharing it through an actual common module: when a second game copies a logic block from the first, it copies *everything*, the correct parts and the broken parts alike. If `QLearningAgent` and the training-loop scaffolding had been extracted into one file imported by both games, fixing the bug in Flappy Bird would have automatically fixed it in Swing Copters too. With the current setup — each game holding an independent copy of nearly the whole file — a fix in one place doesn't propagate to the other. Two identical bugs now exist as two *separate* problems, each needing its own separate fix.

One more small thing worth noting: `handleInput()` (the "playing" branch) and `aiFlip()` contain the exact same three lines of logic, not shared through a common function:

```javascript
this.direction *= -1;
this.character.body.setVelocityX(this.direction * HORIZONTAL_SPEED);
this.tweens.add({ targets: this.character, angle: this.direction * 15, duration: 150 });
```

Harmless behaviorally — both run correctly — but a small, clear DRY violation. If the flip behavior ever needs tweaking (adding a sound effect, changing the tilt formula), both spots have to be remembered and updated together.

The real lesson from Swing Copters isn't about gameplay (flipping the axis of motion turned out to be a cheap and effective way to turn an existing foundation into a "new" game) — it's in the place I least expected it. When two parts of a system are similar enough in architecture to be worth copying, that's also the signal that they're similar enough to deserve being abstracted into an actual shared component. Not doing that — whether from time pressure, or because each game was written independently without anticipating a second one — is a real tradeoff, not a free default.

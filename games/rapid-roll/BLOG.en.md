# Rapid Roll: the ball loses on its very first bounce, before the player can even touch a key

The most memorable bug in this game isn't something I caught myself while playtesting — it got caught after the fact, and the only trace left in the code today is a constant named `DEATH_CHECK_MIN_DEPTH` with a few lines of comment carefully explaining why it exists. No dramatic commit message, no story about a late debugging night — just one `if` statement with an extra condition added, and the math behind it is clear enough to tell the whole story on its own.

Rapid Roll is a clone of the famous "falling ball dodging platforms" game from old Nokia phones, built right after Space Impact in the same batch of "old black-and-white Nokia phone" games. If Space Impact is a problem about space (dodging bullets on two axes), Rapid Roll is a completely different problem: the ball only falls along the Y axis under real gravity, the player only controls the X axis, and what actually decides difficulty isn't an enemy — it's the camera. The screen keeps auto-scrolling down, faster over time, and any ball that keeps bouncing in place too long gets "left behind" and loses. This core mechanic — the camera chasing the player instead of the player chasing the camera — was the hardest part of the whole game to think through, and it's also exactly where the bug lived.

My favorite piece of the design is how the camera is modeled — not a simple "track the ball's position" variable, but the maximum of two forces pulling in opposite directions:

```javascript
const scrollSpeed = Math.min(SCROLL_SPEED_MAX, BASE_SCROLL_SPEED + maxDepth * SCROLL_SPEED_PER_DEPTH);
const followTarget = ball.worldY - GAME_HEIGHT * FOLLOW_LINE_RATIO;
camera.y = Math.max(camera.y + scrollSpeed * dt, followTarget);
```

The first term (`camera.y + scrollSpeed * dt`) is mandatory pressure: the camera always drifts downward at some minimum speed no matter what the ball is doing — this is the source of all the time pressure in the game. The second term (`followTarget`) is a safety ceiling: if the ball falls faster than the minimum scroll speed, the camera snaps to catch up instantly so the ball never falls off the bottom of the screen. `Math.max` of these two terms is essentially the entire "soul" of the difficulty curve — no extra enemy logic or complex collision needed.

My first attempt at this formula looked completely different: have the camera stick tightly to the ball with a fixed offset. Playtesting immediately showed it was wrong — there'd be no pressure at all, the player could stand still bouncing in place forever without ever losing. I had to split "the camera drifts because time passes" and "the camera drifts because the ball has moved far" into two separate calculations and take the larger one, so difficulty actually comes from time, not from the ball's position.

Collision between the ball and platforms has a detail worth mentioning too: it uses a "swept interval" check instead of comparing instantaneous positions, because the ball can fall fast enough to skip clean through a thin 12px platform between two frames if you only compare `ball.worldY === platform.worldY`:

```javascript
const ballBottomPrev = prevY + BALL_RADIUS;
const ballBottomNew = ball.worldY + BALL_RADIUS;
if (ballBottomPrev <= p.worldY && ballBottomNew >= p.worldY && ...) {
    ball.worldY = p.worldY - BALL_RADIUS;
    ball.vy = -BOUNCE_VELOCITY;
}
```

Comparing "was the ball's bottom above the platform last frame, is it at or below the platform this frame" catches the case where the ball tunnels through a platform during one unusually long frame — say, a lag spike causing an abnormally large `dt`.

But the most interesting bug lived at exactly the first frame of every playthrough. Symptom: the run would end almost instantly after pressing Start — the ball bounces off the very first platform and immediately gets flagged as "left behind," even though the player never had a chance to make a wrong move. Working it out with the actual numbers: the ball starts at `worldY = 40`, the camera starts at `camera.y = 0`, and the first platform sits at `worldY = 110`. The moment the ball touches this platform and bounces with `BOUNCE_VELOCITY = 480` under `GRAVITY = 900`, the maximum height it reaches is `v² / (2g) = 480² / 1800 ≈ 128` world units above the bounce point — meaning the ball can rise as high as `worldY ≈ 110 − 12 − 128 = −30`. Meanwhile, at that exact moment `camera.y` is still practically 0, because `followTarget` is deeply negative at that point and can't pull the camera up, and the "mandatory drift" term has only accumulated a few pixels since the start. `screenY = ball.worldY − camera.y ≈ −30`, while the losing threshold is `screenY < −BALL_RADIUS × 2 = −24`. `−30 < −24` — the losing condition fires, even though this was a completely normal first bounce.

The fix was adding a constant, `DEATH_CHECK_MIN_DEPTH = 220`, and gating the losing condition behind it:

```javascript
if (maxDepth > DEATH_CHECK_MIN_DEPTH && screenY < -BALL_RADIUS * 2) {
    triggerGameOver("Bạn đã bị bỏ lại phía sau!");
    return;
}
```

Skip the "left behind" check entirely until the ball has descended at least 220 depth units — enough for the camera to move past its `y = 0` starting state and settle into steady-state chase mode, the regime where the `Math.max` formula actually reflects the intended design. The takeaway here is a good one: a formula that's mathematically correct in steady state can be entirely wrong for the first few frames, while the variables haven't yet reached the values the formula implicitly assumes. `camera.y = Math.max(...)` isn't wrong anywhere — it just hasn't had enough time for the "mandatory drift" term to catch up to reality yet, and the bug only shows up in the very first frame of every single run, a razor-thin window that every playtest walks straight through without any way to avoid it. A "first frame" bug like this is exactly the kind that's easiest to miss when testing by playing repeatedly, because a tester's instincts naturally focus on the middle and end of a run, not the very first second.

`DEATH_CHECK_MIN_DEPTH` is a pragmatic patch, not a real fix — it works, but it's fundamentally "delaying" the problem rather than removing the root cause, which is the camera not having started up yet. A more "natural" fix would probably be a time-based invulnerability window at the start of a run (the way Space Impact gives 1.2 seconds of invulnerability after losing a life) instead of gating on depth — since the underlying bug is really a startup-timing problem, not a spatial one. And with 220 chosen somewhat arbitrarily, anyone tweaking `BOUNCE_VELOCITY` or `GRAVITY` later would likely need to recompute that number from scratch.

Rapid Roll proves something counterintuitive: the fewer mechanics a game has, the easier it is to hide a mathematical blind spot nobody notices — because there's less surface area to look at, so both the person writing the code and the person testing it default to assuming "there's probably nothing complicated here." This instant-loss bug wasn't hiding in a complex loop or a tangled collision condition — it lived in the exact moment two variables (`camera.y` and `ball.worldY`) hadn't yet caught up to the implicit assumptions baked into the formula that computes them. One constant, a few lines of comment, and the bug was gone — but the more interesting part is that the commit adding that constant left behind enough of a trail that, without being there when it happened, the math behind it could still be reconstructed exactly.

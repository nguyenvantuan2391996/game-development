# Brick Breaker: a two-hit brick that pays out more than it should

Brick Breaker is the second game in my "handheld brick game" lineup, right after Tetris. Mechanically, it's one of the oldest and simplest genres in game history: a paddle, a ball, a grid of bricks — nothing left to reinvent. But precisely because there's "nothing left to reinvent," every small decision — how many points a tough brick should be worth, how many collisions get processed in one frame — is easy to breeze past without thinking twice. And one of those breezed-past decisions ended up creating a scoring rule nobody intended: a two-hit brick pays out more than 50% extra compared to two one-hit bricks combined.

This game inherits almost the entire rectangle-collision physics skeleton from Rapid Roll — the "swept collision" technique that keeps fast-moving objects from tunneling through at high speed. The difference here is a static grid of objects (bricks) instead of a moving one (the floor), and the ball needs to bounce along the correct axis depending on which edge of the brick it hit. Figuring out which axis to bounce along reuses the same "closest point on a rectangle" technique used for wall collisions in Rapid Roll, except this time it has to *decide* the bounce axis rather than knowing it ahead of time, since a brick can be hit from any of its four sides:

```javascript
const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
const dx = ball.x - closestX;
const dy = ball.y - closestY;
if (dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS) {
    if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx = -ball.vx;   // hit the left/right edge
    } else {
        ball.vy = -ball.vy;   // hit the top/bottom edge
    }
}
```

Comparing the magnitude of `|dx|` and `|dy|` tells you which axis the ball is offset more along, relative to the closest point on the brick — and that's the axis to flip. It's an approximation, not an exact solve of the true collision angle, but it's simple, fast, and correct in the overwhelming majority of real Breakout situations. On the paddle side, the bounce angle depends on where the ball hits — clipping the edge sends it off at a steep angle, hitting the center sends it nearly straight up — giving the player a way to "steer" the ball even though the ball itself has no direct input beyond moving the paddle:

```javascript
const hitPos = clamp((ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2), -1, 1);
const angle = hitPos * BALL_MAX_BOUNCE_ANGLE - Math.PI / 2;
```

`hitPos` normalizes to the range [-1, 1] based on how far off-center the ball landed, multiplied by the maximum allowed bounce angle, then offset by -90° (straight up). It's a genre-classic mechanic, but writing it out by hand for the first time was still satisfying to watch work correctly on the very first try.

What I didn't see coming was hiding in the part that looked simplest: scoring. A tough brick (2 hit points) fades its opacity after the first hit to signal "one more to go," and each hit adds to the score:

```javascript
brick.hp -= 1;
if (brick.hp <= 0) {
    brick.alive = false;
    score += brick.score;                      // broken: full points
} else {
    score += Math.floor(brick.score / 2);       // first hit: half points
}
```

I found this while rereading the code to write this post, not while playing — the score difference isn't obvious enough to notice by feel in a normal round. Working through actual numbers: a top-row brick (`brick.score = 60` at level 1) pays exactly 60 points when a one-hit brick of that value breaks. A tough brick in the same row, broken over two hits, pays out: hit 1 — `Math.floor(60/2) = 30` points (not broken yet, just hit), hit 2 — broken, and it adds the *entire* 60 points, not the remainder. Total: `30 + 60 = 90` points — 1.5x a normal brick of the same value, for the cost of exactly one extra ball hit.

Is this an actual bug? In terms of "does it break the game" — no, it runs fine, scores stay positive, nothing overflows. But going by intent, the original idea was likely "the points for the final hit should be whatever's left, not the full amount again" — in which case the correct formula would split `brick.score` into two pieces that sum back to the original value. The way it's actually written accidentally turns "tougher" into "disproportionately more rewarding" — a tough brick is both harder to break *and* worth more per point, a coincidence that benefits the player but wasn't clearly intentional. I haven't fixed it in the current version — the magnitude (an extra 50% on one brick out of 48 per grid) isn't large enough to break overall balance, and experience-wise, "tough bricks are worth more" isn't really a bad thing for the player.

The lesson here is fairly concrete: scoring formulas built event by event — each collision adding points independently — can very easily sum to something different from what "points for breaking the brick" was supposed to mean, if nobody adds it up by hand. This is the kind of bug, or at least unintended behavior, that only shows up when you do the actual arithmetic on paper — it doesn't show up reading the code line by line, since each line is correct in the sense that it does exactly what it says, it's just that the sum of them doesn't match the original intuition.

One more thing I noticed on rereading: paddle collision only checks the ball's instantaneous position at the end of a frame — there's no "swept collision" the way there is for floor collision in Rapid Roll. At the ball's current speeds, it still moves much slower than the effective thickness of the collision strip, so I've never actually observed the ball tunneling through the paddle in practice — but that's a safety margin that keeps shrinking every time a future difficulty pass raises the ball's max speed, not a guarantee that holds forever.

Brick Breaker is proof that a genre "solved since the 1970s" can still hide something interesting if you look closely enough — not in the bounce physics, which was correct from the start, but in how small per-event score numbers, added up across many discrete hits, can produce a total nobody deliberately wrote down. This bug is harmless, even favorable to the player — but it's a reminder that "each line is correct" doesn't automatically guarantee "the total behaves as intended," especially for any system that accumulates a value across many separate calls.

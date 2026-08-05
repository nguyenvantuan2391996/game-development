# Basketball: a backboard that only blocks balls coming from one direction

The backboard in this game is a thin 4px rectangle standing right behind the rim. For every normal shot — the ball arcing from the bottom-left up toward the top-right, bouncing off the board, dropping through the hoop — it works perfectly, as smooth as the original arcade game. But going back over the code after finishing the game, reconstructing the actual coordinates on the 360px-wide court, I found that the backboard doesn't actually cover the full gap between itself and the right wall — there's a fairly wide opening behind it. And the collision check only handles one direction of travel: the ball approaching *toward* the board, not the ball flying *out* from behind it.

Basketball is the third game in my "Brick Game" series, after Tetris and Brick Breaker. Control-wise, it goes back to the same drag-aim-release mechanic I used for Pocket Carrom — pull away from the ball to set direction and power, release to shoot — but unlike Pocket Carrom (where a single shot can affect multiple pieces at once, which is why it splits aiming and firing into two steps), here I kept the fire-on-release behavior, since a basketball shot only ever happens once, decisively, per turn — there's no need to adjust mid-shot.

The technique I'm happiest with in this game is how it detects a made basket, reusing the same crossed-a-threshold idea I used for floor collision in Rapid Roll: instead of comparing the ball's instantaneous position, it checks whether the ball crossed the rim's horizontal line between two consecutive frames.

```javascript
const crossedDown = ball.prevY < HOOP_Y && ball.y >= HOOP_Y;
if (crossedDown && ball.vy > 0 && Math.abs(ball.x - HOOP_X) < scoreZoneHalf) {
    ball.scored = true;
    ...
}
```

This avoids the case where the ball just happens to sit exactly at `y === HOOP_Y` without actually passing through it in either direction — if the check only compared `ball.y === HOOP_Y`, an unusually large `dt` on a slow frame could easily jump right over that exact value and never match. The rim itself isn't modeled as a single circle either — it's two small posts a fixed distance apart, plus a virtual "scoring zone" slightly narrower than the gap between them, so the ball has to pass through most of the rim's width to count, not just clip the edge.

Collision with the two rim posts uses the exact same circle-circle impulse formula I wrote for carrom pieces, just with a different restitution coefficient to match the feel of "bouncing off a metal rim":

```javascript
function bounceOffPost(postX, postY) {
    const dx = ball.x - postX;
    const dy = ball.y - postY;
    const d = Math.hypot(dx, dy) || 0.0001;
    const minDist = BALL_RADIUS + RIM_POST_RADIUS;
    if (d >= minDist) return false;
    const nx = dx / d;
    const ny = dy / d;
    ball.x = postX + nx * minDist;
    ball.y = postY + ny * minDist;
    const velAlongNormal = ball.vx * nx + ball.vy * ny;
    ball.vx -= (1 + RIM_RESTITUTION) * velAlongNormal * nx;
    ball.vy -= (1 + RIM_RESTITUTION) * velAlongNormal * ny;
    ball.touchedRim = true;
    return true;
}
```

Reusing techniques already proven in an earlier game got most of the physics here right on the first try. The one bug I found lives exactly in the part of this game that's genuinely new — the backboard, something that never existed in either Pocket Carrom or Rapid Roll:

```javascript
if (bdx * bdx + bdy * bdy <= BALL_RADIUS * BALL_RADIUS && ball.vx > 0) {
    ball.x = BACKBOARD_X - BALL_RADIUS;
    ball.vx = -Math.abs(ball.vx) * BACKBOARD_RESTITUTION;
    ball.touchedRim = true;
}
```

The condition `ball.vx > 0` — the ball moving rightward, i.e. approaching the board from the usual shooting direction — is required to trigger the collision at all. That's correct for the most common case: a diagonal shot from the bottom-left arcing up and to the right, bouncing off the board, dropping in. But work out the actual coordinates: `BACKBOARD_X = HOOP_X + RIM_WIDTH/2 + 8 = 284`, and the board is 4px thick, ending at `x = 288`. The right wall sits at `x = 360` — a 72px gap between the edge of the board and the wall, wide enough for the ball to slip through after bouncing off the right wall and flying back left, straight into the board's coordinate range from behind. At that point `ball.vx > 0` is `false`, and the entire backboard collision block gets skipped — the ball passes straight through a 4px-thick board as if it weren't there.

I haven't fixed this one. Getting the ball to bounce off the right wall and fly back exactly into that narrow strip behind the board requires a fairly specific angle and power — during normal playtesting (shooting from the bottom-left, with a trajectory naturally arcing toward the hoop) this situation essentially never comes up on its own. But it's a clear reminder: a collision condition written for the most common case is very easy to miss the rare case where the court's geometry accidentally leaves a path around the back of an obstacle. The safer check would drop the velocity-direction filter entirely and rely purely on geometric overlap — a board should block the ball from every direction it physically exists in, unless there's a deliberate design reason to only block one side.

Taken as a whole, Basketball is a pretty satisfying case study in reusing proven techniques: crossed-a-threshold detection from Rapid Roll, circle-circle impulse from Pocket Carrom, both correct on the first try. The highest risk always sits in the newest piece of code, the one that hasn't yet been tested against reality — here, a backboard designed to only be seen from one side, while the court's geometry quietly left a path around behind it.

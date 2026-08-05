# Beer Catch: a mug with an invisible strip of hitbox that doesn't belong to it

The mug in this game is drawn as two pieces: a rectangular body, and an arched handle sticking out on the right. Looks simple enough — but when I lined it up against the actual hitbox used to decide "did the player catch this or not," there's about a 10px gap on the right edge where nothing is actually drawn, yet it still counts as "within reach" of the mug. This wasn't something I noticed while playtesting. It came from sitting down and reading my own code with fresh eyes, as if seeing it for the first time.

Beer Catch isn't part of the "retro Nokia" or "Brick Game" lineups — it stands on its own, but runs on the same technical skeleton that's become the repo's default: canvas, IIFE, a `ready/playing/gameover` state machine, chip-style HUD, touch D-pad. The mechanic: a mug moves horizontally at the bottom of the screen, catching beers falling from above for points (gold beers worth more but rarer), dodging bad items — marked with a red X, like a "no entry" sign — falling at the same time. Looking at the function naming (`difficultyStep`, `rectsOverlap`) and the invulnerability-blink formula (`Math.floor(performance.now() / 100) % 2 === 0`), it's clear this game was built directly on the template that had already formed in Space Impact, just with a different theme and simpler falling objects.

The bug surfaced when I put the drawing code (`drawPlayer`) side by side with the collision code (`updateWorld`):

```javascript
// Drawing: the body is only PLAYER_WIDTH - 14 wide, shifted to the left
ctx.fillRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2, PLAYER_WIDTH - 14, PLAYER_HEIGHT);
// Drawing: the handle is an arc of radius 10, centered at (PLAYER_WIDTH/2 - 20, 0)
ctx.arc(PLAYER_WIDTH / 2 - 20, 0, 10, -Math.PI / 2, Math.PI / 2);
```

```javascript
// Collision: uses the FULL PLAYER_WIDTH, nothing subtracted
const playerLeft = playerX - PLAYER_WIDTH / 2;
rectsOverlap(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT, ...);
```

With `PLAYER_WIDTH = 74`, the body is drawn from `x = -37` to `x = 23` (a width of `74 - 14 = 60`, not `74`). The handle — an arc centered at `x = 17`, radius 10 — reaches at most `x = 27`. Add the stroke thickness (`lineWidth = 5`, roughly 2.5px on each side), and the farthest point of anything actually drawn on screen tops out around `x ≈ 29.5`. Meanwhile the hitbox uses the full `PLAYER_WIDTH = 74`, extending all the way to `x = +37`. That leaves a 7-10px strip along the right edge of the mug — inside the hitbox but completely empty visually — where a beer or a bad item falling into it still counts as "touched the mug," even though to the eye it's clearly falling through the empty space to the right, nowhere near anything actually drawn.

For good items, this is an accidental gift — the mug is easier to catch with than it looks. For bad items, it's an accidental penalty — losing a life despite what felt like a clean dodge. 7-10px on a 74px-wide mug is a fairly small margin, and since it cuts both ways — helping good catches while hurting bad-item dodges — the net effect on perceived fairness partly cancels itself out, though not entirely. The lesson here is pretty clear: when an asymmetric sprite (body shifted left, handle sticking out right but not far enough) gets assigned a perfectly symmetric rectangular hitbox sized off the same `PLAYER_WIDTH` constant, the gap between "what the player sees" and "what the code actually checks" doesn't automatically vanish just because both sides reference the same size constant. You have to measure what's actually drawn, not just read the variable name, to catch the real discrepancy.

There's another decision worth mentioning, less a bug and more a tradeoff that repeats throughout the whole repo: falling items are drawn as circles but collide as the square bounding box around them.

```javascript
const playerLeft = playerX - PLAYER_WIDTH / 2;
const playerTop = PLAYER_Y - PLAYER_HEIGHT / 2;

rectsOverlap(
    playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
    item.x - BEER_SIZE / 2, item.y - BEER_SIZE / 2, BEER_SIZE, BEER_SIZE
);
```

A square circumscribing a circle has about 27% more area, and its four corners reach `√2` times farther from the center than the circle's radius — meaning an object that "looks round" on screen can still be caught or dodged right at its invisible corners, well outside the visible round edge. I used this exact simplification for bullets and enemies in Space Impact, so it's a deliberate repeated pattern across the repo rather than a mistake unique to this game — but in Beer Catch, where the player's core skill is lining up the mug precisely by eye, this geometry-vs-hitbox mismatch bites into the feeling of fairness more directly than it does in other games where collision is just one mechanic among many.

One design detail I'm happy with on rereading: the two spawn streams (good items and bad items) are entirely independent, with zero coordination over when a beer falls versus when a bad item falls — they only overlap by chance. Building a system to deliberately coordinate or avoid overlapping spawns would be far more complex than the payoff justifies for a game this mechanically simple, so keeping the two streams independent was the right call.

Beer Catch is a clean example of a bug that makes no noise at all: no crash, no wrong score displayed, nothing complaining in the console — just a vague feeling of "I'm pretty sure I dodged that and still lost a life," which nobody, not even the person who wrote the code, can confirm without sitting down and measuring the actual numbers. Reading a game you wrote a while ago with genuine curiosity, rather than the assumption that it's correct, turns out to be a useful way to catch exactly this class of bug — the kind that only surfaces when someone actually stops to compare what's drawn against what's checked, two things you'd assume always travel together but that nothing guarantees except the discipline of whoever wrote them.

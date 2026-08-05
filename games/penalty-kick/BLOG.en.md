# Penalty Kick: a ball that flies in a perfectly straight line, and a difficulty ceiling that never touches 100%

While planning this game, I originally pictured a specific detail: the ball, flying from the penalty spot into the goal, would lift slightly along a gentle arc to mimic the real height of a shot, and shrink a touch as it traveled to sell the sense of perspective. Rereading the actual line of code that moves the ball in the finished version, neither detail is there — the ball travels along a perfectly straight line, linearly interpolated from the kick point to the aim point, no curve, no scaling. This is the fourth game in my Brick Game series, and the most interesting story here isn't a bug — it's the gap between an idea sketched out in planning and what actually ended up in the final JavaScript file.

Penalty Kick is a "penalty shootout" variant — a completely different ruleset from the earlier games in the same series. No continuous gravity physics, no bouncing collisions — each turn is a single decision (where to aim in the goal), then wait to see if the keeper guesses right. In essence, this is the most "probability-driven" game in the whole series, one where the game's sense of fairness rests entirely on a simple probability formula, not on physics or reflexes.

The central design decision is the keeper's guess-probability formula — not fixed, but increasing with the current scoring streak:

```javascript
const guessChance = Math.min(MAX_GUESS_CHANCE, BASE_GUESS_CHANCE + streak * GUESS_CHANCE_STEP);
```

With `BASE_GUESS_CHANCE = 0.26`, `GUESS_CHANCE_STEP = 0.03`, `MAX_GUESS_CHANCE = 0.68`, the keeper starts by guessing correctly only 26% of the time, gains 3% per consecutive goal, and hits a 68% ceiling after exactly 14 goals in a row. There's a notable mathematical consequence this design deliberately accepts: a 68% ceiling means the keeper never guesses right more than 68% of the time, no matter how long the streak runs — in theory, an infinite streak is fully possible, just exponentially less likely with each attempt. This isn't an oversight, it's a deliberate choice: a difficulty ceiling that never reaches 100% keeps the streak theoretically continuable forever, just increasingly hard, instead of drawing a hard line no player can ever cross.

How the keeper picks which zone to dive into is also worth a look, because it cleanly separates two different questions: "does the keeper guess correctly at all," and "if not, which zone does it pick":

```javascript
const guessChance = Math.min(MAX_GUESS_CHANCE, BASE_GUESS_CHANCE + streak * GUESS_CHANCE_STEP);
let diveIndex;
if (Math.random() < guessChance) {
    diveIndex = targetIndex;
} else {
    const others = [0, 1, 2, 3, 4, 5].filter((i) => i !== targetIndex);
    diveIndex = others[Math.floor(Math.random() * others.length)];
}
```

The keeper rolls a probability first to decide "do I guess correctly," and only picks randomly among the other five zones when that roll fails. This cleanly isolates "the keeper's skill" — a single probability number — from "which wrong zone the keeper dives into," meaning you never need a complex decision system just to make the opponent feel like it's getting smarter as the streak grows.

The ball's flight and the keeper's dive animation stay in sync by driving both off the exact same `t` value, computed from a single fixed 550ms duration:

```javascript
if (phase === "animating") {
    animTimer += dtMs;
    const t = clamp(animTimer / KICK_DURATION_MS, 0, 1);
    const target = zoneCenter(kickTargetIndex);
    ball.x = lerp(ball.startX, target.x, t);
    ball.y = lerp(ball.startY, target.y, t);
    keeper.x = lerp(keeper.startX, keeper.targetX, t);
    keeper.y = lerp(keeper.startY, keeper.targetY, t);
    if (t >= 1) resolveKick();
}
```

Both motions are "point A to point B in exactly 550ms" — no separate physics system needed, just one shared `lerp` function evaluated at the same `t` for both, guaranteeing they always stay in lockstep. There's no way for the keeper to "finish" before or after the ball arrives, since both always reach their destination on the exact same frame — the moment `resolveKick()` finally gets called to decide the outcome.

Back to that perfectly straight trajectory — here's the actual line in `updateWorld`:

```javascript
ball.x = lerp(ball.startX, target.x, t);
ball.y = lerp(ball.startY, target.y, t);
```

There's no height adjustment of the kind you'd get by subtracting a sine curve to create a "lift then drop" arc — the formula commonly used elsewhere in this repo for throwing/kicking games, like a basketball trajectory driven by real gravity — and no scaling of the ball as it travels to fake receding perspective. Both ideas were part of the original plan but never made it into `drawBall()` in the finished version, where the ball is always drawn at a fixed radius. The game still works correctly, the animation is still smooth, the player still clearly understands where the ball is flying from and to — it's just missing one layer of visual seasoning. Nothing is broken, it's just a scope cut that happened somewhere along the way, most likely a matter of priority: a single kick lasts only 550ms, and at that speed, the difference between "flies straight" and "flies with a gentle arc" is much harder to notice than, say, a basketball arc that plays out over a full second with a visible peak.

What I find interesting about spotting this gap is: not every detail in an original plan is actually necessary once you sit down to write the thing, and a detail "disappearing" between the plan and the finished product isn't automatically a sign of carelessness. It can just be a natural reprioritization that happens while writing code — the only problem is nothing records that decision as it happens, which means rereading the code later is the only way to discover the gap ever existed.

There are two other choices worth calling out — not really bugs, more debatable design calls. First, there's no way for the player to know the keeper's current guess-probability ahead of time — `guessChance` is a fully hidden internal number, and the player only vaguely senses "the keeper seems to be saving more now" through experience, with no visual indicator in the HUD reflecting that number climbing. For a mechanic where the entire difficulty curve lives in exactly one number, hiding it completely from the player is a defensible but debatable choice — surfacing part of it could make the game feel more transparent and fair. Second, the keeper has no "tendency" at all when guessing wrong — it picks uniformly at random among the five remaining zones, simpler to write, but it also makes the keeper's behavior feel a bit mechanical once you've played long enough to notice there's no pattern whatsoever to its wrong guesses.

Penalty Kick is the leanest game, code-wise, in my whole Brick Game series, and true to form, no real bug turned up on a reread — instead, what turned up was a small gap between what I'd pictured while planning and what actually exists in the finished version. Not every slip is as loud as an exception in the console — sometimes it's just an "I meant to add this" that quietly disappears somewhere between planning and typing, and it only surfaces when someone comes back and asks the right question: is this actually in the code, or was it only ever in the plan?

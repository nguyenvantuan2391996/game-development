# Pooyan: the falling rock can never actually reach you, no matter what the screen says

The start screen for this game says clearly: "Shoot down balloons and falling rocks, don't let them touch you!" — two threats, one warning. But tracing through the exact coordinates where rocks spawn, and the exact motion formula that moves them every frame, reveals something nobody noticed: the rock can never, under any circumstance, actually reach the player. Not because it moves too slowly or is too easy to dodge — because the horizontal distance between where a rock is allowed to spawn and where the player stands is always greater than the distance at which two objects are considered to be touching, and the rock never moves horizontally for its entire lifetime.

Pooyan in my repo is a clone of the arcade game of the same name — an archer standing fixed on the left side of the screen, shooting arrows to the right to take down two kinds of targets: balloons drifting in from the right along a sine wave, and rocks falling straight down from the top. This is also the game I used as the original template for a lot of the canvas games I built afterward (Space Impact, Fly Swatter, and Beer Catcher all borrow the state machine, `rectsOverlap`, and `difficultyStep` structure from here) — which makes finding a collision gap right in this original template particularly notable, since that structure has been trusted and reused many times without anyone questioning the specific numbers behind it.

The core difference between the two threat types comes down to exactly one detail of motion:

```javascript
// Balloons: x DECREASES over time — actually advances toward the archer
balloons.forEach((b) => {
    b.elapsed += dt;
    b.x -= b.speed * dt;
});

// Rocks: only y INCREASES — x stays fixed for its whole lifetime, never gets closer to the archer
rocks.forEach((r) => {
    r.y += r.speed * dt;
});
```

Balloons have a motion axis (`x`) pointed straight at the archer standing fixed on the left — they literally "get closer" every frame. Rocks don't: their `x` coordinate is locked in at spawn time and never changes; only `y` moves as they fall. With an archer that only moves vertically at a fixed `x` position, two objects can only collide if their `x` ranges have ever overlapped at some point in time — and for a rock, that has to be true right at the moment it spawns, since `x` never changes afterward.

Here's how rocks get spawned:

```javascript
function spawnRock() {
    const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
    rocks.push({
        x: randomBetween(PLAYER_X + 60, GAME_WIDTH - ROCK_SIZE),
        y: -ROCK_SIZE,
        speed: randomBetween(ROCK_SPEED_MIN, ROCK_SPEED_MAX) + bonus,
        alive: true,
    });
}
```

The spawn range `PLAYER_X + 60` was almost certainly chosen for a reasonable reason at the time: to keep rocks from spawning right on top of the archer's position — a "die instantly on spawn" bug that's entirely possible without that buffer. But that 60px buffer, combined with rocks never moving horizontally after spawning, quietly pushed collision out of reach permanently — not just avoiding the "dies instantly on spawn" case, but eliminating every possibility of collision for the entire lifetime of the rock.

Running the actual numbers makes it obvious: the archer has `PLAYER_X = 46`, `PLAYER_SIZE = 30`, so its collision box spans from `x = 31` to `x = 61`. Rocks spawn at `x = randomBetween(106, 334)` with `ROCK_SIZE = 26`, so even the closest possible rock (`x = 106`) has a collision box spanning `93` to `119`. The archer's furthest-right edge is `61`; the closest-left edge any rock can ever reach is `93`. The minimum gap between them — 32 pixels — never closes, because a rock's `x` coordinate never changes from spawn until it falls off the bottom of the screen and gets removed from the array. `rectsOverlap` between the archer and any rock, at any point in that rock's life, will always return `false`.

The result is that falling rocks in this game are a purely decorative threat — they fall, they can be shot down for 60 points, but they can never cost the player a life, whether the archer stands still or moves constantly, no matter how high the difficulty has climbed. All the real risk in a run comes from balloons — the only thing actually moving toward the archer. What's interesting is that nobody noticed this while playtesting, because falling rocks still *look* dangerous — they fall fast, they appear suddenly, and the natural instinct is to dodge their path even when it's unnecessary. The feeling of "I just dodged a rock" is entirely possible to have even though, mathematically, that rock was never capable of reaching the archer in the first place — an illusion of risk, not real risk.

The lesson here is a fun one: collision between two objects doesn't just depend on whether the collision-check function is correct — it depends on whether the coordinate data fed into it ever actually reaches the overlap condition. `rectsOverlap` here is entirely correct; the problem isn't in the check logic, it's in the geometry of the whole system that generates data for it. A safety buffer (avoiding spawning on top of the player) and a distance that eliminates collision entirely are very different in magnitude, but easy to mistake for the same kind of safe decision if you're eyeballing it on a screen mockup instead of running the actual numbers.

Pooyan is the original template for a whole line of canvas games in my repo, and most of what it left behind — the state machine, AABB collision, escalating difficulty — has held up solidly and been reused safely many times since. But this very original happens to hold one of the clearest findings from rereading the whole set of games — not a subtle race condition or a confusing closure, but a simple distance calculation nobody had actually done: once you run it, the numbers 61 and 93 say everything. Sometimes the biggest bug doesn't need a complicated debugging session to find — it just needs someone to sit down, write two numbers next to each other, and ask whether they could ever actually meet.

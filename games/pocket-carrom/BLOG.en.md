# Pocket Carrom: "drag and release to shoot" turns out to be a bad idea on a phone

The first version of Pocket Carrom had exactly one way to shoot: drag the striker away from the direction you wanted to shoot, release, and the ball fires instantly — the same slingshot mechanic used in countless mobile games. On a mouse, it's smooth and intuitive. But it has a flaw that only shows up once you seriously think about a real finger on a touchscreen: the finger covers exactly the spot being dragged, and once it lifts, the shot has already fired — no "wait, let me adjust the power a bit" moment before committing. The latest version of this game no longer fires on release — dragging is now purely for aiming, a separate slider handles power, and a dedicated "SHOOT" button confirms the shot.

Pocket Carrom is the third game in my "nostalgic Nokia" series — after Space Impact and Rapid Roll — but it's different from the previous two in one key way: it's not a direct remake of a specific handheld game, it's an actual physics carrom board where the player takes turns against the CPU. It's also the most physics-heavy game in the series up to that point — not just one ball bouncing off walls like Rapid Roll, but 19 pieces (18 regular coins plus 1 red queen) plus a striker, all capable of colliding with each other in overlapping ways during a single shot.

The biggest departure from the original design is decoupling "aim" from "fire" completely, spelled out right in the comment at the top of the file:

```javascript
// Aiming is decoupled from firing: dragging the striker (or the power
// slider) only updates the locked-in aim/power; the shot only actually
// fires when the "Bắn" button is pressed. This gives touch players a
// second, more forgiving chance to fine-tune power before committing,
// instead of having to nail direction+power in one continuous drag.
let aimReady = false;
let aimDirX = 0;
let aimDirY = -1;
let shotPower = 0.5;
```

`pointerup` on the canvas no longer sets velocity directly — it just computes `aimDirX`/`aimDirY`/`shotPower` from the drag vector and flips `aimReady = true`, syncing the value onto the power slider. Actual velocity only gets assigned to `striker.vx`/`striker.vy` inside `fireShot()` — the one function wired to the shoot button's click event. Players can redrag as many times as they want, adjust the slider, and study the color-coded aim line before actually committing. This was the biggest single change in the whole build, and it happened after the first version was already fully working — not because anything was broken, but because the touch experience simply wasn't good enough yet.

The core physics is worth a mention too. Three independent functions form the base: `applyFriction` decelerates pieces linearly (not as a percentage, so every piece comes to rest after roughly the same amount of time regardless of starting speed), `handlePocketsAndWalls` checks for pocketing before wall reflection — an ordering that matters, since a piece near a pocket shouldn't get "bounced" back by wall logic — and `resolveCollision` separates overlapping positions by inverse mass ratio, then applies impulse based on a restitution coefficient. Mass is derived from radius squared (the striker is heavier than a regular coin so a shot actually pushes other pieces around), a reasonable physical approximation that avoids needing a separate `mass` field to keep in sync by hand.

The piece layout has a small detail I'm fairly happy with:

```javascript
for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    combined.push({ x: center.x + Math.cos(angle) * ring1Radius, ... });
}
for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 6) * i - Math.PI / 2 + Math.PI / 12;
    combined.push({ x: center.x + Math.cos(angle) * ring2Radius, ... });
}
```

Six pieces on the inner ring spaced 60° apart, twelve on the outer ring spaced 30° apart and phase-shifted 15° from the inner ring — so no outer piece lines up radially with an inner one, matching how real carrom boards are set — then colors alternate white/black by index across the combined array, guaranteeing exactly 9 white and 9 black without hand-counting anything.

The CPU AI uses the classic "ghost ball" technique from billiards and carrom: compute the point the striker needs to touch to send the target piece toward a pocket, then aim the striker at that point — much simpler than solving the collision equations backward. But the AI doesn't play perfectly — after computing the shot direction, it rotates the vector by a small random angle using a hand-rolled 2D rotation matrix, so the CPU has a reasonable chance of missing. Without that, a ghost-ball AI with zero error would be nearly unbeatable. One thing I never got around to fixing: the AI always aims at the closest piece to any pocket without checking whether another piece blocks the shot line — rarely visible in practice since the board opens up after the first few turns, but in theory the CPU can absolutely try to "shoot through" a blocking piece without realizing it.

Rereading `handlePocketsAndWalls` to write this post, I suspected a hidden bug: pockets sit exactly at the four board corners, right where two walls meet — a piece flying near a corner but not quite close enough to the pocket center to get "swallowed" would land in a zone that's simultaneously near the pocket and touching both walls. Do those two checks fight each other? Turns out no — the function returns immediately once it finds a piece that pocketed, and the entire wall-check block sits after that loop in the same function, so if a piece pocketed, the code never reaches the wall-reflection logic in that same call. The only case that can feel "off" is a piece skimming right past the pocket lip without meeting the pocketing threshold — it bounces off the wall normally, exactly as intended, not a bug. Still worth chasing down to confirm, since early-return logic across mutually exclusive conditions in one function is exactly the kind of thing that's easy to accidentally break if someone inserts a new branch in the middle later and forgets to preserve that ordering.

The carrom rules are also deliberately simplified — no "covering" the queen (due); pocketing the red queen just adds points immediately, with no requirement to immediately pocket a regular piece afterward to "lock in" the queen's score the way real carrom requires. That choice keeps the rules understandable in a few seconds of reading, at the cost of the red queen not carrying the same "high risk, high reward" tactical weight it has in real carrom.

The biggest story here isn't the collision physics, even though that's the most complex part of the code — it's that the input design had to get rewritten after it was already "done," not because it had a bug, but because it wasn't good enough for the actual people who'd be touching it with a finger instead of a mouse cursor. A control scheme that "works correctly" and one that "feels correct" turn out to be two different bars to clear, and only the second one actually decides whether a game is comfortable to play on a phone.

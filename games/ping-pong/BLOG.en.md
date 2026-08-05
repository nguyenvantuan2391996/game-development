# Ping Pong: adding a 2-player mode quietly brought back the physical keyboard

Every game in my "Brick Game" series was built around one guiding rule: it has to be playable with a thumb on a phone, not just a keyboard. Space Impact has a touch D-pad, Rapid Roll has a touch D-pad, Breakout has a touch D-pad — Ping Pong did too, from its very first version, with the player controlling the bottom paddle and a simple AI tracking the ball for the top one. But when I added a "2 players, same keyboard" mode later, it created a consequence nobody set out to design: that mode, by its very nature, cannot be played on a phone.

Ping Pong is the last of the five "Brick Game" titles (Tetris → Breakout → Basketball → Soccer → Ping Pong), and the original Pong it's modeled after was, from the start, a two-player game — it predates the very idea of "playing against a computer" in the industry. Bringing back a 2-player mode felt almost mandatory to make the game feel true to its roots: pick the mode right on the home screen, Player 1 uses the arrow keys, Player 2 uses A/D, both sitting at the same machine.

What I like most about how the new mode got wired in is how minimal the change actually was. All the ball physics, paddle collisions, and scoring stay 100% identical between modes — only the input branch differs:

```javascript
if (mode === "2p") {
    if (keys.ArrowLeft) playerPaddle.x -= PLAYER_SPEED * dt;
    if (keys.ArrowRight) playerPaddle.x += PLAYER_SPEED * dt;
    if (keys.a || keys.A) cpuPaddle.x -= PLAYER_SPEED * dt;
    if (keys.d || keys.D) cpuPaddle.x += PLAYER_SPEED * dt;
} else {
    if (keys.ArrowLeft || keys.a || keys.A) playerPaddle.x -= PLAYER_SPEED * dt;
    if (keys.ArrowRight || keys.d || keys.D) playerPaddle.x += PLAYER_SPEED * dt;
    // ... AI tracks ball.x to move cpuPaddle ...
}
```

In CPU mode, A/D still control the player's paddle, doubling up with the arrow keys — a familiar dual-binding pattern. In 2p mode, the two key sets split cleanly to drive two independent paddles, same `keys[...]` object, same `if` structure, just assigned to a different paddle. Because of that split, any bug in the ball physics gets fixed once for both modes — there's no second copy of the core logic to keep in sync.

The more interesting part wasn't in the code at all — it surfaced when I reread the whole flow to write this post. In 2-player mode, the touch D-pad gets hidden entirely, replaced by a line of instructional text:

```html
<div class="touch-controls" id="touch-controls">
    <div class="dpad dpad--horizontal">...</div>
</div>
<div class="two-player-note" id="two-player-note" hidden>
    Chế độ 2 người: Người 1 dùng ◀ ▶, Người 2 dùng phím A / D
</div>
```

```javascript
if (mode === "2p") {
    ...
    if (touchControls) touchControls.style.display = "none";
    if (twoPlayerNote) twoPlayerNote.hidden = false;
    ...
}
```

Nothing here is technically wrong — no bug, nothing broken. But it means 2-player mode, on an actual phone, simply cannot be played: no physical keyboard, no touch fallback, just a line of text referencing keys that don't exist on a touchscreen. This is a gap that runs through the whole project — every other game has a touch control scheme, but the same-keyboard 2-player feature quietly reintroduces the exact "player has a physical keyboard" assumption this whole series was built to get rid of.

This isn't a technical bug you fix with one line of code. The very concept of "two people sharing one keyboard" assumes a physical keyboard exists to share — without one, the concept simply has nothing left to mean. A feature can be entirely correct within the scope it sets for itself (two people, one keyboard, one machine) and still create a gap once you hold it up against a broader design principle for the whole project. There's no specific bug to point at and fix here — just an open design question: making 2-player work on a single phone would require rethinking the input scheme from scratch (splitting the screen into left/right touch zones, for instance), not just hiding the D-pad and printing a note.

There's a smaller debt I left behind in the code too: the `cpuPaddle` variable keeps its name even in 2-player mode, where it has nothing to do with a "CPU" anymore — it's Player 2's paddle. Reading `if (keys.d || keys.D) cpuPaddle.x += PLAYER_SPEED * dt;` in the 2p branch requires the reader to remember that, in this context, `cpuPaddle` is actually a human's paddle. Renaming it to something neutral like `topPaddle` or `opponentPaddle` would read correctly in both modes, but at the time I chose to reuse the existing variable to move faster, trading a small naming debt for speed.

Adding 2-player mode to Ping Pong was an almost obvious decision, and most of the technical work — splitting the input branch, keeping the physics untouched — went smoothly without any real bugs. What's more interesting is a side effect nobody designed on purpose: a design principle that runs through the entire project ("playable on a phone") and a feature that's entirely correct within its own scope ("2 players, shared keyboard") turn out to collide at exactly one point that no small tweak can resolve. Not every design question has a ready answer waiting to be found — some are just genuinely unresolved yet.

# Fly Swat: when "the game doesn't run" turns out not to be the game's fault

Tap the Start button, the overlay disappears exactly as expected — and then nothing happens. No insects show up. The countdown sits frozen at "45s" for two seconds, then three, then eight. No errors in the console. `overlay.hidden` is correctly `true`. Everything *looks* like it ran, but the game state is completely frozen. This is the point where a normal debugging session — rereading code, hunting for a typo — doesn't help, because the code isn't wrong.

Fly Swat came after the "retro Nokia" batch of games, when the ask was for a simple fly-swatting game: insects fly around randomly, change direction periodically, tap to swat them within 45 seconds, avoid wasps (which cost points), prioritize golden flies (worth more, but vanish fast). In terms of code, this is the simplest game in the whole batch — no bouncy physics, no AI, just a standard `requestAnimationFrame` loop identical to the pattern used in every other canvas game in the repo. So when it "didn't run" during a real-browser check, the first instinct was to suspect the game loop had some subtle bug — how much could possibly go wrong in something this simple?

Debugging it step by step: first, check the console for errors — nothing, no exception thrown. Next, suspect that `startGame()` never actually reached the `requestAnimationFrame(loop)` call at the end of the function — trigger the start button directly from the console, then check `overlay.hidden` again: still `true`, meaning `startGame()` had run to completion. So was `loop()` ever called for the first time? The problem is `loop()` lives inside an IIFE closure, so it can't be called directly from the console. The way to verify was to write a test completely independent of the game's own code:

```javascript
window.__rafCount = 0;
function tick() { window.__rafCount++; requestAnimationFrame(tick); }
requestAnimationFrame(tick);
```

Wait three seconds, then read `window.__rafCount` back — the result was 0. Not a small number, not "slow" — `requestAnimationFrame` had never once called `tick` back, despite being scheduled. Checking `document.hidden` and `document.visibilityState` confirmed the tab was in a `hidden` state. That was the answer: modern browsers fully pause `requestAnimationFrame` — not just throttle it, the way `setInterval` gets throttled — for tabs that aren't actually visible on screen, as a resource-saving measure. Standard, spec-compliant browser behavior, not a bug.

To make sure this wasn't specific to Fly Swat, I went back and opened a different game in the repo — one that had run smoothly during an earlier check in the same session — and ran the exact same test: `document.hidden` also came back `true`. The same phenomenon, showing up in a completely different game, confirmed this was a browser-layer or automation-layer issue with how the tab was being driven, not something in any individual game's logic. The tool being used to check the games in this session was driving a tab that wasn't actually in the operating system's foreground at that moment — even though it still received commands and could take screenshots normally (screenshotting doesn't depend on a tab being "visible" in the Page Visibility API sense). Per spec, `requestAnimationFrame` is never called back for a document in the `hidden` state.

There was nothing to "fix" in the game's code — this was never a Fly Swat bug. The workaround for verification was to call the event handlers directly (simulating `pointerdown` with a real `PointerEvent` dispatched to the actual DOM element) to confirm the game logic worked correctly, without depending on whether the browser would actually call `requestAnimationFrame` back in the test environment. The takeaway: when a "silent" symptom shows up — no error, no crash, just nothing happening — the first instinct is usually to reread the exact code under suspicion. But a faster, more reliable way to confirm is to isolate the variable: write a test completely independent of the game's code to answer "is the problem in my logic, or in the environment running it?" before spending time combing through innocent code.

Setting the debugging story aside, the most notable piece of actual game code is how hit detection walks the insect list in reverse:

```javascript
canvas.addEventListener("pointerdown", (e) => {
    if (state === "ready" || state === "gameover") {
        startGame();
        return;
    }
    const pos = canvasPosFromEvent(e);
    for (let i = insects.length - 1; i >= 0; i--) {
        const insect = insects[i];
        if (dist(pos.x, pos.y, insect.x, insect.y) <= insect.radius + CLICK_TOLERANCE) {
            killInsect(insect);
            break;
        }
    }
});
```

Insects drawn later sit visually "on top of" insects drawn earlier, since canvas paints in array order. When two insects overlap in position, walking backward from `insects.length - 1` down to `0` guarantees the one that gets hit is the one the player actually sees on top, not the one hidden underneath — a small detail, but if you walked forward instead, the player would experience "I clearly hit that fly but the game counted it as a miss," a particularly annoying kind of bug because it's a mismatch between what your eyes see and what the game logic decides.

The visual feedback layer is also worth mentioning for reusing one formula for two different effects: the particle burst on a hit and the floating score text both fade using the exact same `alpha = life / maxLife` formula:

```javascript
function killInsect(insect) {
    insect.alive = false;
    score = Math.max(0, score + insect.def.score);
    const label = insect.def.score >= 0 ? `+${insect.def.score}` : `${insect.def.score}`;
    const textColor = insect.def.score >= 0 ? "#4dff88" : "#ff5252";
    spawnParticles(insect.x, insect.y, insect.def.color);
    spawnFloatingText(insect.x, insect.y, label, textColor);
}
```

The score is also clamped to zero right at the point it's added (`Math.max(0, score + insect.def.score)`), so if a player keeps hitting wasps by accident, the displayed score never goes negative — a small detail that means "negative score" never has to be handled anywhere else in the code.

Looking back at the whole thing, the real lesson wasn't about game logic — that part was actually pretty tight and correct from the start. It's that "silent, no errors" doesn't mean "everything's fine." Sometimes it just means the problem lives at a layer you haven't thought to look at — not in the game loop, not in the hit-detection function, but in the quiet assumption that the browser will always call `requestAnimationFrame` back as reliably as promised. That assumption holds almost all the time a real player actually opens the game — it just happens to break in the exact environment being used to test it, a small but memorable irony, and the reason I now keep a standalone `requestAnimationFrame` test in my back pocket before ever suspecting my own code first.

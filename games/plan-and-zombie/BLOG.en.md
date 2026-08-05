# Plants vs Zombies: a sun's click handler references itself before it exists

```javascript
el.addEventListener("click", () => collectSun(sunObj.id));
boardEl.appendChild(el);

const sunObj = { ... };
```

Read top to bottom, the first line wires up a click handler that references `sunObj` — before `const sunObj` gets declared on the third line. Every instinct about how JavaScript reads code sequentially says this should throw `ReferenceError: Cannot access 'sunObj' before initialization` the moment it runs. But the game exists, it runs, and suns get collected just fine. This is the story of one line of code that looks wrong but runs correctly, thanks to a property of JavaScript closures that's easy to overlook.

Plants vs Zombies is structurally different from most other games in my repo in one important way: it doesn't use `<canvas>`. Every plant, zombie, projectile, and sun is a real DOM element (`<div>`), moved by changing `style.left`/`style.top` — closer to how Audition (the dance game) works than to the pixel-drawing approach most of my canvas games use. With a 5-lane board, multiple plants, multiple zombies, multiple projectiles active at once, each entity is its own DOM element with its own event listener — the object-lifecycle complexity (creating, updating, and removing things at the right time) runs noticeably higher than redrawing one canvas frame from scratch each tick.

My favorite design detail in this game is how falling suns are split into two independent tracks — a CSS animation (falling via `transition`) and a logical state machine (`falling` → `idle` → `gone`) that run in parallel without being hard-synced to each other:

```javascript
requestAnimationFrame(() => {
    el.style.transition = "top 2.4s linear";
    el.style.top = restTop + "px";
});

setTimeout(() => {
    if (sunObj.state === "falling") {
        sunObj.state = "idle";
        sunObj.idleSince = performance.now();
    }
}, 2450);
```

The fall animation (2.4 seconds, handled by CSS) and the switch to "idle" state (2.45 seconds, handled by `setTimeout`) are two separate numbers, only approximately equal rather than sharing a variable — offset just enough (50ms) to guarantee the CSS animation has definitely finished before the game logic treats the sun as "done falling, start counting toward disappearing." This is a spot where I took on a small debt on purpose: two constants describing the same duration but written in two different syntaxes (the CSS string `"2.4s"` and the number `2450`) are easy to let drift apart across future edits, if someone changes the fall time and forgets to update the other one.

But the most interesting thing I found rereading `spawnFallingSun` to write this post was in the function that spawns the sun in the first place:

```javascript
function spawnFallingSun() {
    ...
    const el = document.createElement("div");
    ...
    el.addEventListener("click", () => collectSun(sunObj.id));   // (1) references sunObj
    boardEl.appendChild(el);

    const sunObj = {                                              // (2) declares sunObj
        id: nextId(),
        el,
        state: "falling",
        idleSince: 0,
    };
    suns.push(sunObj);
    ...
}
```

Line `(1)` reads `sunObj` inside an arrow function — but at the moment line `(1)` actually executes (when `addEventListener` runs to register the handler), the arrow function itself hasn't run yet. It's just stored as a callback, waiting for an actual click event. `const sunObj` on line `(2)` runs right after, in the same synchronous pass through `spawnFallingSun`, completing before the function returns. Since a click event can only fire after a real user click — which happens far later than `spawnFallingSun` finishing its entire body — by the time the arrow function on line `(1)` actually gets invoked, `sunObj` has long since been fully initialized in its closure.

The JavaScript engine doesn't "compile" the whole function and check variable ordering before running it — it executes sequentially, and a closure only actually reads the value of a variable it references at the moment it's *called*, not at the moment it's *defined*. As long as nothing calls that arrow function before line `(2)` finishes running — and with a click event requiring real user interaction, that's essentially guaranteed — the code runs correctly every time.

Still, this is "correct by lucky timing" rather than "correct by clear structure." If someone later refactors `spawnFallingSun` — say, to call the click handler directly during initialization to simulate "auto-collect" for some kind of demo mode — without noticing the current declaration order, they'll immediately hit `ReferenceError: Cannot access 'sunObj' before initialization`, a bug that has nothing to do with the logic they just added and everything to do with a line-ordering decision made much earlier.

The lesson here isn't new but is always worth restating: JavaScript lets a closure "promise" to read a variable that doesn't exist yet at the point it's defined, as long as that variable exists by the time the closure is actually called — a powerful bit of flexibility that's also easy to misread when scanning code top to bottom. Declaring data first, then attaching event handlers that reference it, is always the safer habit — it wouldn't change runtime behavior here, but it would eliminate the possibility of some unrelated future change quietly turning "correct by lucky timing" into an actual bug.

One more small thing worth mentioning: when a zombie, plant, or sun gets removed via `el.remove()`, the listeners attached to it (like the click handler on a sun) never get explicitly detached with `removeEventListener`. That's fine — once an element is out of the DOM tree and no JavaScript reference points to it anymore, the browser engine garbage-collects it, listener and all. Still a spot where being explicit about cleanup would read better if I rebuilt it, but not an actual problem.

Plants vs Zombies is the most DOM-heavy, non-canvas game in the repo, and true to form for a codebase juggling many live DOM elements, most of the latent risk sits in object lifecycle management. The most surprising thing I found rereading the code wasn't a bug in the usual sense — it was a line that's entirely correct but written in an order that looks "wrong" to sequential-reading intuition. A good reminder that understanding closures properly isn't just theory — it's what actually decides whether a line of code that looks suspicious on a skim is a real bug or not.

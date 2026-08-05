# Rebuilding Audition Online in vanilla JavaScript: timing turned out harder than I expected

One evening I was testing the Beat-up mode — the one with 7 lanes running in parallel, each with an arrow drifting back and forth — right hand on the keys, left hand fumbling an Alt-Tab to check a Discord message. I came back to the tab about twenty seconds later to something strange: the music was still playing, the combo still showed the old number, but all seven arrows were frozen exactly where I'd left them, as if the game had paused — except I'd never touched Esc. I pressed an arrow key. Nothing. Waited another second. The arrows suddenly lurched forward in one jump, like a video fast-forwarding, then resumed normally.

Nothing crashed, the console was clean — which is the scary part. What I'd just walked into was the most classic trap in rhythm games: measuring time by counting how many times an interval fires, instead of measuring against a real clock. This whole game — 3 play modes, timing-based judgement scoring, a song-picker that turned out messier than I expected — is built on exactly that kind of timing, and it only shows a crack in one rare situation.

Arrow movement across all three modes works the same way: a `setInterval` that adds a fixed step to a position every time it fires.

```javascript
function startMoveLoop() {
  if (intervalID === null) {
    intervalID = setInterval(move, 0);
  }
}

function move() {
  // ...
  pos += increase;
  boxElement.style.left = pos + "px";
}
```

`setInterval(move, 0)` sounds like it should fire continuously, but browsers clamp the minimum delay to roughly 4ms, so in practice `move()` runs hundreds of times a second, adding 1px each call. This is easy to write and easy to reason about — no delta-time, no worrying about a zero `dt` on the first frame — but it carries a hidden assumption: arrow speed depends on how often the browser is willing to call `move()`, not on the actual clock. While the tab is active, the browser calls it steadily and everything feels smooth. But the moment the tab goes to the background, Chrome and every modern browser throttle `setInterval` down to about once a second to save battery — while an `<audio>` element that's actively playing is completely exempt from that throttle. The music keeps perfect time; the arrows nearly freeze, then lurch when the tab regains focus. This is a bug I know about but haven't fixed — switching to `requestAnimationFrame` plus `performance.now()`, combined with a `visibilitychange` listener, would fix it at the root, but it hasn't been worth the priority since players rarely Alt-Tab mid-round.

A second, sneakier bug lives in the gap between rounds. After you finish a key sequence with Space, the arrow box hides for 3 seconds before the next sequence appears. There were times I pressed an arrow key during that exact gap — a natural reflex when your hands are still moving fast — and it still got matched against the `listKeyRandom` of the sequence that had *just ended*, because the new sequence isn't actually generated until a separate `setTimeout` fires later. It isn't regenerated the instant the box hides. The fix was a simple flag:

```javascript
// True for the entire 3s gap where the box is hidden between rounds
// (whether the round ended via Space or timed out), so arrow-key presses
// during that gap don't get matched against the still-stale listKeyRandom
// (it isn't regenerated until pos next crosses 1150).
let isBoxHidden = false;

function compareKeyPressAndRandom(key) {
  if (isBoxHidden || listKeyPress.length === listKeyRandom.length) {
    return;
  }
  // ...
}
```

What I like about this fix is that the comment tells the whole story of the bug by itself — no need to reconstruct the past. The lesson generalizes well beyond this one case: whenever there's a time gap between a UI state changing and the underlying data actually catching up, that gap is exactly where race conditions live. You don't need to synchronize the two clocks — a plain flag telling the rest of the logic "don't trust this data right now" is enough.

The design decision I'm proudest of is reverse mode. It doesn't flip the entire key sequence at once — it mixes normal and reversed keys within the same sequence, with each key independently rolled as normal or reversed. All of that complexity fits inside one lookup table, without leaking into the control logic at all:

```javascript
const LIST_KEY_HAS_REVERSE_4K = [
  "right", "up", "down", "left",
  "right-reverse", "up-reverse", "down-reverse", "left-reverse",
];
const MAP_KEY_4K = new Map([
  ["right", "right"], ["up", "up"], ["down", "down"], ["left", "left"],
  ["right-reverse", "left"], ["up-reverse", "down"],
  ["down-reverse", "up"], ["left-reverse", "right"],
]);
```

The icon shown on screen is the "reverse" icon (say, a right arrow flipped), but the actual keyboard key you need to press is the opposite one — looked up through the `Map`. `compareKeyPressAndRandom` doesn't need to know anything about the concept of "reverse" at all — it just does a table lookup, the exact same code path as a normal key. It's a satisfying separation of data from behavior once you sit back and look at it — and it explains why `MAP_KEY_4K` existed from the very first stage of building this, even though at the time it looked redundant (mapping every key to itself).

The part I underestimated when planning, but which ate up nearly as much time as the gameplay itself, was the song-picker screen — three ways to choose a song: bundled defaults, Jamendo search, or a local mp3 from your own computer. Debugging the Jamendo integration taught me something I didn't expect: type in the name of a song you know exists, and sometimes the result comes back "No songs found" — type the exact same query again, and it works fine. I logged the exact URL being called and pasted it into the browser to test independent of my own code, and the behavior held: the same URL, called 10 times in a row, returned an empty result set about 3 times despite the data definitely existing. This wasn't a bug on my end — Jamendo (a free service with no SLA) occasionally returns empty for the exact same request it just answered correctly. The fix was to stop trusting an empty result immediately:

```javascript
// Jamendo's API returns an empty result set for a real query surprisingly
// often (~30% of the time in testing, even on identical back-to-back
// requests), so an empty response gets a couple of retries before we
// trust it as "no matches".
let tracks = await fetchJamendoTracks(query);
for (let attempt = 0; attempt < 2 && tracks.length === 0; attempt++) {
  tracks = await fetchJamendoTracks(query);
}
```

When you integrate a free third-party API with no SLA, "empty" and "doesn't exist" turn out to be two different things, and your code shouldn't collapse them into one just because the HTTP status came back fine. A related bug: typing a query, then correcting it almost immediately, sometimes made the screen flash results for the *old* query — because that request happened to respond slower and land after the newer one. I fixed it with an incrementing number acting like a lottery ticket for each search — only the request holding the latest ticket by the time it resolves is allowed to render. No `AbortController` needed; the stale request is simply left to finish on its own and quietly notice it's obsolete.

Not every decision here is one I'm proud of. The `getListKey` function — called every time a new key sequence needs generating — assigns a `random` function directly onto `Array.prototype`, meaning every new round overwrites a method shared by *every* array on the page, not just the local one inside the function. Luckily there's no `for...in` loop over an array anywhere in the codebase (I grepped to check), so the stray method stays invisible and harmless — but it's still the kind of code that's safe only until it isn't, say the day some other library also happens to define `Array.prototype.random`.

Going in, I assumed the hardest part of building a rhythm game would be the scoring formula — figuring out where Perfect, Great, and Cool should cut off so they actually *feel* right. It turned out that once I sat down and sketched the number line and the boundaries on paper, that part took one evening to get right. The time actually got eaten by two things I hadn't anticipated at all: keeping two independent browser clocks — audio and animation — in sync, and dealing with a third-party API that didn't behave the way its docs implied. Neither one is a "logic bug" in the usual sense — the code runs exactly as written, it's just that the outside world (a battery-saving browser, a free API with no guarantees) doesn't follow the implicit assumptions I made while designing it. Most of the hardest bugs, it turns out, don't live in your logic at all — they live at the boundary between your logic and the assumptions you made about everything outside it.

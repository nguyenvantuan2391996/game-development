# Teaching a snake to learn Snake with Q-learning, right in the browser

One night I left Snake's AI mode running on Turbo speed overnight, curious how far the snake would get after a few thousand "episodes." Opening the tab the next morning, the numbers looked good: epsilon had dropped close to its floor, average score per run was noticeably higher than the night before. Watching it play for a few more minutes, I noticed something odd: whenever the snake landed in a situation it had "never seen before," it always turned left. Not "usually" — always, 100% of the time, like an absolute conditioned reflex.

At first I assumed this was a sensible survival strategy the agent had discovered on its own. But when I wiped the Q-table clean and retrained from scratch (epsilon = 1.0, a completely empty table), the exact same behavior showed up immediately, from the very first episodes when the table was nearly blank. This wasn't something the agent learned — it was a bias baked into how I'd written the action-selection function, present before the agent had learned anything at all.

Most of the "AI" in the other games in this repo is classical in the strict sense — minimax/negamax with built-in knowledge of the rules (Chess, Xiangqi), or a hand-tuned heuristic table for scoring positions (Caro/Gomoku). Snake was the first game where I let the machine actually figure out how to play well on its own, with no strategy baked in, just a plain reward/penalty signal. Tabular Q-learning was the natural choice: no neural network, no framework, just a JavaScript object mapping "state" to "expected value of each action."

The most important decision, and the one that determined whether this whole project was feasible in a single evening, was how to encode state. Snake's raw state — a full 15×15 grid plus every body segment's position — would never let a Q-table converge. The fix was a relative encoding, just 11 bits, completely independent of board size:

```javascript
function getState(engine) {
    const head = engine.snake[0];
    const dir = engine.direction;
    const left = { x: dir.y, y: -dir.x };
    const right = { x: -dir.y, y: dir.x };

    const dangerStraight = engine.isDanger({ x: head.x + dir.x, y: head.y + dir.y });
    const dangerRight = engine.isDanger({ x: head.x + right.x, y: head.y + right.y });
    const dangerLeft = engine.isDanger({ x: head.x + left.x, y: head.y + left.y });

    const foodUp = engine.food.y < head.y;
    const foodDown = engine.food.y > head.y;
    const foodLeft = engine.food.x < head.x;
    const foodRight = engine.food.x > head.x;

    const movingUp = dir.y === -1;
    const movingDown = dir.y === 1;
    const movingLeft = dir.x === -1;
    const movingRight = dir.x === 1;

    const bits = [
        dangerStraight, dangerRight, dangerLeft,
        foodUp, foodDown, foodLeft, foodRight,
        movingUp, movingDown, movingLeft, movingRight,
    ];

    return bits.map((b) => (b ? "1" : "0")).join("");
}
```

11 binary bits, joined into a string like `"10001001000"`, used directly as the lookup key into `qTable`. The maximum state space is 2^11 = 2048 combinations — small enough that the whole table can converge in a few hundred to a few thousand episodes, and fits comfortably in `localStorage`. The second important detail: actions are relative (turn left / go straight / turn right), not absolute, and "danger"/"food direction" in the state are also computed relative to whichever way the head is currently facing. That means a state learned while heading up automatically applies when the snake is heading right — completely free generalization, no extra symmetry-handling code needed.

The Q-value update rule fits in one line:

```javascript
learn(state, actionIndex, reward, nextState, done) {
    const q = this.getQ(state);
    const nextQ = this.getQ(nextState);
    const maxNextQ = done ? 0 : Math.max(...nextQ);
    q[actionIndex] += this.alpha * (reward + this.gamma * maxNextQ - q[actionIndex]);
}
```

The reward is deliberately minimal too, after an earlier draft went the opposite direction — penalties for hugging the board edge, a small bonus for having open space around the head (estimated with a rough flood-fill), a penalty for getting too close to its own body. The result was a strange behavior I couldn't pin down, impossible to trace back to any single one of the 6-7 overlapping signals. Collapsing it down to just four branches turned out to be easier to debug, not just easier to write — whenever the snake did something unexpected, there were at most four possible causes to check:

```javascript
let reward;
if (result.died) {
    reward = -10;
} else if (result.ate) {
    reward = 10;
} else {
    const newDist = manhattanDistance(engine.snake[0], engine.food);
    reward = newDist < prevDist ? 1 : -1;
}
```

Back to the "always turns left in unfamiliar states" mystery. The culprit was `chooseAction` — the function that picks the best action whenever epsilon-greedy doesn't roll into its exploration branch:

```javascript
chooseAction(state) {
    if (Math.random() < this.epsilon) {
        return Math.floor(Math.random() * this.actions.length);
    }
    const q = this.getQ(state);
    let bestIndex = 0;
    for (let i = 1; i < q.length; i++) {
        if (q[i] > q[bestIndex]) bestIndex = i;
    }
    return bestIndex;
}
```

`bestIndex` starts at 0, and the comparison uses `>`, not `>=`. For a brand-new state, `getQ` returns `[0, 0, 0]` — all tied — so the lowest index always wins. Since `this.actions = [-1, 0, 1]` (turn left, go straight, turn right) and index 0 maps to turning left, the result is a systematic bias, strongest early in training and still present for any rare state that's never been updated away from zero. This is the exact same tie-breaking strategy I'd already applied correctly in the Chess and Xiangqi AIs — collect all tied indices into an array and pick randomly among them — but I forgot to apply it here. Same class of bug, showing up again in a completely different algorithm, simply because there was no checklist reminding me of a lesson I already "knew."

Another night, I left Turbo mode running overnight and came back to find the episode count had barely moved compared to when I'd switched tabs to do other work — way below what the tick rate would predict. Grepping the whole `js/` folder for `visibilitychange`, `requestAnimationFrame`, `performance.now` turned up nothing; the AI loop relies entirely on `setInterval`. This is the browser's familiar `setInterval` throttling behavior when a tab isn't active, but the consequence here is much worse than a rhythm game stuttering when you switch back to the tab: in a training loop, time itself is the resource being consumed to produce value — every tick is a learning sample — so throttling it quietly steals that resource without anyone noticing while it's happening.

The last interesting bug hides behind a line that looks redundant. Rereading the handler for the "clear & retrain from scratch" button:

```javascript
document.getElementById("btn-reset-ai").addEventListener("click", () => {
    clearInterval(timer);
    agent.resetLearning();
    startAi();
});
```

`startAi()` immediately assigns a brand-new agent (`agent = new QLearningAgent()`), so what's the point of calling `agent.resetLearning()` on the old object right before it, when it's about to be thrown away on the very next line? This is exactly the "looks redundant but isn't" trap, waiting for a future refactor to accidentally tidy it up. In reality, `resetLearning()` does more than reset the in-memory state (which genuinely is pointless here) — it also removes all three keys from `localStorage`. And `QLearningAgent`'s constructor automatically calls `this.load()`, which reads those exact same three keys back if they still exist. Delete the `resetLearning()` call, and `new QLearningAgent()` will happily reload the old Q-table straight from disk — the "retrain from scratch" button would appear to reset for exactly one frame, then the old Q-table would silently flood right back in, no error thrown anywhere.

What surprised me most about this project wasn't that Q-learning "worked" — with a small state space and a sane reward, it's almost guaranteed to converge, that's just the math of the algorithm. What surprised me was that details that feel like ordinary "clean code" concerns — how a `for` loop breaks ties, one function call that looks superfluous — turned out to be exactly the places that decide whether the learning process is fair or biased, and whether a feature named "retrain from scratch" actually does what its name promises.

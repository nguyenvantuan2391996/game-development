# Rock Paper Scissors: an AI that learns your habits, and a tie that always leans toward Rock

The first version of this game had no AI at all. It had a room-selection lobby, a mocked third-party API behind it, and a play screen with no JavaScript logic whatsoever — the entire "game" was a CSS trick using the `:checked` attribute, where winning depended more on reflexes and luck than on actually choosing a move. None of that survives in the current version — the lobby got ripped out entirely, since the play screen behind it never actually used the room data it collected — and in its place is an AI opponent that genuinely learns the player's habits using n-grams and a Markov chain.

The hard part about building Rock Paper Scissors isn't the rules — three moves, one lookup table for who beats whom — it's that the rules are so simple there's nothing left to enrich on the gameplay side. A fully random AI (33% each move) makes the game meaningless after a few rounds: nothing to learn, nothing to improve against. So all the depth has to come from the opponent instead: an AI that predicts the player's next move from their history, then always plays the move that beats that prediction.

The core piece of design is a classic n-gram backoff chain — try the most specific order first, and fall back to something more general when there isn't enough evidence:

```javascript
predictNextPlayerMove() {
    for (const order of NGRAM_ORDERS) {
        if (this.history.length < order) continue;
        const seq = this.history.slice(this.history.length - order);
        const counts = this.ngramTables[order][this.key(seq)];
        if (!counts) continue;

        const total = counts.rock + counts.paper + counts.scissors;
        if (total < NGRAM_MIN_EVIDENCE) continue;

        let best = MOVES[0];
        MOVES.forEach((m) => {
            if (counts[m] > counts[best]) best = m;
        });
        this.lastOrderUsed = order;
        this.lastConfidence = counts[best] / total;
        return best;
    }

    this.lastOrderUsed = 0;
    this.lastConfidence = 1 / 3;
    return MOVES[Math.floor(Math.random() * MOVES.length)];
}
```

`NGRAM_ORDERS` is `[3, 2, 1]`: the AI first looks up the player's last 3 moves in the learned table; if that doesn't have enough evidence (fewer than `NGRAM_MIN_EVIDENCE = 2` prior observations), it backs off to the last 2 moves, and finally to a plain 1st-order Markov table (just the last move). If none of those have enough data, it guesses uniformly at random. Humans tend to play habits longer than a single step — "switch moves after winning," "throw Rock twice in a row and the third time will be different" — so the higher orders catch subtler patterns, as long as there's enough data behind them to trust.

One design decision I'm fairly proud of: the AI never adds artificial noise on top of a confident prediction to "pretend" it sometimes goes easy on the player. It plays purely off what it has learned. A player who moves completely at random naturally pushes the AI back toward guessing (no pattern ever accumulates enough evidence) — that's the correct behavior for a pattern-based predictor, not a bug.

But that exact transparency — no layer of random noise around to accidentally paper over mistakes — is what let a small bias surface when I reread the "pick the highest-frequency move" loop above while writing this post. The comparison uses `>` (strictly greater than), not `>=`. If the learned data has two (or all three) moves tied on frequency — entirely possible early in learning, since `NGRAM_MIN_EVIDENCE` is just 2 — the loop above always picks whichever move comes first in `MOVES = ["rock", "paper", "scissors"]`, because only a strictly higher count than the current `best` can overwrite it.

In other words: every tie in the learned data gets read by the AI as "the player is about to throw Rock" — never Paper, never Scissors, even when all three are tied at exactly the same frequency. And since the AI always plays the counter to its prediction, a tie always makes it throw Paper. The real-world impact is small — the more you play, the denser the data gets, and an exact three-way tie in frequency becomes rarer and rarer. The bias only really matters early in learning, which is also exactly when the predictions themselves aren't very trustworthy yet.

What I like about this bug is how it illustrates an extremely common code pattern: "pick the highest-value element with a `>` comparison loop" always carries a hidden assumption nobody thinks to check — on a tie, whichever element comes first in iteration order wins. That assumption is harmless in most applications, but it becomes a statistically meaningful bias the moment the iteration order (here, the fixed `MOVES` array) carries no randomness of its own. For an AI marketed as "learns your patterns fairly," this is exactly the kind of bias that's easy to miss, because it doesn't live in the learned data — the data is entirely objective — it lives in the logic that interprets that data when more than one answer is equally correct. The fix is simple too: when multiple moves tie for the top frequency, pick randomly among them instead of always defaulting to whichever one appears first in the array.

The lesson here goes beyond that one line of code. It's a reminder that the more transparent and "honest" an AI is — no fake randomness pretending to be fairness — the more visible its small logical blind spots become, not because the AI got worse, but because there's no noise layer left to accidentally hide them.

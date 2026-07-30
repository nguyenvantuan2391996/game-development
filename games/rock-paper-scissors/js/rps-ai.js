// Predicts the player's next move from their own move history, then plays
// the counter to that prediction. Combines two techniques:
//
// - Pattern matching: look for the longest recent sequence of the player's
//   moves (order 3, then 2) that has been seen before, and check what move
//   followed it historically.
// - Markov chain fallback: if no long pattern has enough evidence yet, fall
//   back to a plain 1st-order table (last move -> next move frequency).
//
// If nothing has enough evidence (order requires at least NGRAM_MIN_EVIDENCE
// prior occurrences), the AI has no basis to predict and picks randomly.
class RpsAI {
    constructor() {
        this.history = [];
        this.ngramTables = { 1: {}, 2: {}, 3: {} };
        this.lastOrderUsed = 0;
        this.lastConfidence = 1 / 3;
        this.load();
    }

    key(moves) {
        return moves.join(",");
    }

    recordPlayerMove(move) {
        this.history.push(move);
        if (this.history.length > HISTORY_MAX_LENGTH) {
            this.history = this.history.slice(-HISTORY_MAX_LENGTH);
        }

        const n = this.history.length;
        NGRAM_ORDERS.forEach((order) => {
            if (n - 1 < order) return;
            const seq = this.history.slice(n - 1 - order, n - 1);
            const key = this.key(seq);
            const table = this.ngramTables[order];
            if (!table[key]) table[key] = { rock: 0, paper: 0, scissors: 0 };
            table[key][move] += 1;
        });
    }

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

    chooseMove() {
        const predicted = this.predictNextPlayerMove();
        return COUNTERS[predicted];
    }

    save() {
        localStorage.setItem(
            AI_MODEL_KEY,
            JSON.stringify({ history: this.history, ngramTables: this.ngramTables })
        );
    }

    load() {
        try {
            const raw = localStorage.getItem(AI_MODEL_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (Array.isArray(data.history)) this.history = data.history;
            if (data.ngramTables) this.ngramTables = data.ngramTables;
        } catch (e) {
            this.history = [];
            this.ngramTables = { 1: {}, 2: {}, 3: {} };
        }
    }

    reset() {
        this.history = [];
        this.ngramTables = { 1: {}, 2: {}, 3: {} };
        localStorage.removeItem(AI_MODEL_KEY);
    }
}

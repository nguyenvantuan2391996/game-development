function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Relative, bucketed state: vertical distance until the next beam pair
// reaches the character's fixed height, horizontal offset from the gap
// center, and the character's current flight direction. Independent of
// absolute screen position, so it generalizes across every gap.
function getSwingState(character, direction, nextBeam) {
    if (!nextBeam) return "no-beam_" + direction;

    const dy = nextBeam.y - character.y;
    const dx = character.x - nextBeam.gapCenterX;

    const dyBucket = clampInt(Math.floor(dy / 40), -6, 0);
    const dxBucket = clampInt(Math.round(dx / 30), -10, 10);

    return dyBucket + "_" + dxBucket + "_" + direction;
}

class QLearningAgent {
    constructor(actions, tableKey, episodeKey, epsilonKey) {
        this.alpha = 0.15;
        this.gamma = 0.9;
        this.epsilon = 1.0;
        this.epsilonMin = 0.02;
        this.epsilonDecay = 0.9985;
        this.actions = actions;
        this.tableKey = tableKey;
        this.episodeKey = episodeKey;
        this.epsilonKeyName = epsilonKey;
        this.qTable = {};
        this.episode = 0;
        this.load();
    }

    getQ(state) {
        if (!this.qTable[state]) {
            this.qTable[state] = this.actions.map(() => 0);
        }
        return this.qTable[state];
    }

    chooseAction(state) {
        if (Math.random() < this.epsilon) {
            return Math.floor(Math.random() * this.actions.length);
        }
        const q = this.getQ(state);
        const bestValue = Math.max(...q);
        const bestIndices = [];
        q.forEach((v, i) => {
            if (v === bestValue) bestIndices.push(i);
        });
        return bestIndices[Math.floor(Math.random() * bestIndices.length)];
    }

    learn(state, actionIndex, reward, nextState, done) {
        const q = this.getQ(state);
        const nextQ = this.getQ(nextState);
        const maxNextQ = done ? 0 : Math.max(...nextQ);
        q[actionIndex] += this.alpha * (reward + this.gamma * maxNextQ - q[actionIndex]);
    }

    decayEpsilon() {
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }

    save() {
        localStorage.setItem(this.tableKey, JSON.stringify(this.qTable));
        localStorage.setItem(this.episodeKey, String(this.episode));
        localStorage.setItem(this.epsilonKeyName, String(this.epsilon));
    }

    load() {
        try {
            const table = localStorage.getItem(this.tableKey);
            if (table) this.qTable = JSON.parse(table);
            const ep = localStorage.getItem(this.episodeKey);
            if (ep) this.episode = Number(ep);
            const eps = localStorage.getItem(this.epsilonKeyName);
            if (eps) this.epsilon = Number(eps);
        } catch (e) {
            this.qTable = {};
        }
    }

    resetLearning() {
        this.qTable = {};
        this.episode = 0;
        this.epsilon = 1.0;
        localStorage.removeItem(this.tableKey);
        localStorage.removeItem(this.episodeKey);
        localStorage.removeItem(this.epsilonKeyName);
    }
}

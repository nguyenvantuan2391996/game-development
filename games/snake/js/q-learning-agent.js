function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

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

class QLearningAgent {
    constructor() {
        this.alpha = 0.15;
        this.gamma = 0.9;
        this.epsilon = 1.0;
        this.epsilonMin = 0.02;
        this.epsilonDecay = 0.9985;
        this.actions = [-1, 0, 1];
        this.qTable = {};
        this.episode = 0;
        this.load();
    }

    getQ(state) {
        if (!this.qTable[state]) {
            this.qTable[state] = [0, 0, 0];
        }
        return this.qTable[state];
    }

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
        localStorage.setItem(Q_TABLE_KEY, JSON.stringify(this.qTable));
        localStorage.setItem(Q_EPISODE_KEY, String(this.episode));
        localStorage.setItem(Q_EPSILON_KEY, String(this.epsilon));
    }

    load() {
        try {
            const table = localStorage.getItem(Q_TABLE_KEY);
            if (table) this.qTable = JSON.parse(table);
            const ep = localStorage.getItem(Q_EPISODE_KEY);
            if (ep) this.episode = Number(ep);
            const eps = localStorage.getItem(Q_EPSILON_KEY);
            if (eps) this.epsilon = Number(eps);
        } catch (e) {
            this.qTable = {};
        }
    }

    resetLearning() {
        this.qTable = {};
        this.episode = 0;
        this.epsilon = 1.0;
        localStorage.removeItem(Q_TABLE_KEY);
        localStorage.removeItem(Q_EPISODE_KEY);
        localStorage.removeItem(Q_EPSILON_KEY);
    }
}

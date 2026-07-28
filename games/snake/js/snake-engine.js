class SnakeEngine {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.reset();
    }

    reset() {
        const center = Math.floor(this.gridSize / 2);
        this.snake = [
            { x: center - 1, y: center },
            { x: center - 2, y: center },
            { x: center - 3, y: center },
        ];
        this.direction = { x: 1, y: 0 };
        this.pendingDirection = null;
        this.food = this.spawnFood();
        this.score = 0;
        this.steps = 0;
        this.alive = true;
    }

    spawnFood() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize),
            };
        } while (this.snake && this.snake.some((s) => s.x === pos.x && s.y === pos.y));
        return pos;
    }

    setDirection(dir) {
        if (dir.x === -this.direction.x && dir.y === -this.direction.y) return;
        this.pendingDirection = dir;
    }

    turnRelative(turn) {
        if (turn === 0) return;
        const { x, y } = this.direction;
        this.pendingDirection = turn === -1 ? { x: y, y: -x } : { x: -y, y: x };
    }

    isDanger(point) {
        if (point.x < 0 || point.x >= this.gridSize || point.y < 0 || point.y >= this.gridSize) {
            return true;
        }
        return this.snake.some((s) => s.x === point.x && s.y === point.y);
    }

    step() {
        if (!this.alive) return { ate: false, died: false };

        if (this.pendingDirection) {
            this.direction = this.pendingDirection;
            this.pendingDirection = null;
        }

        const head = this.snake[0];
        const newHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };
        this.steps += 1;

        if (this.isDanger(newHead)) {
            this.alive = false;
            return { ate: false, died: true };
        }

        this.snake.unshift(newHead);

        const ate = newHead.x === this.food.x && newHead.y === this.food.y;
        if (ate) {
            this.score += 1;
            this.food = this.spawnFood();
        } else {
            this.snake.pop();
        }

        return { ate, died: false };
    }
}

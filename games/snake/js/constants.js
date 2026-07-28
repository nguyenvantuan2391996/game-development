const GRID_SIZE = 15;
const CELL_SIZE = 24;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

const DIRS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

const BEST_SCORE_NORMAL_KEY = "snakeBestScoreNormal";
const BEST_SCORE_AI_KEY = "snakeBestScoreAI";

const Q_TABLE_KEY = "snakeQTable";
const Q_EPISODE_KEY = "snakeQEpisode";
const Q_EPSILON_KEY = "snakeQEpsilon";

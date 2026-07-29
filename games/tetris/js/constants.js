const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 26;
const GAME_WIDTH = COLS * CELL_SIZE;
const GAME_HEIGHT = ROWS * CELL_SIZE;

const SPAWN_COL = 3;

const SHAPES = {
    I: { color: "#4dc9ff", grid: ["....", "XXXX", "....", "...."] },
    O: { color: "#ffd93d", grid: ["....", ".XX.", ".XX.", "...."] },
    T: { color: "#b388ff", grid: ["....", ".X..", "XXX.", "...."] },
    S: { color: "#4dff88", grid: ["....", ".XX.", "XX..", "...."] },
    Z: { color: "#ff5252", grid: ["....", "XX..", ".XX.", "...."] },
    J: { color: "#3d7aff", grid: ["X...", "XXX.", "....", "...."] },
    L: { color: "#ff9d3d", grid: ["..X.", "XXX.", "....", "...."] },
};

const LINE_SCORE = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;

const DROP_INTERVAL_START_MS = 750;
const DROP_INTERVAL_MIN_MS = 90;
const DROP_INTERVAL_STEP_MS = 55;

const SOFT_DROP_SCORE = 1;
const HARD_DROP_SCORE = 2;

const WALL_KICK_OFFSETS = [0, -1, 1, -2, 2];

const BEST_SCORE_KEY = "tetrisBestScore";

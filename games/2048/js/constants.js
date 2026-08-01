const GRID_SIZE = 4;
const WIN_VALUE = 2048;
const NEW_TILE_FOUR_CHANCE = 0.1;
const MOVE_TRANSITION_MS = 120;
const BEST_SCORE_KEY = "2048BestScore";

const TILE_COLORS = {
    2: { bg: "#eee4da", fg: "#5c5346" },
    4: { bg: "#ede0c8", fg: "#5c5346" },
    8: { bg: "#f2b179", fg: "#fff8f0" },
    16: { bg: "#f59563", fg: "#fff8f0" },
    32: { bg: "#f67c5f", fg: "#fff8f0" },
    64: { bg: "#f65e3b", fg: "#fff8f0" },
    128: { bg: "#edcf72", fg: "#fff8f0" },
    256: { bg: "#edcc61", fg: "#fff8f0" },
    512: { bg: "#edc850", fg: "#fff8f0" },
    1024: { bg: "#edc53f", fg: "#fff8f0" },
    2048: { bg: "#edc22e", fg: "#fff8f0" },
};

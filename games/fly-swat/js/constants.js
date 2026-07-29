const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;

const ROUND_TIME_MS = 45000;

const CLICK_TOLERANCE = 10;

const SPAWN_MIN_MS_START = 650;
const SPAWN_MAX_MS_START = 1100;
const SPAWN_MIN_MS_END = 260;
const SPAWN_MAX_MS_END = 520;

const TURN_INTERVAL_MIN_MS = 400;
const TURN_INTERVAL_MAX_MS = 900;

const INSECT_TYPES = {
    normal: { radius: 11, speedMin: 60, speedMax: 110, score: 10, weight: 55, color: "#3a3a3a" },
    fast: { radius: 8, speedMin: 150, speedMax: 210, score: 20, weight: 20, color: "#ff5252" },
    golden: { radius: 13, speedMin: 90, speedMax: 140, score: 50, weight: 8, color: "#ffd93d", lifespanMs: 2600 },
    wasp: { radius: 10, speedMin: 130, speedMax: 190, score: -15, weight: 17, color: "#ffb300" },
};

const PARTICLE_COUNT = 7;
const PARTICLE_LIFE_MS = 420;

const FLOATING_TEXT_LIFE_MS = 650;

const BEST_SCORE_KEY = "flySwatBestScore";

const CELL = 40;
const COLS = 9;
const GAME_WIDTH = CELL * COLS;
const ROWS_VISIBLE = 14;
const GAME_HEIGHT = CELL * ROWS_VISIBLE;

const SAFE_START_ROWS = 3;
const LOOKAHEAD_ROWS = 6;

const MOVE_ANIM_MS = 110;
const CAMERA_LERP = 0.08;

const PLAYER_SIZE = 28;

const CAR_WIDTH = 56;
const CAR_HEIGHT = 30;
const CAR_SPEED_MIN = 70;
const CAR_SPEED_MAX = 150;
const CAR_GAP_MIN = 150;
const CAR_GAP_MAX = 260;

const LOG_WIDTH = 110;
const LOG_HEIGHT = 32;
const LOG_SPEED_MIN = 50;
const LOG_SPEED_MAX = 110;
const LOG_GAP_MIN = 140;
const LOG_GAP_MAX = 220;

const ROW_TYPE_WEIGHTS = [
    { type: "grass", weight: 4 },
    { type: "road", weight: 4 },
    { type: "water", weight: 3 },
];

const BEST_SCORE_KEY = "crossyRoadBestScore";

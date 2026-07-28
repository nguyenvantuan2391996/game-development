const TILE = 32;
const COLS = 15;
const ROWS = 13;
const MAP_PIXEL_W = TILE * COLS;
const MAP_PIXEL_H = TILE * ROWS;

const TILE_EMPTY = 0;
const TILE_SOFT = 1;
const TILE_HARD = 2;

const DIR = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

const PLAYER_SIZE = 24;
const PLAYER_BASE_SPEED = 95;
const PLAYER_LIVES = 3;
const PLAYER_MAX_BOMBS_BASE = 1;
const PLAYER_FLAME_RANGE_BASE = 1;

const ENEMY_SIZE = 24;
const ENEMY_SPEED = 55;
const ENEMIES_PER_WAVE_BASE = 5;
const MAX_ENEMIES_ON_FIELD = 4;

const BOSS_SIZE = 46;
const BOSS_SPEED = 42;
const BOSS_HP_BASE = 5;

const BOMB_SIZE = 22;
const BOMB_FUSE_MS = 1900;
const EXPLOSION_DURATION_MS = 420;

const POWERUP_DROP_CHANCE = 0.28;
const POWERUP_SIZE = 20;
const POWERUP_BOMB = "bomb";
const POWERUP_FLAME = "flame";
const POWERUP_SPEED = "speed";
const POWERUP_MAX_BOMBS_CAP = 5;
const POWERUP_MAX_FLAME_CAP = 6;
const POWERUP_SPEED_STEP = 14;
const POWERUP_SPEED_CAP = PLAYER_BASE_SPEED + POWERUP_SPEED_STEP * 4;

const SPAWN_POINTS = [
    { col: 1, row: 1 },
    { col: COLS - 2, row: 1 },
    { col: 1, row: ROWS - 2 },
    { col: COLS - 2, row: ROWS - 2 },
];
const PLAYER_SPAWN = SPAWN_POINTS[0];

const BEST_SCORE_KEY = "bombermanBestScore";

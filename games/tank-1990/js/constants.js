const TILE = 32;
const COLS = 13;
const ROWS = 13;
const MAP_PIXEL = TILE * COLS;

const TILE_EMPTY = 0;
const TILE_BRICK = 1;
const TILE_STEEL = 2;
const TILE_WATER = 3;
const TILE_BASE = 4;

const MAP_LAYOUT = [
    ".............",
    ".BB.......BB.",
    ".BB..SS...BB.",
    ".............",
    "..BB.....BB..",
    "..BB..W..BB..",
    ".............",
    "....BBBBB....",
    "....B...B....",
    "....B...B....",
    "....B...B....",
    "....BB.BB....",
    "......E......",
];

const TILE_CHAR_MAP = {
    ".": TILE_EMPTY,
    B: TILE_BRICK,
    S: TILE_STEEL,
    W: TILE_WATER,
    E: TILE_BASE,
};

const DIR = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

const PLAYER_SIZE = 26;
const PLAYER_SPEED = 105;
const PLAYER_FIRE_COOLDOWN = 320;
const PLAYER_LIVES = 3;

const ENEMY_SIZE = 26;
const ENEMY_SPEED = 65;
const ENEMY_FIRE_MIN = 1200;
const ENEMY_FIRE_MAX = 2800;
const ENEMIES_PER_WAVE_BASE = 6;
const MAX_ENEMIES_ON_FIELD = 4;

const BOSS_SIZE = 52;
const BOSS_SPEED = 40;
const BOSS_HP_BASE = 12;
const BOSS_FIRE_INTERVAL = 900;

const BULLET_SIZE = 6;
const BULLET_SPEED_PLAYER = 260;
const BULLET_SPEED_ENEMY = 200;

const SPAWN_POINTS = [
    { col: 1, row: 0 },
    { col: 6, row: 0 },
    { col: 11, row: 0 },
];
const PLAYER_SPAWN = { col: 1, row: 12 };

const BEST_SCORE_KEY = "tank1990BestScore";

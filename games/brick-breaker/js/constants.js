const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;

const PADDLE_WIDTH = 76;
const PADDLE_HEIGHT = 12;
const PADDLE_Y = GAME_HEIGHT - 36;
const PADDLE_SPEED = 380;
const PADDLE_LIVES = 3;

const BALL_RADIUS = 7;
const BALL_SPEED_START = 260;
const BALL_SPEED_PER_LEVEL = 18;
const BALL_MAX_BOUNCE_ANGLE = (65 * Math.PI) / 180;

const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_TOP_OFFSET = 60;
const BRICK_SIDE_MARGIN = 10;
const BRICK_GAP = 5;
const BRICK_HEIGHT = 20;
const BRICK_WIDTH = (GAME_WIDTH - BRICK_SIDE_MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;

const ROW_COLORS = ["#ff5252", "#ff9d3d", "#ffd93d", "#4dff88", "#4dc9ff", "#b388ff"];
const ROW_SCORE = [60, 50, 40, 30, 20, 10];

const TOUGH_BRICK_CHANCE_PER_LEVEL = 0.05;

const BEST_SCORE_KEY = "brickBreakerBestScore";

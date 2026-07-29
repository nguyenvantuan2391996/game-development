const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;

const PADDLE_WIDTH = 72;
const PADDLE_HEIGHT = 10;
const PLAYER_Y = GAME_HEIGHT - 30;
const CPU_Y = 30;
const PLAYER_SPEED = 380;
const CPU_SPEED = 250;
const CPU_REACTION_DEADZONE = 10;

const BALL_RADIUS = 7;
const BALL_SPEED_START = 220;
const BALL_SPEED_MAX = 420;
const BALL_SPEED_GAIN = 14;
const BALL_MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;

const WIN_SCORE = 7;
const SERVE_DELAY_MS = 700;

const BEST_SCORE_KEY = "pingPongBestScore";

const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;

const RING_RX = 140;
const RING_RY = 34;
const BALL_RADIUS = 12;

const SEGMENTS = 8;
const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENTS;
const FRONT_ANGLE = Math.PI / 2;

const GRAVITY = 1400;
const BOUNCE_VELOCITY = 400;
const TERMINAL_VELOCITY = 900;

const RING_GAP = 130;
const CAMERA_MARGIN = 170;
const CAMERA_LERP = 0.14;

const ROTATE_SPEED = 3.4;

const DANGER_UNLOCK_SCORE = 5;
const DANGER_CHANCE_START = 0.08;
const DANGER_CHANCE_MAX = 0.32;

const BEST_SCORE_KEY = "helixJumpBestScore";

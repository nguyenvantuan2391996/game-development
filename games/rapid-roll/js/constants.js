const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;

const BALL_RADIUS = 12;
const GRAVITY = 900;
const BOUNCE_VELOCITY = 480;
const PLAYER_SPEED = 340;

const BASE_SCROLL_SPEED = 55;
const SCROLL_SPEED_PER_DEPTH = 0.035;
const SCROLL_SPEED_MAX = 190;
const FOLLOW_LINE_RATIO = 0.42;

// The camera starts at y=0 while the ball starts high up on screen, so the
// very first bounce (BOUNCE_VELOCITY is ~128 world units of travel) has far
// less headroom above it than any later bounce once the camera has settled
// into its steady-state follow position. Suppress the "left behind" check
// until the ball has descended past this depth, so it can't fire before the
// camera has had a chance to catch up.
const DEATH_CHECK_MIN_DEPTH = 220;

const PLATFORM_HEIGHT = 12;
const PLATFORM_WIDTH_MIN = 74;
const PLATFORM_WIDTH_MAX = 132;
const PLATFORM_GAP_MIN = 74;
const PLATFORM_GAP_MAX = 128;
const PLATFORM_MARGIN_X = 14;

const MOVING_PLATFORM_SPEED_MIN = 60;
const MOVING_PLATFORM_SPEED_MAX = 120;

const CRUMBLE_DELAY_MS = 260;

const SPIKE_UNLOCK_DEPTH = 400;
const MOVING_UNLOCK_DEPTH = 150;
const CRUMBLE_UNLOCK_DEPTH = 250;

const BEST_SCORE_KEY = "rapidRollBestScore";

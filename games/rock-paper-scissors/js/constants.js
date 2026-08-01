const MOVES = ["rock", "paper", "scissors"];

const MOVE_LABELS = {
    rock: "Rock",
    paper: "Paper",
    scissors: "Scissors",
};

const MOVE_EMOJI = {
    rock: "✊",
    paper: "✋",
    scissors: "✌️",
};

// COUNTERS[x] = the move that beats x
const COUNTERS = {
    rock: "paper",
    paper: "scissors",
    scissors: "rock",
};

const NGRAM_ORDERS = [3, 2, 1];
const NGRAM_MIN_EVIDENCE = 2;
const HISTORY_MAX_LENGTH = 300;

const BEST_STREAK_KEY = "rpsBestStreak";
const AI_MODEL_KEY = "rpsAiModel";

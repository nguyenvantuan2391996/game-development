// Board layout
const GRID_ROWS = 5;
const GRID_COLS = 9;
const CELL_SIZE = 84;
const MOWER_LANE_WIDTH = 70;
const STARTING_SUN = 150;
const TOTAL_ZOMBIES_TO_WIN = 14;

// Falling sun (passive income) timing
const SUN_DROP_MIN_DELAY = 7000;
const SUN_DROP_MAX_DELAY = 11000;
const SUN_DROP_AMOUNT = 25;
const SUN_IDLE_LIFETIME = 6000;

// Zombie spawn pacing
const ZOMBIE_SPAWN_START_DELAY = 4000;
const ZOMBIE_SPAWN_MIN_INTERVAL = 2200;
const ZOMBIE_SPAWN_START_INTERVAL = 6500;
const ZOMBIE_SPAWN_INTERVAL_STEP = 150;

const PLANT_TYPES = {
  sunflower: {
    id: "sunflower",
    name: "Sunflower",
    emoji: "🌻",
    cost: 50,
    cooldown: 6000,
    hp: 70,
    produceInterval: 8000,
    produceAmount: 25,
    desc: "Produces extra sun",
  },
  peashooter: {
    id: "peashooter",
    name: "Peashooter",
    emoji: "🌿",
    cost: 100,
    cooldown: 6000,
    hp: 90,
    fireInterval: 1450,
    damage: 22,
    projectileSpeed: 260,
    desc: "Shoots peas to destroy zombies",
  },
  wallnut: {
    id: "wallnut",
    name: "Wall-nut",
    emoji: "🥜",
    cost: 50,
    cooldown: 22000,
    hp: 400,
    desc: "Blocks the path and soaks up hits",
  },
};

const ZOMBIE_BASE = {
  hp: 100,
  speed: 18, // px/second
  eatDamage: 20,
  eatInterval: 650,
};

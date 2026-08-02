let sun = STARTING_SUN;
let selectedPlant = null;
let plants = [];
let zombies = [];
let peas = [];
let suns = [];
let mowers = [];
let cooldowns = {};
let spawnedCount = 0;
let killedCount = 0;
let gameOver = false;
let hasWon = false;
let muted = false;
let lastFrameTime = 0;
let nextSunDropAt = 0;
let nextZombieSpawnAt = 0;
let zombieSpawnInterval = ZOMBIE_SPAWN_START_INTERVAL;
let idCounter = 0;
let audioCtx = null;

const boardWidth = GRID_COLS * CELL_SIZE;
const boardHeight = GRID_ROWS * CELL_SIZE;

function nextId() {
  idCounter += 1;
  return idCounter;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// ---------- audio (tiny, procedural, no external assets) ----------
function playTone(freq, duration, type, gain) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.value = gain || 0.05;
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // ignore audio failures (autoplay restrictions, unsupported browsers)
  }
}

function sfxPlant() { playTone(520, 0.12, "triangle", 0.06); }
function sfxSun() { playTone(880, 0.15, "sine", 0.05); }
function sfxHit() { playTone(180, 0.08, "square", 0.04); }
function sfxDeny() { playTone(120, 0.2, "sawtooth", 0.05); }
function sfxLose() { playTone(160, 0.9, "sawtooth", 0.06); }
function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, "triangle", 0.06), i * 140);
  });
}

// ---------- DOM refs ----------
let boardEl, sunCountEl, killCountEl, seedBankEl, overlayEl, overlayTitleEl, overlayTextEl, muteBtnEl;
const laneEls = [];
const cellEls = [];
const mowerEls = [];

function buildBoard() {
  boardEl.style.width = boardWidth + MOWER_LANE_WIDTH + "px";
  boardEl.style.height = boardHeight + "px";

  for (let row = 0; row < GRID_ROWS; row++) {
    const rowEl = document.createElement("div");
    rowEl.className = "row";
    rowEl.style.height = CELL_SIZE + "px";

    const mowerEl = document.createElement("div");
    mowerEl.className = "mower";
    mowerEl.textContent = "🚜";
    mowerEl.style.width = MOWER_LANE_WIDTH + "px";
    rowEl.appendChild(mowerEl);
    mowerEls.push(mowerEl);
    mowers.push({ row, alive: true, x: 0, moving: false });

    const laneEl = document.createElement("div");
    laneEl.className = "lane";
    laneEl.style.width = boardWidth + "px";

    cellEls.push([]);
    for (let col = 0; col < GRID_COLS; col++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.style.width = CELL_SIZE + "px";
      cellEl.style.left = col * CELL_SIZE + "px";
      cellEl.addEventListener("click", () => handleCellClick(row, col));
      laneEl.appendChild(cellEl);
      cellEls[row].push(cellEl);
    }

    rowEl.appendChild(laneEl);
    boardEl.appendChild(rowEl);
    laneEls.push(laneEl);
  }
}

function buildSeedBank() {
  Object.values(PLANT_TYPES).forEach((type) => {
    const card = document.createElement("div");
    card.className = "seed-card";
    card.dataset.plant = type.id;
    card.title = type.desc;
    card.innerHTML =
      '<div class="seed-card__cooldown"></div>' +
      '<div class="seed-card__icon">' + type.emoji + "</div>" +
      '<div class="seed-card__cost">' + type.cost + "</div>" +
      '<div class="seed-card__name">' + type.name + "</div>";
    card.addEventListener("click", () => handleCardClick(type.id));
    seedBankEl.appendChild(card);
    cooldowns[type.id] = 0;
  });
}

function handleCardClick(typeId) {
  if (gameOver || hasWon) return;
  const type = PLANT_TYPES[typeId];
  const now = performance.now();
  if (cooldowns[typeId] > now) return;
  if (sun < type.cost) {
    sfxDeny();
    flashCard(typeId);
    return;
  }
  selectedPlant = selectedPlant === typeId ? null : typeId;
  updateSeedBankSelection();
}

function flashCard(typeId) {
  const card = seedBankEl.querySelector('[data-plant="' + typeId + '"]');
  if (!card) return;
  card.classList.add("seed-card--deny");
  setTimeout(() => card.classList.remove("seed-card--deny"), 300);
}

function updateSeedBankSelection() {
  seedBankEl.querySelectorAll(".seed-card").forEach((card) => {
    card.classList.toggle("seed-card--selected", card.dataset.plant === selectedPlant);
  });
}

function handleCellClick(row, col) {
  if (gameOver || hasWon || !selectedPlant) return;
  if (plants.some((p) => p.row === row && p.col === col)) return;
  const type = PLANT_TYPES[selectedPlant];
  const now = performance.now();
  if (sun < type.cost || cooldowns[selectedPlant] > now) return;

  placePlant(row, col, type, now);
}

function placePlant(row, col, type, now) {
  sun -= type.cost;
  updateSunDisplay();

  const el = document.createElement("div");
  el.className = "plant plant--" + type.id;
  el.style.width = CELL_SIZE + "px";
  el.style.height = CELL_SIZE + "px";
  el.style.left = col * CELL_SIZE + "px";
  el.innerHTML =
    '<div class="plant__icon">' + type.emoji + "</div>" +
    '<div class="plant__hp"><div class="plant__hp-fill"></div></div>';
  laneEls[row].appendChild(el);

  plants.push({
    id: nextId(),
    row,
    col,
    type,
    hp: type.hp,
    maxHp: type.hp,
    el,
    hpFillEl: el.querySelector(".plant__hp-fill"),
    lastProduce: now,
    lastFire: now,
  });

  cooldowns[type.id] = now + type.cooldown;
  selectedPlant = null;
  updateSeedBankSelection();
  sfxPlant();
}

function spawnFloatingText(row, x, text, className) {
  const el = document.createElement("div");
  el.className = "float-text " + (className || "");
  el.textContent = text;
  el.style.left = x + "px";
  laneEls[row].appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function spawnFallingSun() {
  const col = Math.floor(rand(0, GRID_COLS));
  const x = col * CELL_SIZE + CELL_SIZE / 2 - 20;
  const restTop = rand(boardHeight * 0.25, boardHeight - 60);

  const el = document.createElement("div");
  el.className = "falling-sun";
  el.textContent = "☀️";
  el.style.left = x + "px";
  el.style.top = "-40px";
  el.addEventListener("click", () => collectSun(sunObj.id));
  boardEl.appendChild(el);

  const sunObj = {
    id: nextId(),
    el,
    state: "falling",
    idleSince: 0,
  };
  suns.push(sunObj);

  requestAnimationFrame(() => {
    el.style.transition = "top 2.4s linear";
    el.style.top = restTop + "px";
  });

  setTimeout(() => {
    if (sunObj.state === "falling") {
      sunObj.state = "idle";
      sunObj.idleSince = performance.now();
    }
  }, 2450);
}

function collectSun(id) {
  const idx = suns.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const s = suns[idx];
  sun += SUN_DROP_AMOUNT;
  updateSunDisplay();
  s.el.remove();
  suns.splice(idx, 1);
  sfxSun();
}

function updateSunDisplay() {
  sunCountEl.textContent = sun;
}

function updateKillDisplay() {
  killCountEl.textContent = killedCount + " / " + TOTAL_ZOMBIES_TO_WIN;
}

// ---------- zombies ----------
function spawnZombie() {
  const row = Math.floor(rand(0, GRID_ROWS));
  const hp = ZOMBIE_BASE.hp + Math.floor(spawnedCount / 3) * 15;
  const speed = ZOMBIE_BASE.speed + Math.min(Math.floor(spawnedCount / 4) * 2, 12);

  const el = document.createElement("div");
  el.className = "zombie";
  el.style.left = boardWidth - CELL_SIZE * 0.6 + "px";
  el.innerHTML =
    '<div class="zombie__hp"><div class="zombie__hp-fill"></div></div>' +
    '<img src="images/normalzombie.gif" alt="zombie">';
  laneEls[row].appendChild(el);

  zombies.push({
    id: nextId(),
    row,
    x: boardWidth - CELL_SIZE * 0.6,
    hp,
    maxHp: hp,
    speed,
    el,
    hpFillEl: el.querySelector(".zombie__hp-fill"),
    eatingPlantId: null,
    lastEatTick: 0,
  });
}

function killZombie(zombie) {
  if (zombie.dead) return;
  zombie.dead = true;
  zombie.el.classList.add("zombie--dead");
  setTimeout(() => zombie.el.remove(), 250);
  zombies = zombies.filter((z) => z.id !== zombie.id);
  killedCount += 1;
  updateKillDisplay();
}

function triggerMower(row) {
  const mower = mowers[row];
  if (!mower || !mower.alive) return;
  mower.alive = false;
  mower.moving = true;

  zombies.filter((z) => z.row === row).forEach((z) => killZombie(z));

  const el = mowerEls[row];
  el.classList.add("mower--running");
  requestAnimationFrame(() => {
    el.style.transform = "translateX(" + (boardWidth + CELL_SIZE) + "px)";
  });
  setTimeout(() => {
    el.style.visibility = "hidden";
  }, 900);
}

function removePlant(plant) {
  plant.el.remove();
  plants = plants.filter((p) => p.id !== plant.id);
}

// ---------- main loop ----------
function tick(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;

  if (gameOver || hasWon) return;

  if (timestamp >= nextZombieSpawnAt && spawnedCount < TOTAL_ZOMBIES_TO_WIN) {
    spawnZombie();
    spawnedCount += 1;
    zombieSpawnInterval = Math.max(
      ZOMBIE_SPAWN_MIN_INTERVAL,
      ZOMBIE_SPAWN_START_INTERVAL - spawnedCount * ZOMBIE_SPAWN_INTERVAL_STEP
    );
    nextZombieSpawnAt = timestamp + zombieSpawnInterval;
  }

  if (timestamp >= nextSunDropAt) {
    spawnFallingSun();
    nextSunDropAt = timestamp + rand(SUN_DROP_MIN_DELAY, SUN_DROP_MAX_DELAY);
  }

  updateSeedBankUI(timestamp);
  updatePlants(timestamp);
  updatePeas(dt);
  updateZombies(dt, timestamp);
  updateSuns(timestamp);

  if (!gameOver && killedCount >= TOTAL_ZOMBIES_TO_WIN && zombies.length === 0) {
    triggerWin();
    return;
  }

  requestAnimationFrame(tick);
}

function updateSeedBankUI(now) {
  seedBankEl.querySelectorAll(".seed-card").forEach((card) => {
    const typeId = card.dataset.plant;
    const type = PLANT_TYPES[typeId];
    const remaining = cooldowns[typeId] - now;
    const cooldownEl = card.querySelector(".seed-card__cooldown");
    if (remaining > 0) {
      cooldownEl.style.height = Math.min(100, (remaining / type.cooldown) * 100) + "%";
      card.classList.add("seed-card--cooling");
    } else {
      cooldownEl.style.height = "0%";
      card.classList.remove("seed-card--cooling");
    }
    card.classList.toggle("seed-card--unaffordable", sun < type.cost);
  });
}

function updatePlants(now) {
  plants.forEach((plant) => {
    plant.hpFillEl.style.width = (plant.hp / plant.maxHp) * 100 + "%";

    if (plant.type.id === "sunflower" && now - plant.lastProduce >= plant.type.produceInterval) {
      plant.lastProduce = now;
      sun += plant.type.produceAmount;
      updateSunDisplay();
      spawnFloatingText(plant.row, plant.col * CELL_SIZE + CELL_SIZE / 2 - 10, "+" + plant.type.produceAmount, "float-text--sun");
    }

    if (plant.type.id === "peashooter" && now - plant.lastFire >= plant.type.fireInterval) {
      const hasTarget = zombies.some((z) => z.row === plant.row && z.x > plant.col * CELL_SIZE);
      if (hasTarget) {
        plant.lastFire = now;
        shootPea(plant, now);
      }
    }
  });
}

function shootPea(plant, now) {
  const startX = plant.col * CELL_SIZE + CELL_SIZE * 0.75;
  const el = document.createElement("div");
  el.className = "pea";
  el.style.left = startX + "px";
  laneEls[plant.row].appendChild(el);

  peas.push({
    id: nextId(),
    row: plant.row,
    x: startX,
    speed: plant.type.projectileSpeed,
    damage: plant.type.damage,
    el,
  });
}

function updatePeas(dt) {
  peas.forEach((pea) => {
    pea.x += pea.speed * dt;
    pea.el.style.left = pea.x + "px";
  });

  peas = peas.filter((pea) => {
    if (pea.x > boardWidth) {
      pea.el.remove();
      return false;
    }
    const target = zombies.find((z) => z.row === pea.row && Math.abs(z.x - pea.x) < CELL_SIZE * 0.35 && z.x <= pea.x + CELL_SIZE * 0.35);
    if (target) {
      target.hp -= pea.damage;
      sfxHit();
      pea.el.remove();
      if (target.hp <= 0) {
        killZombie(target);
      }
      return false;
    }
    return true;
  });
}

function updateZombies(dt, now) {
  zombies.forEach((zombie) => {
    if (zombie.dead) return;
    zombie.hpFillEl.style.width = (zombie.hp / zombie.maxHp) * 100 + "%";

    if (zombie.eatingPlantId) {
      const plant = plants.find((p) => p.id === zombie.eatingPlantId);
      if (!plant) {
        zombie.eatingPlantId = null;
        return;
      }
      if (now - zombie.lastEatTick >= ZOMBIE_BASE.eatInterval) {
        zombie.lastEatTick = now;
        plant.hp -= ZOMBIE_BASE.eatDamage;
        if (plant.hp <= 0) {
          removePlant(plant);
          zombie.eatingPlantId = null;
        }
      }
      return;
    }

    zombie.x -= zombie.speed * dt;

    const blocker = plants.find(
      (p) => p.row === zombie.row && zombie.x <= p.col * CELL_SIZE + CELL_SIZE * 0.75 && zombie.x > p.col * CELL_SIZE - CELL_SIZE * 0.25
    );
    if (blocker) {
      zombie.x = blocker.col * CELL_SIZE + CELL_SIZE * 0.75;
      zombie.eatingPlantId = blocker.id;
      zombie.lastEatTick = now;
    }

    zombie.el.style.left = zombie.x + "px";

    if (zombie.x <= -CELL_SIZE * 0.1) {
      if (mowers[zombie.row].alive) {
        triggerMower(zombie.row);
      } else if (!gameOver) {
        triggerLose();
      }
    }
  });
}

function updateSuns(now) {
  suns.forEach((s) => {
    if (s.state === "idle" && now - s.idleSince > SUN_IDLE_LIFETIME) {
      s.el.classList.add("falling-sun--fade");
      setTimeout(() => s.el.remove(), 400);
      s.state = "gone";
    }
  });
  suns = suns.filter((s) => s.state !== "gone");
}

// ---------- end states ----------
function showOverlay(title, text, isWin) {
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;
  overlayEl.classList.toggle("overlay--win", !!isWin);
  overlayEl.classList.toggle("overlay--lose", !isWin);
  overlayEl.classList.remove("hidden");
}

function triggerLose() {
  gameOver = true;
  sfxLose();
  showOverlay(
    "Your garden has fallen! 🧟",
    "You defeated " + killedCount + " / " + TOTAL_ZOMBIES_TO_WIN + " zombies before going down.",
    false
  );
}

function triggerWin() {
  hasWon = true;
  sfxWin();
  showOverlay(
    "You successfully defended your garden! 🎉",
    "All " + TOTAL_ZOMBIES_TO_WIN + " zombies have been defeated.",
    true
  );
}

// ---------- init ----------
function init() {
  boardEl = document.getElementById("board");
  sunCountEl = document.getElementById("sunCount");
  killCountEl = document.getElementById("killCount");
  seedBankEl = document.getElementById("seedBank");
  overlayEl = document.getElementById("overlay");
  overlayTitleEl = document.getElementById("overlayTitle");
  overlayTextEl = document.getElementById("overlayText");
  muteBtnEl = document.getElementById("muteBtn");

  buildBoard();
  buildSeedBank();
  updateSunDisplay();
  updateKillDisplay();

  muteBtnEl.addEventListener("click", () => {
    muted = !muted;
    muteBtnEl.textContent = muted ? "🔇" : "🔊";
    muteBtnEl.classList.toggle("muted", muted);
  });

  document.getElementById("restartBtn").addEventListener("click", () => location.reload());

  const now = performance.now();
  nextZombieSpawnAt = now + ZOMBIE_SPAWN_START_DELAY;
  nextSunDropAt = now + rand(2500, 4500);

  requestAnimationFrame(tick);
}

window.addEventListener("load", init);

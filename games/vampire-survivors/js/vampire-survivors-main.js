const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "vampireSurvivorsBestScore";
const ARENA_PAD = 16;

const PLAYER_SIZE = 20;
const PLAYER_SPEED = 140;
const MAX_HP = 5;
const INVULN_TIME = 0.6;

const XP_MAGNET_RADIUS = 55;
const XP_PULL_SPEED = 260;
const GEM_SIZE = 8;

const MAX_WEAPONS = 3;
const MAX_LEVEL = 3;
const WEAPON_KEYS = ["bolt", "orbit", "aura"];

const WEAPON_DEFS = {
    bolt: {
        name: "Arcane Bolt",
        desc: "Auto-fires at the nearest enemy.",
        levels: [
            { cooldown: 0.9, count: 1, damage: 10, speed: 260 },
            { cooldown: 0.75, count: 2, damage: 12, speed: 280 },
            { cooldown: 0.6, count: 3, damage: 15, speed: 300 },
        ],
    },
    orbit: {
        name: "Spirit Orbs",
        desc: "Orbiting blades that damage on contact.",
        levels: [
            { count: 1, radius: 42, damage: 6, hitCooldown: 0.5, spinSpeed: 2.4 },
            { count: 2, radius: 46, damage: 8, hitCooldown: 0.45, spinSpeed: 2.8 },
            { count: 3, radius: 50, damage: 10, hitCooldown: 0.4, spinSpeed: 3.2 },
        ],
    },
    aura: {
        name: "Holy Aura",
        desc: "Pulses damage to nearby enemies.",
        levels: [
            { radius: 50, damage: 8, pulseCooldown: 1.2 },
            { radius: 65, damage: 10, pulseCooldown: 1.0 },
            { radius: 80, damage: 14, pulseCooldown: 0.85 },
        ],
    },
};

const PLAYER_COLOR = [245, 239, 238];
const ENEMY_COLOR = [220, 38, 38];
const ELITE_COLOR = [168, 85, 247];
const PROJECTILE_COLOR = [251, 191, 36];
const GEM_COLOR = [74, 222, 128];
const ORBIT_COLOR = [168, 85, 247];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [10, 5, 9],
    letterbox: true,
    global: true,
});

const hudTime = document.getElementById("hud-time");
const hudHp = document.getElementById("hud-hp");
const hudLevel = document.getElementById("hud-level");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");
const levelupOverlay = document.getElementById("levelup-overlay");
const choiceRow = document.getElementById("choice-row");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let elapsedTime = 0;
let level = 1;
let xp = 0;
let xpNeeded = xpToNext(level);
let killCount = 0;
let spawnTimer = 0;
let eliteTimer = 18;
let orbitAngle = 0;

let player = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, hp: MAX_HP, maxHp: MAX_HP, speedMult: 1, magnetRadius: XP_MAGNET_RADIUS, invulnTime: 0, obj: null };
let ownedWeapons = [];
let weaponTimers = { bolt: 0, aura: 0 };
let enemies = [];
let projectiles = [];
let gems = [];
let orbitObjs = [];
let auraPulses = [];
const keys = { up: false, down: false, left: false, right: false };

add([
    rect(GAME_WIDTH - ARENA_PAD * 2, GAME_HEIGHT - ARENA_PAD * 2),
    pos(GAME_WIDTH / 2, GAME_HEIGHT / 2),
    anchor("center"),
    color(16, 8, 13),
    outline(2, rgb(90, 40, 70)),
    z(0),
]);

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function xpToNext(lvl) {
    return 5 + (lvl - 1) * 4;
}

function formatTime(t) {
    const total = Math.max(0, Math.floor(t));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function currentScore() {
    return killCount * 5 + Math.floor(elapsedTime) + (level - 1) * 10;
}

function updateHud() {
    hudTime.textContent = formatTime(elapsedTime);
    hudHp.textContent = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;
    hudLevel.textContent = level;
    hudBest.textContent = best;
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function randomEdgePoint() {
    const edge = Math.floor(randomBetween(0, 4));
    if (edge === 0) return { x: randomBetween(ARENA_PAD, GAME_WIDTH - ARENA_PAD), y: ARENA_PAD };
    if (edge === 1) return { x: randomBetween(ARENA_PAD, GAME_WIDTH - ARENA_PAD), y: GAME_HEIGHT - ARENA_PAD };
    if (edge === 2) return { x: ARENA_PAD, y: randomBetween(ARENA_PAD, GAME_HEIGHT - ARENA_PAD) };
    return { x: GAME_WIDTH - ARENA_PAD, y: randomBetween(ARENA_PAD, GAME_HEIGHT - ARENA_PAD) };
}

function createEnemyObj(e) {
    const col = e.elite ? ELITE_COLOR : ENEMY_COLOR;
    e.obj = add([
        pos(e.x, e.y),
        anchor("center"),
        circle(e.size / 2),
        color(col[0], col[1], col[2]),
        outline(2, e.elite ? rgb(251, 191, 36) : rgb(80, 10, 15)),
        z(3),
    ]);
}

function createProjectileObj(p) {
    p.obj = add([
        pos(p.x, p.y),
        anchor("center"),
        circle(4),
        color(PROJECTILE_COLOR[0], PROJECTILE_COLOR[1], PROJECTILE_COLOR[2]),
        z(4),
    ]);
}

function createGemObj(g) {
    g.obj = add([
        pos(g.x, g.y),
        anchor("center"),
        rect(GEM_SIZE, GEM_SIZE),
        anchor("center"),
        color(GEM_COLOR[0], GEM_COLOR[1], GEM_COLOR[2]),
        z(2),
    ]);
}

function spawnEnemy(elite) {
    const p = randomEdgePoint();
    const hpMult = 1 + elapsedTime * 0.02;
    const speedBonus = Math.min(30, elapsedTime * 0.15);
    const e = elite
        ? { x: p.x, y: p.y, size: 28, hp: 80 * hpMult, maxHp: 80 * hpMult, speed: 38 + speedBonus * 0.6, damage: 2, xp: 5, elite: true, alive: true, orbitCooldown: 0, obj: null }
        : { x: p.x, y: p.y, size: 18, hp: 20 * hpMult, maxHp: 20 * hpMult, speed: 45 + speedBonus, damage: 1, xp: 1, elite: false, alive: true, orbitCooldown: 0, obj: null };
    enemies.push(e);
    createEnemyObj(e);
}

function spawnGem(x, y, value) {
    const g = { x, y, value, collected: false, obj: null };
    gems.push(g);
    createGemObj(g);
}

function ensureOrbitObjs(lvl) {
    orbitObjs.forEach((o) => { if (o.obj) destroy(o.obj); });
    orbitObjs = [];
    for (let i = 0; i < lvl; i++) {
        const angleOffset = (Math.PI * 2 * i) / lvl;
        const o = { x: player.x, y: player.y, angleOffset, obj: null };
        o.obj = add([
            pos(o.x, o.y),
            anchor("center"),
            circle(7),
            color(ORBIT_COLOR[0], ORBIT_COLOR[1], ORBIT_COLOR[2]),
            outline(2, rgb(250, 240, 255)),
            z(4),
        ]);
        orbitObjs.push(o);
    }
}

function clearBoardObjs() {
    enemies.forEach((e) => { if (e.obj) destroy(e.obj); });
    enemies = [];
    projectiles.forEach((p) => { if (p.obj) destroy(p.obj); });
    projectiles = [];
    gems.forEach((g) => { if (g.obj) destroy(g.obj); });
    gems = [];
    orbitObjs.forEach((o) => { if (o.obj) destroy(o.obj); });
    orbitObjs = [];
    auraPulses.forEach((a) => { if (a.obj) destroy(a.obj); });
    auraPulses = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
}

function resetGame() {
    clearBoardObjs();

    player = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, hp: MAX_HP, maxHp: MAX_HP, speedMult: 1, magnetRadius: XP_MAGNET_RADIUS, invulnTime: 0, obj: null };
    ownedWeapons = [{ key: "bolt", level: 1 }];
    weaponTimers = { bolt: 0, aura: 0 };
    elapsedTime = 0;
    level = 1;
    xp = 0;
    xpNeeded = xpToNext(level);
    killCount = 0;
    spawnTimer = 0.6;
    eliteTimer = 18;
    orbitAngle = 0;
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;

    player.obj = add([
        pos(player.x, player.y),
        anchor("center"),
        circle(PLAYER_SIZE / 2),
        color(PLAYER_COLOR[0], PLAYER_COLOR[1], PLAYER_COLOR[2]),
        opacity(1),
        outline(2, rgb(168, 85, 247)),
        z(5),
    ]);
}

function handleMovement(dtVal) {
    let vx = 0;
    let vy = 0;
    if (keys.left) vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up) vy -= 1;
    if (keys.down) vy += 1;
    if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
    }
    player.x += vx * PLAYER_SPEED * player.speedMult * dtVal;
    player.y += vy * PLAYER_SPEED * player.speedMult * dtVal;
    player.x = clamp(player.x, ARENA_PAD + PLAYER_SIZE / 2, GAME_WIDTH - ARENA_PAD - PLAYER_SIZE / 2);
    player.y = clamp(player.y, ARENA_PAD + PLAYER_SIZE / 2, GAME_HEIGHT - ARENA_PAD - PLAYER_SIZE / 2);
}

function updateSpawning(dtVal) {
    spawnTimer -= dtVal;
    const interval = Math.max(0.35, 1.5 - elapsedTime * 0.012);
    if (spawnTimer <= 0) {
        spawnEnemy(false);
        spawnTimer = interval;
    }
    eliteTimer -= dtVal;
    if (eliteTimer <= 0) {
        spawnEnemy(true);
        eliteTimer = 18;
    }
}

function takeDamage(amount) {
    if (player.invulnTime > 0) return;
    player.hp -= amount;
    player.invulnTime = INVULN_TIME;
    shake(3);
}

function updateEnemies(dtVal) {
    enemies.forEach((e) => {
        if (!e.alive) return;
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.speed * dtVal;
        e.y += (dy / d) * e.speed * dtVal;
        const overlap = d < e.size / 2 + PLAYER_SIZE / 2;
        if (overlap && player.invulnTime <= 0) {
            takeDamage(e.damage);
        }
    });
}

function findNearestEnemy() {
    let best2 = null;
    let bestDist = Infinity;
    enemies.forEach((e) => {
        if (!e.alive) return;
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < bestDist) {
            bestDist = d;
            best2 = e;
        }
    });
    return best2;
}

function damageEnemy(e, dmg) {
    if (!e.alive) return;
    e.hp -= dmg;
    if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
    e.alive = false;
    if (e.obj) {
        destroy(e.obj);
        e.obj = null;
    }
    killCount += 1;
    spawnGem(e.x, e.y, e.xp);
}

function fireBolts(lvl) {
    const target = findNearestEnemy();
    if (!target) return;
    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
    const spread = 0.22;
    const count = lvl.count;
    for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * spread;
        const ang = baseAngle + offset;
        const p = {
            x: player.x, y: player.y,
            vx: Math.cos(ang) * lvl.speed, vy: Math.sin(ang) * lvl.speed,
            damage: lvl.damage, life: 2.0, hit: false, obj: null,
        };
        projectiles.push(p);
        createProjectileObj(p);
    }
}

function spawnAuraPulse(radius) {
    const a = {
        timeLeft: 0.25, maxTime: 0.25,
        obj: add([
            pos(player.x, player.y),
            anchor("center"),
            circle(radius),
            color(251, 191, 36),
            opacity(0.35),
            z(1),
        ]),
    };
    auraPulses.push(a);
}

function pulseAura(lvl) {
    enemies.forEach((e) => {
        if (!e.alive) return;
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d <= lvl.radius) damageEnemy(e, lvl.damage);
    });
    spawnAuraPulse(lvl.radius);
}

function updateWeapons(dtVal) {
    ownedWeapons.forEach((w) => {
        if (w.key === "bolt") {
            weaponTimers.bolt -= dtVal;
            const lvl = WEAPON_DEFS.bolt.levels[w.level - 1];
            if (weaponTimers.bolt <= 0) {
                fireBolts(lvl);
                weaponTimers.bolt = lvl.cooldown;
            }
        } else if (w.key === "aura") {
            weaponTimers.aura -= dtVal;
            const lvl = WEAPON_DEFS.aura.levels[w.level - 1];
            if (weaponTimers.aura <= 0) {
                pulseAura(lvl);
                weaponTimers.aura = lvl.pulseCooldown;
            }
        }
    });
}

function updateProjectiles(dtVal) {
    projectiles.forEach((p) => {
        if (p.hit) return;
        p.x += p.vx * dtVal;
        p.y += p.vy * dtVal;
        p.life -= dtVal;
        enemies.forEach((e) => {
            if (!e.alive || p.hit) return;
            const d = Math.hypot(p.x - e.x, p.y - e.y);
            if (d < e.size / 2 + 4) {
                damageEnemy(e, p.damage);
                p.hit = true;
            }
        });
    });
    projectiles = projectiles.filter((p) => {
        const outOfBounds = p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT;
        if (p.hit || p.life <= 0 || outOfBounds) {
            if (p.obj) destroy(p.obj);
            return false;
        }
        return true;
    });
}

function updateOrbits(dtVal) {
    const ow = ownedWeapons.find((w) => w.key === "orbit");
    if (!ow || orbitObjs.length === 0) return;
    const lvl = WEAPON_DEFS.orbit.levels[ow.level - 1];
    orbitAngle += lvl.spinSpeed * dtVal;
    orbitObjs.forEach((o) => {
        const ang = orbitAngle + o.angleOffset;
        o.x = player.x + Math.cos(ang) * lvl.radius;
        o.y = player.y + Math.sin(ang) * lvl.radius;
    });
    enemies.forEach((e) => {
        if (!e.alive) return;
        if (e.orbitCooldown > 0) {
            e.orbitCooldown -= dtVal;
            return;
        }
        for (const o of orbitObjs) {
            const d = Math.hypot(o.x - e.x, o.y - e.y);
            if (d < e.size / 2 + 6) {
                damageEnemy(e, lvl.damage);
                e.orbitCooldown = lvl.hitCooldown;
                break;
            }
        }
    });
}

function updateAuraPulses(dtVal) {
    auraPulses.forEach((a) => {
        a.timeLeft -= dtVal;
        if (a.obj) a.obj.opacity = Math.max(0, (a.timeLeft / a.maxTime) * 0.35);
    });
    auraPulses = auraPulses.filter((a) => {
        if (a.timeLeft <= 0) {
            if (a.obj) destroy(a.obj);
            return false;
        }
        return true;
    });
}

function updateGems(dtVal) {
    gems.forEach((g) => {
        if (g.collected) return;
        const d = Math.hypot(player.x - g.x, player.y - g.y);
        if (d < player.magnetRadius) {
            const pull = Math.min(d, XP_PULL_SPEED * dtVal);
            if (d > 0.001) {
                g.x += ((player.x - g.x) / d) * pull;
                g.y += ((player.y - g.y) / d) * pull;
            }
        }
        if (d < PLAYER_SIZE / 2 + GEM_SIZE / 2) {
            g.collected = true;
            xp += g.value;
            if (g.obj) destroy(g.obj);
        }
    });
    gems = gems.filter((g) => !g.collected);
}

function syncPositions() {
    if (player.obj) {
        player.obj.pos.x = player.x;
        player.obj.pos.y = player.y;
        player.obj.opacity = player.invulnTime > 0 && Math.floor(time() * 14) % 2 === 0 ? 0.35 : 1;
    }
    enemies.forEach((e) => {
        if (!e.obj || !e.alive) return;
        e.obj.pos.x = e.x;
        e.obj.pos.y = e.y;
    });
    projectiles.forEach((p) => {
        if (!p.obj) return;
        p.obj.pos.x = p.x;
        p.obj.pos.y = p.y;
    });
    gems.forEach((g) => {
        if (!g.obj) return;
        g.obj.pos.x = g.x;
        g.obj.pos.y = g.y;
    });
    orbitObjs.forEach((o) => {
        if (!o.obj) return;
        o.obj.pos.x = o.x;
        o.obj.pos.y = o.y;
    });
}

function buildCandidates() {
    const list = [];
    WEAPON_KEYS.forEach((key) => {
        const owned = ownedWeapons.find((w) => w.key === key);
        if (!owned) {
            if (ownedWeapons.length < MAX_WEAPONS) list.push({ type: "new", key });
        } else if (owned.level < MAX_LEVEL) {
            list.push({ type: "upgrade", key });
        }
    });
    if (player.hp < player.maxHp) list.push({ type: "misc", key: "heal" });
    list.push({ type: "misc", key: "speed" });
    list.push({ type: "misc", key: "magnet" });
    return list;
}

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(randomBetween(0, i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getLevelUpChoices() {
    let candidates = shuffleArray(buildCandidates()).slice(0, 3);
    let fillIdx = 0;
    while (candidates.length < 3) {
        candidates.push({ type: "misc", key: fillIdx % 2 === 0 ? "speed" : "magnet" });
        fillIdx += 1;
    }
    return candidates;
}

function describeLevel(key, lvl) {
    const def = WEAPON_DEFS[key].levels[lvl - 1];
    if (key === "bolt") return `${def.count} bolt(s), ${def.damage} dmg`;
    if (key === "orbit") return `${def.count} orb(s), ${def.damage} dmg`;
    return `${def.radius}px radius, ${def.damage} dmg`;
}

function describeChoice(choice) {
    if (choice.type === "new") {
        return { name: `New: ${WEAPON_DEFS[choice.key].name}`, desc: WEAPON_DEFS[choice.key].desc };
    }
    if (choice.type === "upgrade") {
        const w = ownedWeapons.find((ow) => ow.key === choice.key);
        const nextLevel = w.level + 1;
        return { name: `${WEAPON_DEFS[choice.key].name} → Lv.${nextLevel}`, desc: describeLevel(choice.key, nextLevel) };
    }
    if (choice.key === "heal") return { name: "Heal", desc: "Restore 2 HP" };
    if (choice.key === "speed") return { name: "Swift Boots", desc: "+8% move speed" };
    return { name: "Magnet", desc: "+25 pickup radius" };
}

function applyChoice(choice) {
    if (choice.type === "new") {
        ownedWeapons.push({ key: choice.key, level: 1 });
        if (choice.key === "orbit") ensureOrbitObjs(1);
    } else if (choice.type === "upgrade") {
        const w = ownedWeapons.find((ow) => ow.key === choice.key);
        w.level = Math.min(MAX_LEVEL, w.level + 1);
        if (choice.key === "orbit") ensureOrbitObjs(w.level);
    } else if (choice.key === "heal") {
        player.hp = Math.min(player.maxHp, player.hp + 2);
    } else if (choice.key === "speed") {
        player.speedMult = Math.min(1.6, player.speedMult + 0.08);
    } else if (choice.key === "magnet") {
        player.magnetRadius = Math.min(200, player.magnetRadius + 25);
    }
    resumeFromLevelUp();
}

function renderLevelUpChoices(candidates) {
    choiceRow.innerHTML = "";
    candidates.forEach((choice) => {
        const info = describeChoice(choice);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        const nameEl = document.createElement("span");
        nameEl.className = "choice-btn__name";
        nameEl.textContent = info.name;
        const descEl = document.createElement("span");
        descEl.className = "choice-btn__desc";
        descEl.textContent = info.desc;
        btn.appendChild(nameEl);
        btn.appendChild(descEl);
        btn.addEventListener("click", () => applyChoice(choice));
        choiceRow.appendChild(btn);
    });
}

function triggerLevelUp() {
    state = "levelup";
    renderLevelUpChoices(getLevelUpChoices());
    levelupOverlay.hidden = false;
}

function resumeFromLevelUp() {
    levelupOverlay.hidden = true;
    state = "playing";
}

function checkLevelUp() {
    if (xp >= xpNeeded) {
        xp -= xpNeeded;
        level += 1;
        xpNeeded = xpToNext(level);
        triggerLevelUp();
    }
}

function checkGameOver() {
    if (player.hp <= 0) gameOver();
}

function gameOver() {
    state = "gameover";
    const finalScore = currentScore();
    if (finalScore > best) {
        best = finalScore;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay(
        "Game Over",
        `Survived ${formatTime(elapsedTime)}, reached Lv.${level}, ${killCount} kills. Score: ${finalScore}. Press to try again.`,
        "Try Again"
    );
}

function updateGame(dtVal) {
    if (state !== "playing") return;
    elapsedTime += dtVal;
    handleMovement(dtVal);
    updateSpawning(dtVal);
    updateEnemies(dtVal);
    updateWeapons(dtVal);
    updateProjectiles(dtVal);
    updateOrbits(dtVal);
    updateAuraPulses(dtVal);
    updateGems(dtVal);
    if (player.invulnTime > 0) player.invulnTime -= dtVal;
    enemies = enemies.filter((e) => e.alive);
    syncPositions();
    updateHud();
    checkLevelUp();
    checkGameOver();
}

function startGame() {
    resetGame();
    state = "playing";
    overlay.hidden = true;
    levelupOverlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing" && state !== "levelup") startGame();
}

overlayBtn.addEventListener("click", pressStart);

window.addEventListener("keydown", (e) => {
    if (e.key.startsWith("Arrow")) e.preventDefault();
    if (state !== "playing") {
        if (e.key === " ") pressStart();
        return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
});

document.querySelectorAll(".dpad-btn").forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => {
        e.preventDefault();
        if (state !== "playing") {
            pressStart();
            return;
        }
        btn.classList.add("is-pressed");
        keys[dir] = true;
    };
    const release = (e) => {
        e.preventDefault();
        btn.classList.remove("is-pressed");
        keys[dir] = false;
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
});

onUpdate(() => {
    if (state !== "playing") return;
    const dtVal = Math.min(dt(), 0.05);
    updateGame(dtVal);
});

resetGame();
updateHud();

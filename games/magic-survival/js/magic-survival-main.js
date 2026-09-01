const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "magicSurvivalBestScore";
const ARENA_PAD = 16;

const PLAYER_SIZE = 20;
const PLAYER_SPEED = 140;
const MAX_HP = 5;
const INVULN_TIME = 0.6;

const XP_MAGNET_RADIUS = 55;
const XP_PULL_SPEED = 260;
const GEM_SIZE = 8;

const MAX_WEAPONS = 3;
const MAX_BASE_LEVEL = 3;
const MAX_FUSION_LEVEL = 2;
const BASE_KEYS = ["fire", "ice", "lightning"];

const BASE_DEFS = {
    fire: {
        name: "Fireball",
        desc: "Homing fireball; damages + splashes nearby foes.",
        levels: [
            { cooldown: 0.9, damage: 12, speed: 260, splashRadius: 26, splashDamage: 6 },
            { cooldown: 0.75, damage: 15, speed: 280, splashRadius: 30, splashDamage: 8 },
            { cooldown: 0.6, damage: 19, speed: 300, splashRadius: 34, splashDamage: 11 },
        ],
    },
    ice: {
        name: "Frost Pulse",
        desc: "Pulses AoE damage and slows nearby foes.",
        levels: [
            { radius: 55, damage: 6, pulseCooldown: 1.3, slowFactor: 0.5, slowDuration: 1.5 },
            { radius: 68, damage: 8, pulseCooldown: 1.1, slowFactor: 0.55, slowDuration: 1.8 },
            { radius: 80, damage: 11, pulseCooldown: 0.95, slowFactor: 0.6, slowDuration: 2.2 },
        ],
    },
    lightning: {
        name: "Chain Bolt",
        desc: "Zaps the nearest foe, then chains to others.",
        levels: [
            { cooldown: 1.0, damage: 14, chainCount: 2, chainRange: 90, chainFalloff: 0.75 },
            { cooldown: 0.85, damage: 17, chainCount: 3, chainRange: 100, chainFalloff: 0.78 },
            { cooldown: 0.7, damage: 21, chainCount: 4, chainRange: 110, chainFalloff: 0.8 },
        ],
    },
};

const FUSION_DEFS = {
    steam: {
        name: "Steam Nova",
        desc: "Massive nova: heavy damage + strong slow.",
        parents: ["fire", "ice"],
        color: [186, 230, 253],
        levels: [
            { radius: 90, damage: 26, pulseCooldown: 1.6, slowFactor: 0.4, slowDuration: 2.5 },
            { radius: 105, damage: 34, pulseCooldown: 1.4, slowFactor: 0.35, slowDuration: 3.0 },
        ],
    },
    plasma: {
        name: "Plasma Chain",
        desc: "Chain lightning that splashes on every jump.",
        parents: ["fire", "lightning"],
        color: [251, 191, 36],
        levels: [
            { cooldown: 0.8, damage: 22, chainCount: 4, chainRange: 110, chainFalloff: 0.8, splashRadius: 30, splashDamage: 10 },
            { cooldown: 0.65, damage: 27, chainCount: 5, chainRange: 120, chainFalloff: 0.82, splashRadius: 34, splashDamage: 13 },
        ],
    },
    blizzard: {
        name: "Frost Chain",
        desc: "Chain lightning that slows every target hit.",
        parents: ["ice", "lightning"],
        color: [224, 242, 254],
        levels: [
            { cooldown: 0.85, damage: 20, chainCount: 4, chainRange: 110, chainFalloff: 0.8, slowFactor: 0.5, slowDuration: 2.0 },
            { cooldown: 0.7, damage: 25, chainCount: 5, chainRange: 120, chainFalloff: 0.82, slowFactor: 0.55, slowDuration: 2.4 },
        ],
    },
};
const FUSION_KEYS = Object.keys(FUSION_DEFS);

const PLAYER_COLOR = [242, 246, 250];
const ENEMY_COLOR = [244, 63, 94];
const ELITE_COLOR = [250, 204, 21];
const GEM_COLOR = [56, 189, 248];
const FIRE_COLOR = [251, 146, 60];
const ICE_COLOR = [125, 211, 252];
const LIGHTNING_COLOR = [250, 204, 21];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [5, 7, 10],
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

let player = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, hp: MAX_HP, maxHp: MAX_HP, speedMult: 1, magnetRadius: XP_MAGNET_RADIUS, invulnTime: 0, obj: null };
let ownedWeapons = [];
let weaponTimers = {};
let enemies = [];
let projectiles = [];
let gems = [];
let pulseFx = [];
const keys = { up: false, down: false, left: false, right: false };

add([
    rect(GAME_WIDTH - ARENA_PAD * 2, GAME_HEIGHT - ARENA_PAD * 2),
    pos(GAME_WIDTH / 2, GAME_HEIGHT / 2),
    anchor("center"),
    color(10, 12, 18),
    outline(2, rgb(40, 70, 90)),
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
        outline(2, e.elite ? rgb(250, 250, 250) : rgb(70, 10, 20)),
        z(3),
    ]);
}

function createProjectileObj(p) {
    const col = p.colorRGB || FIRE_COLOR;
    p.obj = add([
        pos(p.x, p.y),
        anchor("center"),
        circle(4),
        color(col[0], col[1], col[2]),
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
        ? { x: p.x, y: p.y, size: 28, hp: 80 * hpMult, maxHp: 80 * hpMult, speed: 38 + speedBonus * 0.6, damage: 2, xp: 5, elite: true, alive: true, slowFactor: 1, slowTimer: 0, obj: null }
        : { x: p.x, y: p.y, size: 18, hp: 20 * hpMult, maxHp: 20 * hpMult, speed: 45 + speedBonus, damage: 1, xp: 1, elite: false, alive: true, slowFactor: 1, slowTimer: 0, obj: null };
    enemies.push(e);
    createEnemyObj(e);
}

function spawnGem(x, y, value) {
    const g = { x, y, value, collected: false, obj: null };
    gems.push(g);
    createGemObj(g);
}

function spawnPulseFx(x, y, radius, colorRGB) {
    pulseFx.push({
        timeLeft: 0.25, maxTime: 0.25,
        obj: add([
            pos(x, y),
            anchor("center"),
            circle(radius),
            color(colorRGB[0], colorRGB[1], colorRGB[2]),
            opacity(0.32),
            z(1),
        ]),
    });
}

function spawnZapFlash(x, y, colorRGB) {
    pulseFx.push({
        timeLeft: 0.15, maxTime: 0.15,
        obj: add([
            pos(x, y),
            anchor("center"),
            circle(10),
            color(colorRGB[0], colorRGB[1], colorRGB[2]),
            opacity(0.6),
            z(4),
        ]),
    });
}

function clearBoardObjs() {
    enemies.forEach((e) => { if (e.obj) destroy(e.obj); });
    enemies = [];
    projectiles.forEach((p) => { if (p.obj) destroy(p.obj); });
    projectiles = [];
    gems.forEach((g) => { if (g.obj) destroy(g.obj); });
    gems = [];
    pulseFx.forEach((a) => { if (a.obj) destroy(a.obj); });
    pulseFx = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
}

function resetGame() {
    clearBoardObjs();

    player = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, hp: MAX_HP, maxHp: MAX_HP, speedMult: 1, magnetRadius: XP_MAGNET_RADIUS, invulnTime: 0, obj: null };
    ownedWeapons = [{ key: "fire", level: 1 }];
    weaponTimers = { fire: 0, ice: 0, lightning: 0, steam: 0, plasma: 0, blizzard: 0 };
    elapsedTime = 0;
    level = 1;
    xp = 0;
    xpNeeded = xpToNext(level);
    killCount = 0;
    spawnTimer = 0.6;
    eliteTimer = 18;
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
        outline(2, rgb(56, 189, 248)),
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
        if (e.slowTimer > 0) {
            e.slowTimer -= dtVal;
            if (e.slowTimer <= 0) e.slowFactor = 1;
        }
        const effSpeed = e.speed * (e.slowTimer > 0 ? e.slowFactor : 1);
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * effSpeed * dtVal;
        e.y += (dy / d) * effSpeed * dtVal;
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

function findNearestEnemyExcluding(excludeSet, fromX, fromY, maxRange) {
    let best2 = null;
    let bestDist = Infinity;
    enemies.forEach((e) => {
        if (!e.alive || excludeSet.has(e)) return;
        const d = Math.hypot(fromX - e.x, fromY - e.y);
        if (d <= maxRange && d < bestDist) {
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

function applySlow(e, factor, duration) {
    if (!e.alive) return;
    if (e.slowTimer <= 0 || factor < e.slowFactor) e.slowFactor = factor;
    e.slowTimer = Math.max(e.slowTimer, duration);
}

function splashAt(x, y, radius, dmg, excludeEnemy) {
    enemies.forEach((e) => {
        if (!e.alive || e === excludeEnemy) return;
        const d = Math.hypot(x - e.x, y - e.y);
        if (d <= radius) damageEnemy(e, dmg);
    });
}

function fireFireball(lvl) {
    const target = findNearestEnemy();
    if (!target) return;
    const ang = Math.atan2(target.y - player.y, target.x - player.x);
    const p = {
        x: player.x, y: player.y,
        vx: Math.cos(ang) * lvl.speed, vy: Math.sin(ang) * lvl.speed,
        damage: lvl.damage, splashRadius: lvl.splashRadius, splashDamage: lvl.splashDamage,
        life: 2.0, hit: false, colorRGB: FIRE_COLOR, obj: null,
    };
    projectiles.push(p);
    createProjectileObj(p);
}

function pulseElement(lvl, colorRGB) {
    enemies.forEach((e) => {
        if (!e.alive) return;
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d <= lvl.radius) {
            damageEnemy(e, lvl.damage);
            if (lvl.slowFactor) applySlow(e, lvl.slowFactor, lvl.slowDuration);
        }
    });
    spawnPulseFx(player.x, player.y, lvl.radius, colorRGB);
}

function fireChain(lvl, colorRGB) {
    const start = findNearestEnemy();
    if (!start) return;
    const visited = new Set();
    let current = start;
    let dmg = lvl.damage;
    let hops = 0;
    while (current && hops <= lvl.chainCount) {
        damageEnemy(current, dmg);
        if (lvl.splashDamage) splashAt(current.x, current.y, lvl.splashRadius, lvl.splashDamage, current);
        if (lvl.slowFactor) applySlow(current, lvl.slowFactor, lvl.slowDuration);
        spawnZapFlash(current.x, current.y, colorRGB);
        visited.add(current);
        const from = current;
        current = findNearestEnemyExcluding(visited, from.x, from.y, lvl.chainRange);
        dmg *= lvl.chainFalloff;
        hops += 1;
    }
}

function updateWeapons(dtVal) {
    ownedWeapons.forEach((w) => {
        weaponTimers[w.key] -= dtVal;
        if (weaponTimers[w.key] > 0) return;
        if (w.key === "fire") {
            const lvl = BASE_DEFS.fire.levels[w.level - 1];
            fireFireball(lvl);
            weaponTimers.fire = lvl.cooldown;
        } else if (w.key === "ice") {
            const lvl = BASE_DEFS.ice.levels[w.level - 1];
            pulseElement(lvl, ICE_COLOR);
            weaponTimers.ice = lvl.pulseCooldown;
        } else if (w.key === "lightning") {
            const lvl = BASE_DEFS.lightning.levels[w.level - 1];
            fireChain(lvl, LIGHTNING_COLOR);
            weaponTimers.lightning = lvl.cooldown;
        } else if (w.key === "steam") {
            const lvl = FUSION_DEFS.steam.levels[w.level - 1];
            pulseElement(lvl, FUSION_DEFS.steam.color);
            weaponTimers.steam = lvl.pulseCooldown;
        } else if (w.key === "plasma") {
            const lvl = FUSION_DEFS.plasma.levels[w.level - 1];
            fireChain(lvl, FUSION_DEFS.plasma.color);
            weaponTimers.plasma = lvl.cooldown;
        } else if (w.key === "blizzard") {
            const lvl = FUSION_DEFS.blizzard.levels[w.level - 1];
            fireChain(lvl, FUSION_DEFS.blizzard.color);
            weaponTimers.blizzard = lvl.cooldown;
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
                if (p.splashDamage) splashAt(p.x, p.y, p.splashRadius, p.splashDamage, e);
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

function updatePulseFx(dtVal) {
    pulseFx.forEach((a) => {
        a.timeLeft -= dtVal;
        if (a.obj) a.obj.opacity = Math.max(0, (a.timeLeft / a.maxTime) * 0.32);
    });
    pulseFx = pulseFx.filter((a) => {
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
}

function buildCandidates() {
    const list = [];
    const fuseList = [];

    FUSION_KEYS.forEach((fkey) => {
        const alreadyFused = ownedWeapons.find((w) => w.key === fkey);
        if (alreadyFused) return;
        const [pa, pb] = FUSION_DEFS[fkey].parents;
        const w1 = ownedWeapons.find((w) => w.key === pa);
        const w2 = ownedWeapons.find((w) => w.key === pb);
        if (w1 && w2 && w1.level === MAX_BASE_LEVEL && w2.level === MAX_BASE_LEVEL) {
            fuseList.push({ type: "fuse", key: fkey, parents: [pa, pb] });
        }
    });

    BASE_KEYS.forEach((key) => {
        const owned = ownedWeapons.find((w) => w.key === key);
        if (!owned) {
            if (ownedWeapons.length < MAX_WEAPONS) list.push({ type: "new", key });
        } else if (owned.level < MAX_BASE_LEVEL) {
            list.push({ type: "upgrade", key });
        }
    });
    ownedWeapons.forEach((w) => {
        if (FUSION_KEYS.includes(w.key) && w.level < MAX_FUSION_LEVEL) {
            list.push({ type: "upgrade", key: w.key });
        }
    });

    if (player.hp < player.maxHp) list.push({ type: "misc", key: "heal" });
    list.push({ type: "misc", key: "speed" });
    list.push({ type: "misc", key: "magnet" });

    return { fuseList, list };
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
    const { fuseList, list } = buildCandidates();
    let candidates = fuseList.slice(0, 3).concat(shuffleArray(list));
    candidates = candidates.slice(0, 3);
    let fillIdx = 0;
    while (candidates.length < 3) {
        candidates.push({ type: "misc", key: fillIdx % 2 === 0 ? "speed" : "magnet" });
        fillIdx += 1;
    }
    return candidates;
}

function weaponDef(key) {
    return BASE_DEFS[key] || FUSION_DEFS[key];
}

function describeLevel(key, lvl) {
    const def = weaponDef(key).levels[lvl - 1];
    if (def.chainCount !== undefined) return `${def.chainCount + 1} targets, ${Math.round(def.damage)} dmg`;
    if (def.radius !== undefined) return `${def.radius}px radius, ${def.damage} dmg`;
    return `${def.damage} dmg, splash ${def.splashDamage}`;
}

function describeChoice(choice) {
    if (choice.type === "fuse") {
        const def = FUSION_DEFS[choice.key];
        return { name: `FUSE: ${weaponDef(choice.parents[0]).name} + ${weaponDef(choice.parents[1]).name}`, desc: `→ ${def.name}. ${def.desc}` };
    }
    if (choice.type === "new") {
        return { name: `New: ${weaponDef(choice.key).name}`, desc: weaponDef(choice.key).desc };
    }
    if (choice.type === "upgrade") {
        const w = ownedWeapons.find((ow) => ow.key === choice.key);
        const nextLevel = w.level + 1;
        return { name: `${weaponDef(choice.key).name} → Lv.${nextLevel}`, desc: describeLevel(choice.key, nextLevel) };
    }
    if (choice.key === "heal") return { name: "Heal", desc: "Restore 2 HP" };
    if (choice.key === "speed") return { name: "Swift Boots", desc: "+8% move speed" };
    return { name: "Magnet", desc: "+25 pickup radius" };
}

function applyChoice(choice) {
    if (choice.type === "fuse") {
        ownedWeapons = ownedWeapons.filter((w) => !choice.parents.includes(w.key));
        ownedWeapons.push({ key: choice.key, level: 1 });
    } else if (choice.type === "new") {
        ownedWeapons.push({ key: choice.key, level: 1 });
    } else if (choice.type === "upgrade") {
        const w = ownedWeapons.find((ow) => ow.key === choice.key);
        const cap = FUSION_KEYS.includes(choice.key) ? MAX_FUSION_LEVEL : MAX_BASE_LEVEL;
        w.level = Math.min(cap, w.level + 1);
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
        btn.className = choice.type === "fuse" ? "choice-btn choice-btn--fuse" : "choice-btn";
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
    updatePulseFx(dtVal);
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

const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "twentyMinutesTillDawnBestScore";
const ARENA_PAD = 16;
const DAWN_TIME = 1200;
const DAWN_BONUS = 300;

const PLAYER_SIZE = 20;
const PLAYER_SPEED = 140;
const MAX_HP_CAP = 10;
const INVULN_TIME = 0.6;

const XP_MAGNET_RADIUS = 55;
const XP_PULL_SPEED = 260;
const GEM_SIZE = 8;

const WEAPON_KEYS = ["pistol", "smg", "shotgun", "rifle"];
const WEAPON_DEFS = {
    pistol: { name: "Pistol", desc: "Balanced starter sidearm.", clipSize: 8, reloadTime: 1.0, fireInterval: 0.35, damage: 14, bulletSpeed: 340 },
    smg: { name: "SMG", desc: "Fast fire, low damage per shot.", clipSize: 20, reloadTime: 1.4, fireInterval: 0.12, damage: 7, bulletSpeed: 380 },
    shotgun: { name: "Shotgun", desc: "Fires a spread of 4 pellets.", clipSize: 5, reloadTime: 1.6, fireInterval: 0.55, damage: 9, bulletSpeed: 320, pellets: 4, spread: 0.35 },
    rifle: { name: "Rifle", desc: "High damage, precise shots.", clipSize: 12, reloadTime: 1.2, fireInterval: 0.22, damage: 20, bulletSpeed: 460 },
};

const PLAYER_COLOR = [242, 240, 250];
const ENEMY_COLOR = [244, 63, 94];
const ELITE_COLOR = [129, 140, 248];
const PROJECTILE_COLOR = [250, 204, 21];
const GEM_COLOR = [129, 140, 248];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [6, 8, 20],
    letterbox: true,
    global: true,
});

const hudTime = document.getElementById("hud-time");
const hudHp = document.getElementById("hud-hp");
const hudAmmo = document.getElementById("hud-ammo");
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
let eliteTimer = 25;
let fireCooldown = 0;
let firing = false;

let player = {
    x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, hp: 5, maxHp: 5,
    speedMult: 1, damageMult: 1, reloadMult: 1, magnetRadius: XP_MAGNET_RADIUS,
    invulnTime: 0, weaponKey: "pistol", ammo: WEAPON_DEFS.pistol.clipSize,
    reloading: false, reloadTimer: 0, obj: null,
};
let enemies = [];
let projectiles = [];
let gems = [];
const keys = { up: false, down: false, left: false, right: false };

add([
    rect(GAME_WIDTH - ARENA_PAD * 2, GAME_HEIGHT - ARENA_PAD * 2),
    pos(GAME_WIDTH / 2, GAME_HEIGHT / 2),
    anchor("center"),
    color(12, 10, 22),
    outline(2, rgb(70, 40, 90)),
    z(0),
]);

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function xpToNext(lvl) {
    return 5 + (lvl - 1) * 4;
}

function formatCountdown(t) {
    const remaining = Math.max(0, Math.ceil(DAWN_TIME - t));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function formatElapsed(t) {
    const total = Math.max(0, Math.floor(t));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function currentScore(won) {
    const base = killCount * 5 + Math.floor(elapsedTime) + (level - 1) * 10;
    return won ? base + DAWN_BONUS : base;
}

function updateHud() {
    hudTime.textContent = formatCountdown(elapsedTime);
    hudHp.textContent = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;
    hudAmmo.textContent = player.reloading ? "RELOAD" : `${player.ammo}/${WEAPON_DEFS[player.weaponKey].clipSize}`;
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
        outline(2, e.elite ? rgb(250, 204, 21) : rgb(70, 10, 20)),
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
    const hpMult = Math.min(6, 1 + elapsedTime * 0.006);
    const speedBonus = Math.min(30, elapsedTime * 0.1);
    const e = elite
        ? { x: p.x, y: p.y, size: 28, hp: 80 * hpMult, maxHp: 80 * hpMult, speed: 38 + speedBonus * 0.6, damage: 2, xp: 5, elite: true, alive: true, obj: null }
        : { x: p.x, y: p.y, size: 18, hp: 20 * hpMult, maxHp: 20 * hpMult, speed: 45 + speedBonus, damage: 1, xp: 1, elite: false, alive: true, obj: null };
    enemies.push(e);
    createEnemyObj(e);
}

function spawnGem(x, y, value) {
    const g = { x, y, value, collected: false, obj: null };
    gems.push(g);
    createGemObj(g);
}

function clearBoardObjs() {
    enemies.forEach((e) => { if (e.obj) destroy(e.obj); });
    enemies = [];
    projectiles.forEach((p) => { if (p.obj) destroy(p.obj); });
    projectiles = [];
    gems.forEach((g) => { if (g.obj) destroy(g.obj); });
    gems = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
}

function resetGame() {
    clearBoardObjs();

    player = {
        x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, hp: 5, maxHp: 5,
        speedMult: 1, damageMult: 1, reloadMult: 1, magnetRadius: XP_MAGNET_RADIUS,
        invulnTime: 0, weaponKey: "pistol", ammo: WEAPON_DEFS.pistol.clipSize,
        reloading: false, reloadTimer: 0, obj: null,
    };
    elapsedTime = 0;
    level = 1;
    xp = 0;
    xpNeeded = xpToNext(level);
    killCount = 0;
    spawnTimer = 0.6;
    eliteTimer = 25;
    fireCooldown = 0;
    firing = false;
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
        outline(2, rgb(244, 63, 94)),
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
        eliteTimer = 25;
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

function startReload() {
    const def = WEAPON_DEFS[player.weaponKey];
    if (player.reloading || player.ammo >= def.clipSize) return;
    player.reloading = true;
    player.reloadTimer = def.reloadTime * player.reloadMult;
}

function switchWeapon(key) {
    player.weaponKey = key;
    player.ammo = WEAPON_DEFS[key].clipSize;
    player.reloading = false;
    player.reloadTimer = 0;
    fireCooldown = 0;
}

function updateReload(dtVal) {
    if (!player.reloading) return;
    player.reloadTimer -= dtVal;
    if (player.reloadTimer <= 0) {
        player.reloading = false;
        player.ammo = WEAPON_DEFS[player.weaponKey].clipSize;
    }
}

function spawnBullet(ang, def) {
    const p = {
        x: player.x, y: player.y,
        vx: Math.cos(ang) * def.bulletSpeed, vy: Math.sin(ang) * def.bulletSpeed,
        damage: def.damage * player.damageMult, life: 1.5, hit: false, obj: null,
    };
    projectiles.push(p);
    createProjectileObj(p);
}

function tryFire() {
    if (!firing || player.reloading) return;
    if (player.ammo <= 0) {
        startReload();
        return;
    }
    if (fireCooldown > 0) return;
    const target = findNearestEnemy();
    if (!target) return;
    const def = WEAPON_DEFS[player.weaponKey];
    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
    const pellets = def.pellets || 1;
    for (let i = 0; i < pellets; i++) {
        const offset = pellets > 1 ? (i - (pellets - 1) / 2) * def.spread : 0;
        spawnBullet(baseAngle + offset, def);
    }
    player.ammo -= 1;
    fireCooldown = def.fireInterval;
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
    WEAPON_KEYS.forEach((key) => {
        if (key !== player.weaponKey) list.push({ type: "weapon", key });
    });
    if (player.maxHp < MAX_HP_CAP) list.push({ type: "passive", key: "hp" });
    list.push({ type: "passive", key: "speed" });
    list.push({ type: "passive", key: "reload" });
    list.push({ type: "passive", key: "damage" });
    list.push({ type: "passive", key: "magnet" });
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
        candidates.push({ type: "passive", key: fillIdx % 2 === 0 ? "speed" : "magnet" });
        fillIdx += 1;
    }
    return candidates;
}

function describeChoice(choice) {
    if (choice.type === "weapon") {
        const def = WEAPON_DEFS[choice.key];
        return { name: `Switch: ${def.name}`, desc: `${def.desc} Clip ${def.clipSize}, ${def.damage} dmg/shot.` };
    }
    if (choice.key === "hp") return { name: "Vitality", desc: "+1 max HP (and heal 1)" };
    if (choice.key === "speed") return { name: "Swift Boots", desc: "+8% move speed" };
    if (choice.key === "reload") return { name: "Quick Hands", desc: "-15% reload time" };
    if (choice.key === "damage") return { name: "Sharp Rounds", desc: "+15% weapon damage" };
    return { name: "Magnet", desc: "+25 pickup radius" };
}

function applyChoice(choice) {
    if (choice.type === "weapon") {
        switchWeapon(choice.key);
    } else if (choice.key === "hp") {
        player.maxHp = Math.min(MAX_HP_CAP, player.maxHp + 1);
        player.hp = Math.min(player.maxHp, player.hp + 1);
    } else if (choice.key === "speed") {
        player.speedMult = Math.min(1.6, player.speedMult + 0.08);
    } else if (choice.key === "reload") {
        player.reloadMult = Math.max(0.5, player.reloadMult * 0.85);
    } else if (choice.key === "damage") {
        player.damageMult = Math.min(2.5, player.damageMult + 0.15);
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
    else if (elapsedTime >= DAWN_TIME) winGame();
}

function gameOver() {
    state = "gameover";
    const finalScore = currentScore(false);
    if (finalScore > best) {
        best = finalScore;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay(
        "Game Over",
        `Survived ${formatElapsed(elapsedTime)} of the night, reached Lv.${level}, ${killCount} kills. Score: ${finalScore}. Press to try again.`,
        "Try Again"
    );
}

function winGame() {
    state = "win";
    const finalScore = currentScore(true);
    if (finalScore > best) {
        best = finalScore;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay(
        "DAWN!",
        `You survived the night. Lv.${level}, ${killCount} kills. Score: ${finalScore}. Press to play again.`,
        "Play Again"
    );
}

function updateGame(dtVal) {
    if (state !== "playing") return;
    elapsedTime += dtVal;
    handleMovement(dtVal);
    updateSpawning(dtVal);
    updateEnemies(dtVal);
    if (fireCooldown > 0) fireCooldown -= dtVal;
    tryFire();
    updateReload(dtVal);
    updateProjectiles(dtVal);
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
    else if (e.key === " ") { e.preventDefault(); firing = true; }
    else if (e.key === "r" || e.key === "R") startReload();
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
    else if (e.key === " ") firing = false;
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

const fireBtn = document.getElementById("btn-fire");
const fPress = (e) => {
    e.preventDefault();
    if (state !== "playing") {
        pressStart();
        return;
    }
    fireBtn.classList.add("is-pressed");
    firing = true;
};
const fRelease = (e) => {
    e.preventDefault();
    fireBtn.classList.remove("is-pressed");
    firing = false;
};
fireBtn.addEventListener("pointerdown", fPress);
fireBtn.addEventListener("pointerup", fRelease);
fireBtn.addEventListener("pointercancel", fRelease);
fireBtn.addEventListener("pointerleave", fRelease);

const reloadBtn = document.getElementById("btn-reload");
reloadBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state !== "playing") {
        pressStart();
        return;
    }
    startReload();
});

onUpdate(() => {
    if (state !== "playing") return;
    const dtVal = Math.min(dt(), 0.05);
    updateGame(dtVal);
});

resetGame();
updateHud();

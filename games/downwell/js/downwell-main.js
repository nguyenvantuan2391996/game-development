const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "downwellBestScore";

const GRAVITY = 1400;
const MAX_FALL_SPEED = 650;
const MOVE_SPEED = 200;
const JUMP_VELOCITY = -480;
const BOUNCE_VELOCITY = -380;
const FIRE_KICK = 110;
const FIRE_MIN_VY = -350;
const FIRE_COOLDOWN = 0.12;
const AMMO_MAX = 6;
const BULLET_SPEED = 520;
const PLAYER_SIZE = 26;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 14;
const ROW_GAP_MIN = 90;
const ROW_GAP_MAX = 150;
const CAMERA_MARGIN = 180;
const CAMERA_LERP = 0.12;
const MAX_HP = 4;
const INVULN_TIME = 1.0;
const ENEMY_SIZE = 22;
const ENEMY_SPEED = 50;
const GEM_SIZE = 10;
const GEM_SCORE = 5;
const KILL_SCORE = 8;

const MOVING_UNLOCK_DEPTH = 8;
const SPIKE_UNLOCK_DEPTH = 15;
const ENEMY_UNLOCK_DEPTH = 18;
const MOVING_PLATFORM_SPEED_MIN = 40;
const MOVING_PLATFORM_SPEED_MAX = 80;

const PLAYER_COLOR = [239, 68, 68];
const NORMAL_PLATFORM_COLOR = [96, 74, 58];
const MOVING_PLATFORM_COLOR = [56, 189, 248];
const SPIKE_PLATFORM_COLOR = [220, 38, 38];
const ENEMY_COLOR = [217, 70, 90];
const BULLET_COLOR = [56, 189, 248];
const GEM_COLOR = [251, 191, 36];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [13, 6, 8],
    letterbox: true,
    global: true,
});

const hudDepth = document.getElementById("hud-depth");
const hudHp = document.getElementById("hud-hp");
const hudAmmo = document.getElementById("hud-ammo");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let player = { x: 0, worldY: 0, prevWorldY: 0, vy: 0, grounded: false, hp: MAX_HP, ammo: AMMO_MAX, invulnTime: 0, obj: null };
let camera = { worldY: 0, target: 0 };
let platforms = [];
let enemies = [];
let bullets = [];
let gems = [];
let nextRowWorldY = 0;
let maxWorldY = 0;
let gemsCollected = 0;
let killCount = 0;
let fireCooldown = 0;
let firing = false;
const keys = { left: false, right: false };

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function worldToScreenY(worldY) {
    return worldY - camera.worldY;
}

function currentScore() {
    return Math.floor(maxWorldY / 10) + gemsCollected * GEM_SCORE + killCount * KILL_SCORE;
}

function updateHud() {
    hudDepth.textContent = Math.floor(maxWorldY / 10);
    hudHp.textContent = `${Math.max(0, player.hp)}/${MAX_HP}`;
    hudAmmo.textContent = Math.max(0, player.ammo);
    hudBest.textContent = best;
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function createPlatformObj(p) {
    const col2 = p.type === "spike" ? SPIKE_PLATFORM_COLOR : p.type === "moving" ? MOVING_PLATFORM_COLOR : NORMAL_PLATFORM_COLOR;
    p.obj = add([
        pos(p.x + p.width / 2, worldToScreenY(p.worldY)),
        anchor("center"),
        rect(p.width, PLATFORM_HEIGHT),
        color(col2[0], col2[1], col2[2]),
        z(1),
    ]);
}

function createEnemyObj(e) {
    e.obj = add([
        pos(e.x, worldToScreenY(e.worldY)),
        anchor("center"),
        circle(ENEMY_SIZE / 2),
        color(ENEMY_COLOR[0], ENEMY_COLOR[1], ENEMY_COLOR[2]),
        outline(2, rgb(60, 10, 20)),
        z(3),
    ]);
}

function createBulletObj(b) {
    b.obj = add([
        pos(b.x, worldToScreenY(b.worldY)),
        anchor("center"),
        rect(4, 10),
        color(BULLET_COLOR[0], BULLET_COLOR[1], BULLET_COLOR[2]),
        z(4),
    ]);
}

function createGemObj(g) {
    g.obj = add([
        pos(g.x, worldToScreenY(g.worldY)),
        anchor("center"),
        circle(GEM_SIZE / 2),
        color(GEM_COLOR[0], GEM_COLOR[1], GEM_COLOR[2]),
        z(2),
    ]);
}

function spawnEnemy(platform) {
    const e = { worldY: platform.worldY, x: platform.x + platform.width / 2, dir: rand(0, 1) < 0.5 ? 1 : -1, alive: true, obj: null };
    enemies.push(e);
    createEnemyObj(e);
}

function spawnGem(worldY) {
    const g = { worldY, x: randomBetween(24, GAME_WIDTH - 24), collected: false, obj: null };
    gems.push(g);
    createGemObj(g);
}

function spawnRow() {
    const rowDepth = Math.floor(nextRowWorldY / 10);
    const roll = rand(0, 1);
    let type = "normal";
    if (rowDepth >= SPIKE_UNLOCK_DEPTH && roll < 0.15) type = "spike";
    else if (rowDepth >= MOVING_UNLOCK_DEPTH && roll < 0.4) type = "moving";

    const platform = {
        type,
        worldY: nextRowWorldY,
        x: randomBetween(0, GAME_WIDTH - PLATFORM_WIDTH),
        width: PLATFORM_WIDTH,
        dir: rand(0, 1) < 0.5 ? 1 : -1,
        speed: randomBetween(MOVING_PLATFORM_SPEED_MIN, MOVING_PLATFORM_SPEED_MAX),
        obj: null,
    };
    platforms.push(platform);
    createPlatformObj(platform);

    if (type === "normal" && rowDepth >= ENEMY_UNLOCK_DEPTH && rand(0, 1) < 0.22) {
        spawnEnemy(platform);
    }

    if (rand(0, 1) < 0.5) {
        spawnGem(nextRowWorldY - randomBetween(20, 60));
    }

    nextRowWorldY += randomBetween(ROW_GAP_MIN, ROW_GAP_MAX);
}

function clearBoardObjs() {
    platforms.forEach((p) => { if (p.obj) destroy(p.obj); });
    platforms = [];
    enemies.forEach((e) => { if (e.obj) destroy(e.obj); });
    enemies = [];
    bullets.forEach((b) => { if (b.obj) destroy(b.obj); });
    bullets = [];
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
        x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, worldY: 20, prevWorldY: 20, vy: 0,
        grounded: false, hp: MAX_HP, ammo: AMMO_MAX, invulnTime: 0, obj: null,
    };
    camera = { worldY: 0, target: 0 };
    gemsCollected = 0;
    killCount = 0;
    fireCooldown = 0;
    firing = false;
    keys.left = false;
    keys.right = false;

    const startPlatform = { type: "normal", worldY: 60, x: GAME_WIDTH / 2 - PLATFORM_WIDTH / 2, width: PLATFORM_WIDTH, dir: 1, speed: 0, obj: null };
    platforms.push(startPlatform);
    createPlatformObj(startPlatform);

    nextRowWorldY = 60 + randomBetween(ROW_GAP_MIN, ROW_GAP_MAX);
    maxWorldY = 20;
    while (nextRowWorldY - camera.worldY < GAME_HEIGHT + 150) spawnRow();

    player.obj = add([
        pos(player.x + PLAYER_SIZE / 2, worldToScreenY(player.worldY)),
        anchor("center"),
        rect(PLAYER_SIZE, PLAYER_SIZE),
        color(PLAYER_COLOR[0], PLAYER_COLOR[1], PLAYER_COLOR[2]),
        opacity(1),
        outline(2, rgb(80, 10, 10)),
        z(5),
    ]);
}

function killEnemy(e) {
    e.alive = false;
    if (e.obj) {
        destroy(e.obj);
        e.obj = null;
    }
    killCount += 1;
}

function takeDamage() {
    if (player.invulnTime > 0) return;
    player.hp -= 1;
    player.invulnTime = INVULN_TIME;
    shake(4);
}

function tryFire() {
    if (player.ammo <= 0 || fireCooldown > 0) return;
    const b = { worldY: player.worldY, x: player.x + PLAYER_SIZE / 2, hit: false, obj: null };
    bullets.push(b);
    createBulletObj(b);
    player.ammo -= 1;
    player.vy = Math.min(player.vy, Math.max(player.vy - FIRE_KICK, FIRE_MIN_VY));
    fireCooldown = FIRE_COOLDOWN;
}

function doAction() {
    if (state !== "playing") return;
    if (player.grounded) {
        player.vy = JUMP_VELOCITY;
        player.grounded = false;
    } else {
        tryFire();
    }
}

function handleMovement(dtVal) {
    let vx = 0;
    if (keys.left) vx -= MOVE_SPEED;
    if (keys.right) vx += MOVE_SPEED;
    player.x += vx * dtVal;
    player.x = clamp(player.x, 0, GAME_WIDTH - PLAYER_SIZE);
}

function syncPositions() {
    if (player.obj) {
        player.obj.pos.x = player.x + PLAYER_SIZE / 2;
        player.obj.pos.y = worldToScreenY(player.worldY);
        player.obj.opacity = player.invulnTime > 0 && Math.floor(time() * 12) % 2 === 0 ? 0.35 : 1;
    }
    platforms.forEach((p) => {
        if (!p.obj) return;
        p.obj.pos.x = p.x + p.width / 2;
        p.obj.pos.y = worldToScreenY(p.worldY);
    });
    enemies.forEach((e) => {
        if (!e.obj || !e.alive) return;
        e.obj.pos.x = e.x;
        e.obj.pos.y = worldToScreenY(e.worldY);
    });
    bullets.forEach((b) => {
        if (!b.obj) return;
        b.obj.pos.x = b.x;
        b.obj.pos.y = worldToScreenY(b.worldY);
    });
    gems.forEach((g) => {
        if (!g.obj) return;
        g.obj.pos.x = g.x;
        g.obj.pos.y = worldToScreenY(g.worldY);
    });
}

function updatePhysics(dtVal) {
    handleMovement(dtVal);

    player.prevWorldY = player.worldY;
    player.vy = Math.min(player.vy + GRAVITY * dtVal, MAX_FALL_SPEED);
    player.worldY += player.vy * dtVal;
    player.grounded = false;

    platforms.forEach((p) => {
        if (p.type === "moving") {
            p.x += p.dir * p.speed * dtVal;
            if (p.x <= 0) {
                p.x = 0;
                p.dir = 1;
            } else if (p.x + p.width >= GAME_WIDTH) {
                p.x = GAME_WIDTH - p.width;
                p.dir = -1;
            }
        }
    });

    if (player.vy >= 0) {
        for (const p of platforms) {
            const platTop = p.worldY;
            const playerBottomPrev = player.prevWorldY + PLAYER_SIZE / 2;
            const playerBottomNow = player.worldY + PLAYER_SIZE / 2;
            const overlapX = player.x + PLAYER_SIZE > p.x && player.x < p.x + p.width;
            if (overlapX && playerBottomPrev <= platTop && playerBottomNow >= platTop) {
                player.worldY = platTop - PLAYER_SIZE / 2;
                player.vy = 0;
                player.grounded = true;
                player.ammo = AMMO_MAX;
                if (p.type === "spike") takeDamage();
                break;
            }
        }
    }

    enemies.forEach((e) => {
        if (!e.alive) return;
        e.x += e.dir * ENEMY_SPEED * dtVal;
        if (e.x < ENEMY_SIZE / 2) {
            e.x = ENEMY_SIZE / 2;
            e.dir = 1;
        } else if (e.x > GAME_WIDTH - ENEMY_SIZE / 2) {
            e.x = GAME_WIDTH - ENEMY_SIZE / 2;
            e.dir = -1;
        }

        const overlapX = player.x + PLAYER_SIZE > e.x - ENEMY_SIZE / 2 && player.x < e.x + ENEMY_SIZE / 2;
        const overlapY = player.worldY + PLAYER_SIZE / 2 > e.worldY - ENEMY_SIZE / 2 && player.worldY - PLAYER_SIZE / 2 < e.worldY + ENEMY_SIZE / 2;
        if (overlapX && overlapY) {
            const stomp = player.vy > 0 && player.prevWorldY + PLAYER_SIZE / 2 <= e.worldY - ENEMY_SIZE / 2 + 6;
            if (stomp) {
                killEnemy(e);
                player.vy = BOUNCE_VELOCITY;
                player.grounded = false;
            } else {
                takeDamage();
            }
        }
    });

    bullets.forEach((b) => {
        if (b.hit) return;
        b.worldY += BULLET_SPEED * dtVal;
        enemies.forEach((e) => {
            if (!e.alive || b.hit) return;
            const overlapX = Math.abs(b.x - e.x) < ENEMY_SIZE / 2 + 4;
            const overlapY = Math.abs(b.worldY - e.worldY) < ENEMY_SIZE / 2 + 4;
            if (overlapX && overlapY) {
                killEnemy(e);
                b.hit = true;
            }
        });
    });
    bullets = bullets.filter((b) => {
        if (b.hit || b.worldY - camera.worldY > GAME_HEIGHT + 40) {
            if (b.obj) destroy(b.obj);
            return false;
        }
        return true;
    });

    gems.forEach((g) => {
        if (g.collected) return;
        const overlapX = Math.abs(player.x + PLAYER_SIZE / 2 - g.x) < PLAYER_SIZE / 2 + GEM_SIZE / 2;
        const overlapY = Math.abs(player.worldY - g.worldY) < PLAYER_SIZE / 2 + GEM_SIZE / 2;
        if (overlapX && overlapY) {
            g.collected = true;
            gemsCollected += 1;
            if (g.obj) destroy(g.obj);
        }
    });
    gems = gems.filter((g) => !g.collected);

    if (player.worldY > maxWorldY) maxWorldY = player.worldY;

    fireCooldown = Math.max(0, fireCooldown - dtVal);
    if (player.invulnTime > 0) player.invulnTime -= dtVal;
    if (firing && !player.grounded && fireCooldown <= 0) tryFire();

    camera.target = Math.max(camera.target, player.worldY - CAMERA_MARGIN);
    camera.worldY += (camera.target - camera.worldY) * CAMERA_LERP;

    while (nextRowWorldY - camera.worldY < GAME_HEIGHT + 150) spawnRow();

    platforms = platforms.filter((p) => {
        if (p.worldY - camera.worldY < -60) {
            if (p.obj) destroy(p.obj);
            return false;
        }
        return true;
    });
    enemies = enemies.filter((e) => {
        if (!e.alive || e.worldY - camera.worldY < -60) {
            if (e.obj) destroy(e.obj);
            return false;
        }
        return true;
    });
    gems = gems.filter((g) => {
        if (g.worldY - camera.worldY < -60) {
            if (g.obj) destroy(g.obj);
            return false;
        }
        return true;
    });

    syncPositions();
    updateHud();

    if (player.hp <= 0) {
        gameOver();
    }
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
        `Fell ${Math.floor(maxWorldY / 10)}m, ${gemsCollected} gems, ${killCount} kills. Score: ${finalScore}. Press to try again.`,
        "Try Again"
    );
}

function startGame() {
    resetGame();
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") startGame();
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
    else if (e.key === " ") {
        e.preventDefault();
        if (!firing) {
            firing = true;
            doAction();
        }
    }
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
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
        if (dir === "left") keys.left = true;
        else if (dir === "right") keys.right = true;
        else if (dir === "fire") {
            firing = true;
            doAction();
        }
    };
    const release = (e) => {
        e.preventDefault();
        btn.classList.remove("is-pressed");
        if (dir === "left") keys.left = false;
        else if (dir === "right") keys.right = false;
        else if (dir === "fire") firing = false;
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
});

onUpdate(() => {
    if (state !== "playing") return;
    const dtVal = Math.min(dt(), 0.05);
    updatePhysics(dtVal);
});

resetGame();
updateHud();

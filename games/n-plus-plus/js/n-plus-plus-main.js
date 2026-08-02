const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "nPlusPlusBestScore";

const GRAVITY = 1800;
const MOVE_ACCEL = 2200;
const AIR_ACCEL = 1400;
const FRICTION = 2600;
const MAX_RUN_SPEED = 200;
const JUMP_VELOCITY = -560;
const WALL_SLIDE_MAX_FALL = 90;
const WALL_JUMP_VX = 250;
const WALL_JUMP_VY = -520;
const PLAYER_W = 16;
const PLAYER_H = 24;
const MINE_SIZE = 14;
const START_LIVES = 3;

const LEVELS = [
    {
        start: { x: 24, y: 480 },
        platforms: [
            { x: 0, y: 520, w: 360, h: 40 },
        ],
        mines: [{ x: 130, y: 500 }, { x: 235, y: 500 }],
        exit: { x: 300, y: 470, w: 40, h: 50 },
    },
    {
        start: { x: 24, y: 480 },
        platforms: [
            { x: 0, y: 520, w: 360, h: 40 },
            { x: 140, y: 200, w: 16, h: 320 },
            { x: 220, y: 120, w: 16, h: 400 },
        ],
        mines: [{ x: 100, y: 500 }, { x: 176, y: 330 }],
        exit: { x: 250, y: 70, w: 60, h: 50 },
    },
    {
        start: { x: 20, y: 480 },
        platforms: [
            { x: 0, y: 520, w: 100, h: 40 },
            { x: 150, y: 440, w: 70, h: 16 },
            { x: 260, y: 360, w: 70, h: 16 },
            { x: 150, y: 280, w: 70, h: 16 },
            { x: 260, y: 200, w: 70, h: 16 },
            { x: 150, y: 120, w: 70, h: 200 },
        ],
        mines: [{ x: 175, y: 420 }, { x: 285, y: 340 }, { x: 175, y: 260 }],
        exit: { x: 270, y: 150, w: 50, h: 50 },
    },
    {
        start: { x: 24, y: 480 },
        platforms: [
            { x: 0, y: 520, w: 140, h: 40 },
            { x: 220, y: 520, w: 140, h: 40 },
            { x: 60, y: 180, w: 16, h: 340 },
            { x: 140, y: 340, w: 70, h: 14 },
            { x: 220, y: 260, w: 16, h: 260 },
        ],
        mines: [{ x: 260, y: 500 }, { x: 90, y: 500 }, { x: 168, y: 320 }],
        exit: { x: 240, y: 100, w: 60, h: 160 },
    },
    {
        start: { x: 20, y: 480 },
        platforms: [
            { x: 0, y: 520, w: 90, h: 40 },
            { x: 120, y: 460, w: 60, h: 14 },
            { x: 220, y: 400, w: 60, h: 14 },
            { x: 120, y: 320, w: 60, h: 14 },
            { x: 220, y: 240, w: 60, h: 14 },
            { x: 300, y: 160, w: 16, h: 240 },
            { x: 300, y: 60, w: 60, h: 16 },
        ],
        mines: [{ x: 145, y: 440 }, { x: 245, y: 380 }, { x: 145, y: 300 }, { x: 245, y: 220 }],
        exit: { x: 300, y: 10, w: 60, h: 50 },
    },
];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [18, 16, 28],
    letterbox: true,
    global: true,
});

const hudScore = document.getElementById("hud-score");
const hudBest = document.getElementById("hud-best");
const hudLives = document.getElementById("hud-lives");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let levelIndex = 0;
let extraMineSeed = 0;
let lives = START_LIVES;
let vx = 0;
let vy = 0;
let onGround = false;
let touchingWallLeft = false;
let touchingWallRight = false;
let moveDir = 0;
let platformRects = [];
let mineRects = [];
let exitRect = null;
let levelStart = { x: 24, y: 480 };

let platformObjs = [];
let mineObjs = [];
let exitObj = null;

const player = add([
    pos(0, 0),
    rect(PLAYER_W, PLAYER_H),
    color(30, 27, 45),
    outline(2, rgb(232, 232, 236)),
    area(),
    z(5),
]);

function updateHud() {
    hudScore.textContent = levelIndex + 1;
    hudBest.textContent = best;
    hudLives.textContent = "❤".repeat(Math.max(0, lives));
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function clearLevelObjs() {
    platformObjs.forEach(destroy);
    mineObjs.forEach(destroy);
    if (exitObj) destroy(exitObj);
    platformObjs = [];
    mineObjs = [];
    exitObj = null;
}

function loadLevel(index) {
    clearLevelObjs();
    const def = LEVELS[index % LEVELS.length];
    const loops = Math.floor(index / LEVELS.length);

    platformRects = def.platforms.map((p) => ({ ...p }));
    mineRects = def.mines.map((m) => ({ x: m.x, y: m.y, w: MINE_SIZE, h: MINE_SIZE }));

    if (loops > 0) {
        for (let i = 0; i < loops; i++) {
            const plat = platformRects[1 + ((i + index) % Math.max(1, platformRects.length - 1))];
            if (plat) {
                mineRects.push({
                    x: clamp(plat.x + rand(4, Math.max(5, plat.w - 18)), 0, GAME_WIDTH - MINE_SIZE),
                    y: plat.y - MINE_SIZE,
                    w: MINE_SIZE,
                    h: MINE_SIZE,
                });
            }
        }
    }

    exitRect = { ...def.exit };
    levelStart = { ...def.start };

    platformObjs = platformRects.map((p) =>
        add([pos(p.x, p.y), rect(p.w, p.h), color(60, 56, 78), outline(2, rgb(90, 85, 115)), area(), z(1)])
    );
    mineObjs = mineRects.map((m) =>
        add([pos(m.x + m.w / 2, m.y + m.h / 2), anchor("center"), circle(MINE_SIZE / 2), color(239, 68, 68), outline(2, rgb(120, 20, 20)), area(), z(2)])
    );
    exitObj = add([pos(exitRect.x, exitRect.y), rect(exitRect.w, exitRect.h), color(74, 222, 128), outline(2, rgb(30, 120, 60)), area(), z(1)]);
}

function respawn() {
    player.pos.x = levelStart.x;
    player.pos.y = levelStart.y;
    vx = 0;
    vy = 0;
}

function startGame() {
    levelIndex = 0;
    lives = START_LIVES;
    loadLevel(levelIndex);
    respawn();
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") startGame();
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerRect() {
    return { x: player.pos.x, y: player.pos.y, w: PLAYER_W, h: PLAYER_H };
}

function jump() {
    if (state !== "playing") return;
    if (onGround) {
        vy = JUMP_VELOCITY;
    } else if (touchingWallLeft) {
        vy = WALL_JUMP_VY;
        vx = WALL_JUMP_VX;
    } else if (touchingWallRight) {
        vy = WALL_JUMP_VY;
        vx = -WALL_JUMP_VX;
    }
}

function hitMine() {
    lives--;
    updateHud();
    shake(8);
    if (lives <= 0) {
        die();
    } else {
        respawn();
    }
}

function die() {
    state = "gameover";
    const cleared = levelIndex;
    if (cleared > best) {
        best = cleared;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay("Game Over", `You reached level ${cleared + 1}. Press to try again.`, "Try Again");
}

function completeLevel() {
    levelIndex++;
    loadLevel(levelIndex);
    respawn();
    updateHud();
}

canvasEl.addEventListener("pointerdown", pressStart);
overlayBtn.addEventListener("click", pressStart);

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveDir = -1;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveDir = 1;
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (state !== "playing") pressStart();
        else if (!e.repeat) jump();
    }
});
window.addEventListener("keyup", (e) => {
    if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && moveDir === -1) moveDir = 0;
    else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && moveDir === 1) moveDir = 0;
});

document.querySelectorAll(".dpad-btn").forEach((btn) => {
    const dir = btn.dataset.dir;
    btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        btn.classList.add("is-pressed");
        if (dir === "left") moveDir = -1;
        else if (dir === "right") moveDir = 1;
        else if (dir === "jump") {
            if (state !== "playing") pressStart();
            else jump();
        }
    });
    const release = () => {
        btn.classList.remove("is-pressed");
        if (dir === "left" && moveDir === -1) moveDir = 0;
        else if (dir === "right" && moveDir === 1) moveDir = 0;
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
});

onUpdate(() => {
    if (state !== "playing") return;

    const dtv = dt();
    const accel = onGround ? MOVE_ACCEL : AIR_ACCEL;
    if (moveDir !== 0) {
        vx += moveDir * accel * dtv;
        vx = clamp(vx, -MAX_RUN_SPEED, MAX_RUN_SPEED);
    } else if (onGround) {
        if (vx > 0) vx = Math.max(0, vx - FRICTION * dtv);
        else if (vx < 0) vx = Math.min(0, vx + FRICTION * dtv);
    }

    vy += GRAVITY * dtv;
    if ((touchingWallLeft || touchingWallRight) && vy > WALL_SLIDE_MAX_FALL && !onGround) {
        vy = WALL_SLIDE_MAX_FALL;
    }

    player.pos.x += vx * dtv;
    for (const p of platformRects) {
        const pr = playerRect();
        if (rectsOverlap(pr, p)) {
            if (vx > 0) player.pos.x = p.x - PLAYER_W;
            else if (vx < 0) player.pos.x = p.x + p.w;
            vx = 0;
        }
    }
    if (player.pos.x < 0) {
        player.pos.x = 0;
        vx = 0;
    } else if (player.pos.x > GAME_WIDTH - PLAYER_W) {
        player.pos.x = GAME_WIDTH - PLAYER_W;
        vx = 0;
    }

    const probeLeft = { x: player.pos.x - 3, y: player.pos.y + 2, w: 3, h: PLAYER_H - 4 };
    const probeRight = { x: player.pos.x + PLAYER_W, y: player.pos.y + 2, w: 3, h: PLAYER_H - 4 };
    touchingWallLeft = platformRects.some((p) => rectsOverlap(probeLeft, p));
    touchingWallRight = platformRects.some((p) => rectsOverlap(probeRight, p));

    player.pos.y += vy * dtv;
    onGround = false;
    for (const p of platformRects) {
        const pr = playerRect();
        if (rectsOverlap(pr, p)) {
            if (vy > 0) {
                player.pos.y = p.y - PLAYER_H;
                onGround = true;
            } else if (vy < 0) {
                player.pos.y = p.y + p.h;
            }
            vy = 0;
        }
    }

    if (player.pos.y > GAME_HEIGHT + 40) {
        hitMine();
        return;
    }

    const pr = playerRect();
    if (mineRects.some((m) => rectsOverlap(pr, m))) {
        hitMine();
        return;
    }
    if (exitRect && rectsOverlap(pr, exitRect)) {
        completeLevel();
        return;
    }
});

updateHud();

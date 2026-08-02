const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "vvvvvvBestScore";

const GRAVITY_MAG = 1050;
const MOVE_ACCEL = 1800;
const FRICTION = 2200;
const MAX_RUN_SPEED = 160;
const PLAYER_SIZE = 16;
const SPIKE_SIZE = 14;
const START_LIVES = 3;

const ROOMS = [
    {
        start: { x: 20, y: 480 },
        platforms: [
            { x: 0, y: 40, w: 360, h: 20 },
            { x: 0, y: 500, w: 360, h: 20 },
        ],
        spikes: [{ x: 160, y: 486 }, { x: 190, y: 486 }],
        exit: { x: 310, y: 460, w: 40, h: 40 },
    },
    {
        start: { x: 20, y: 60 },
        platforms: [
            { x: 0, y: 40, w: 360, h: 20 },
            { x: 0, y: 500, w: 360, h: 20 },
        ],
        spikes: [{ x: 120, y: 60 }, { x: 150, y: 60 }, { x: 220, y: 486 }, { x: 250, y: 486 }],
        exit: { x: 310, y: 60, w: 40, h: 40 },
    },
    {
        start: { x: 20, y: 480 },
        platforms: [
            { x: 0, y: 40, w: 360, h: 20 },
            { x: 0, y: 500, w: 360, h: 20 },
            { x: 150, y: 240, w: 60, h: 16 },
        ],
        spikes: [{ x: 100, y: 486 }, { x: 260, y: 60 }, { x: 290, y: 60 }],
        exit: { x: 310, y: 460, w: 40, h: 40 },
    },
    {
        start: { x: 20, y: 60 },
        platforms: [
            { x: 0, y: 40, w: 150, h: 20 },
            { x: 210, y: 40, w: 150, h: 20 },
            { x: 0, y: 500, w: 360, h: 20 },
        ],
        spikes: [{ x: 60, y: 486 }, { x: 90, y: 486 }, { x: 200, y: 486 }, { x: 230, y: 486 }],
        exit: { x: 310, y: 60, w: 40, h: 40 },
    },
    {
        start: { x: 20, y: 480 },
        platforms: [
            { x: 0, y: 40, w: 360, h: 20 },
            { x: 0, y: 500, w: 360, h: 20 },
            { x: 110, y: 240, w: 50, h: 16 },
            { x: 220, y: 240, w: 50, h: 16 },
        ],
        spikes: [{ x: 80, y: 486 }, { x: 140, y: 60 }, { x: 170, y: 60 }, { x: 260, y: 486 }, { x: 290, y: 486 }],
        exit: { x: 310, y: 60, w: 40, h: 40 },
    },
];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [14, 12, 22],
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
let roomIndex = 0;
let lives = START_LIVES;
let vx = 0;
let vy = 0;
let gravityDir = 1;
let onSurface = false;
let moveDir = 0;
let platformRects = [];
let spikeRects = [];
let exitRect = null;
let roomStart = { x: 20, y: 480 };

let platformObjs = [];
let spikeObjs = [];
let exitObj = null;

const player = add([
    pos(0, 0),
    rect(PLAYER_SIZE, PLAYER_SIZE),
    color(24, 22, 36),
    outline(2, rgb(34, 211, 238)),
    area(),
    z(5),
]);

function updateHud() {
    hudScore.textContent = roomIndex + 1;
    hudBest.textContent = best;
    hudLives.textContent = "❤".repeat(Math.max(0, lives));
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function clearRoomObjs() {
    platformObjs.forEach(destroy);
    spikeObjs.forEach(destroy);
    if (exitObj) destroy(exitObj);
    platformObjs = [];
    spikeObjs = [];
    exitObj = null;
}

function loadRoom(index) {
    clearRoomObjs();
    const def = ROOMS[index % ROOMS.length];
    const loops = Math.floor(index / ROOMS.length);

    platformRects = def.platforms.map((p) => ({ ...p }));
    spikeRects = def.spikes.map((s) => ({ x: s.x, y: s.y, w: SPIKE_SIZE, h: SPIKE_SIZE }));

    if (loops > 0) {
        for (let i = 0; i < loops; i++) {
            const onCeiling = (i + index) % 2 === 0;
            spikeRects.push({
                x: clamp(rand(40, GAME_WIDTH - 60), 0, GAME_WIDTH - SPIKE_SIZE),
                y: onCeiling ? 60 : 486,
                w: SPIKE_SIZE,
                h: SPIKE_SIZE,
            });
        }
    }

    exitRect = { ...def.exit };
    roomStart = { ...def.start };
    gravityDir = 1;

    platformObjs = platformRects.map((p) =>
        add([pos(p.x, p.y), rect(p.w, p.h), color(50, 46, 68), outline(2, rgb(80, 75, 105)), area(), z(1)])
    );
    spikeObjs = spikeRects.map((s) =>
        add([pos(s.x, s.y), rect(s.w, s.h), color(232, 121, 249), outline(2, rgb(120, 30, 130)), area(), z(2)])
    );
    exitObj = add([pos(exitRect.x, exitRect.y), rect(exitRect.w, exitRect.h), color(34, 211, 238), outline(2, rgb(10, 100, 110)), area(), z(1)]);
}

function respawn() {
    player.pos.x = roomStart.x;
    player.pos.y = roomStart.y;
    vx = 0;
    vy = 0;
    gravityDir = 1;
}

function startGame() {
    roomIndex = 0;
    lives = START_LIVES;
    loadRoom(roomIndex);
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
    return { x: player.pos.x, y: player.pos.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
}

function flipGravity() {
    if (state !== "playing") return;
    gravityDir *= -1;
}

function hitSpike() {
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
    const cleared = roomIndex;
    if (cleared > best) {
        best = cleared;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay("Game Over", `You reached room ${cleared + 1}. Press to try again.`, "Try Again");
}

function completeRoom() {
    roomIndex++;
    loadRoom(roomIndex);
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
        else if (!e.repeat) flipGravity();
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
        else if (dir === "flip") {
            if (state !== "playing") pressStart();
            else flipGravity();
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
    if (moveDir !== 0) {
        vx += moveDir * MOVE_ACCEL * dtv;
        vx = clamp(vx, -MAX_RUN_SPEED, MAX_RUN_SPEED);
    } else if (onSurface) {
        if (vx > 0) vx = Math.max(0, vx - FRICTION * dtv);
        else if (vx < 0) vx = Math.min(0, vx + FRICTION * dtv);
    }

    vy += GRAVITY_MAG * gravityDir * dtv;

    player.pos.x += vx * dtv;
    for (const p of platformRects) {
        const pr = playerRect();
        if (rectsOverlap(pr, p)) {
            if (vx > 0) player.pos.x = p.x - PLAYER_SIZE;
            else if (vx < 0) player.pos.x = p.x + p.w;
            vx = 0;
        }
    }
    if (player.pos.x < 0) {
        player.pos.x = 0;
        vx = 0;
    } else if (player.pos.x > GAME_WIDTH - PLAYER_SIZE) {
        player.pos.x = GAME_WIDTH - PLAYER_SIZE;
        vx = 0;
    }

    player.pos.y += vy * dtv;
    onSurface = false;
    for (const p of platformRects) {
        const pr = playerRect();
        if (rectsOverlap(pr, p)) {
            if (gravityDir > 0) {
                if (vy > 0) {
                    player.pos.y = p.y - PLAYER_SIZE;
                    onSurface = true;
                } else if (vy < 0) {
                    player.pos.y = p.y + p.h;
                }
            } else {
                if (vy < 0) {
                    player.pos.y = p.y + p.h;
                    onSurface = true;
                } else if (vy > 0) {
                    player.pos.y = p.y - PLAYER_SIZE;
                }
            }
            vy = 0;
        }
    }

    if (player.pos.y < -60 || player.pos.y > GAME_HEIGHT + 60) {
        hitSpike();
        return;
    }

    const pr = playerRect();
    if (spikeRects.some((s) => rectsOverlap(pr, s))) {
        hitSpike();
        return;
    }
    if (exitRect && rectsOverlap(pr, exitRect)) {
        completeRoom();
        return;
    }
});

updateHud();

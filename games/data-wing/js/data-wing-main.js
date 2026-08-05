const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "dataWingBestScore";

const PLAYER_Y = GAME_HEIGHT - 110;
const SHIP_W = 18;
const SHIP_H = 26;

const SEGMENT_STEP = 20;
const LOOKAHEAD = 650;
const MAX_DRIFT = 10;
const HALF_WIDTH_MIN = 55;
const HALF_WIDTH_MAX = 95;
const HALF_WIDTH_STEP = 3;
const WALL_THICKNESS = 4;

const BASE_SPEED = 150;
const MAX_SPEED = 320;
const SPEED_RAMP_RATE = 0.03;

const MOVE_ACCEL = 2200;
const FRICTION = 1800;
const MAX_VX = 360;
const MAX_TILT = 22;

const BOOST_SPAWN_CHANCE = 0.05;
const BOOST_RADIUS = 10;
const BOOST_MULT = 1.6;
const BOOST_DURATION = 1.2;
const BOOST_SCORE_BONUS = 50;

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [5, 7, 15],
    letterbox: true,
    global: true,
});

const hudScore = document.getElementById("hud-score");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let moveDir = 0;
let vx = 0;
let scrollY = 0;
let score = 0;
let boostBonus = 0;
let boostTimer = 0;
let trackPoints = [];
let wallObjs = [];
let boostObjs = [];

const ship = add([
    pos(GAME_WIDTH / 2, PLAYER_Y),
    anchor("center"),
    rotate(0),
    rect(SHIP_W, SHIP_H),
    color(56, 189, 248),
    outline(2, rgb(10, 60, 90)),
    z(5),
]);

function updateHud() {
    hudScore.textContent = score;
    hudBest.textContent = best;
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function clearWorldObjs() {
    wallObjs.forEach((o) => destroy(o));
    boostObjs.forEach((b) => destroy(b.obj));
    wallObjs = [];
    boostObjs = [];
}

function addWallLine(x1, y1, x2, y2, col) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const obj = add([
        pos((x1 + x2) / 2, (y1 + y2) / 2),
        anchor("center"),
        rotate(angle),
        rect(dist, WALL_THICKNESS),
        color(col[0], col[1], col[2]),
        z(1),
    ]);
    wallObjs.push(obj);
    return obj;
}

function screenYForWorldY(worldY) {
    return PLAYER_Y + scrollY - worldY;
}

function spawnBoost(point) {
    const x = clamp(point.centerX + rand(-point.halfWidth * 0.5, point.halfWidth * 0.5), 20, GAME_WIDTH - 20);
    const y = screenYForWorldY(point.worldY);
    const obj = add([
        pos(x, y),
        anchor("center"),
        circle(BOOST_RADIUS),
        color(251, 191, 36),
        outline(2, rgb(120, 85, 10)),
        z(3),
    ]);
    boostObjs.push({ obj, worldY: point.worldY, x, collected: false });
}

function generateNextPoint() {
    const prev = trackPoints[trackPoints.length - 1];
    const nextWorldY = prev.worldY + SEGMENT_STEP;
    const halfWidth = clamp(prev.halfWidth + rand(-HALF_WIDTH_STEP, HALF_WIDTH_STEP), HALF_WIDTH_MIN, HALF_WIDTH_MAX);
    const centerX = clamp(prev.centerX + rand(-MAX_DRIFT, MAX_DRIFT), halfWidth + 8, GAME_WIDTH - halfWidth - 8);
    const point = { worldY: nextWorldY, centerX, halfWidth };
    trackPoints.push(point);

    const y0 = screenYForWorldY(prev.worldY);
    const y1 = screenYForWorldY(point.worldY);
    addWallLine(prev.centerX - prev.halfWidth, y0, point.centerX - point.halfWidth, y1, [56, 189, 248]);
    addWallLine(prev.centerX + prev.halfWidth, y0, point.centerX + point.halfWidth, y1, [244, 114, 182]);

    if (trackPoints.length > 3 && Math.random() < BOOST_SPAWN_CHANCE) {
        spawnBoost(point);
    }
    return point;
}

function ensureTrackAhead() {
    while (trackPoints[trackPoints.length - 1].worldY < scrollY + LOOKAHEAD) {
        generateNextPoint();
    }
}

function cleanupBehind() {
    wallObjs = wallObjs.filter((o) => {
        if (o.pos.y > GAME_HEIGHT + 40) {
            destroy(o);
            return false;
        }
        return true;
    });
    boostObjs = boostObjs.filter((b) => {
        if (b.collected || b.obj.pos.y > GAME_HEIGHT + 40) {
            if (!b.collected) destroy(b.obj);
            return false;
        }
        return true;
    });
}

function trackBoundsAtPlayer() {
    let idx = Math.floor(scrollY / SEGMENT_STEP);
    idx = clamp(idx, 0, trackPoints.length - 2);
    const p0 = trackPoints[idx];
    const p1 = trackPoints[idx + 1];
    const t = clamp((scrollY - p0.worldY) / SEGMENT_STEP, 0, 1);
    const centerX = lerp(p0.centerX, p1.centerX, t);
    const halfWidth = lerp(p0.halfWidth, p1.halfWidth, t);
    return { left: centerX - halfWidth, right: centerX + halfWidth };
}

function resetTrack() {
    clearWorldObjs();
    trackPoints = [{ worldY: 0, centerX: GAME_WIDTH / 2, halfWidth: 80 }];
    scrollY = 0;
    ensureTrackAhead();
}

function crash() {
    state = "gameover";
    if (score > best) {
        best = score;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    shake(10);
    showOverlay("Crashed!", `You flew ${score}m. Press to try again.`, "Try Again");
}

function startGame() {
    resetTrack();
    ship.pos.x = GAME_WIDTH / 2;
    ship.angle = 0;
    vx = 0;
    score = 0;
    boostBonus = 0;
    boostTimer = 0;
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") startGame();
}

canvasEl.addEventListener("pointerdown", pressStart);
overlayBtn.addEventListener("click", pressStart);

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveDir = -1;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveDir = 1;
    else if (e.key === " ") {
        e.preventDefault();
        if (state !== "playing") pressStart();
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

    const rampedSpeed = Math.min(MAX_SPEED, BASE_SPEED + scrollY * SPEED_RAMP_RATE);
    if (boostTimer > 0) boostTimer -= dtv;
    const currentSpeed = rampedSpeed * (boostTimer > 0 ? BOOST_MULT : 1);
    const deltaScroll = currentSpeed * dtv;
    scrollY += deltaScroll;

    if (moveDir !== 0) {
        vx += moveDir * MOVE_ACCEL * dtv;
        vx = clamp(vx, -MAX_VX, MAX_VX);
    } else if (vx > 0) {
        vx = Math.max(0, vx - FRICTION * dtv);
    } else if (vx < 0) {
        vx = Math.min(0, vx + FRICTION * dtv);
    }
    ship.pos.x = clamp(ship.pos.x + vx * dtv, SHIP_W / 2, GAME_WIDTH - SHIP_W / 2);
    ship.angle = clamp((-vx / MAX_VX) * MAX_TILT, -MAX_TILT, MAX_TILT);

    wallObjs.forEach((o) => {
        o.pos.y += deltaScroll;
    });
    boostObjs.forEach((b) => {
        b.obj.pos.y += deltaScroll;
    });

    ensureTrackAhead();
    cleanupBehind();

    const bounds = trackBoundsAtPlayer();
    const shipLeft = ship.pos.x - SHIP_W / 2;
    const shipRight = ship.pos.x + SHIP_W / 2;
    if (shipLeft < bounds.left || shipRight > bounds.right) {
        crash();
        return;
    }

    for (const b of boostObjs) {
        if (b.collected) continue;
        const d = Math.hypot(ship.pos.x - b.obj.pos.x, ship.pos.y - b.obj.pos.y);
        if (d < BOOST_RADIUS + SHIP_W / 2) {
            b.collected = true;
            destroy(b.obj);
            boostTimer = BOOST_DURATION;
            boostBonus += BOOST_SCORE_BONUS;
        }
    }

    score = Math.floor(scrollY / 10) + boostBonus;
    updateHud();
});

resetTrack();
updateHud();

const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "oneMoreLineBestScore";

const GRAVITY = 900;
const BALL_RADIUS = 9;
const PEG_RADIUS = 7;
const ROPE_GRAB_RADIUS = 190;
const PEG_GAP_MIN = 130;
const PEG_GAP_MAX = 210;
const PEG_Y_MIN = 110;
const PEG_Y_MAX = 420;
const SPIKE_CHANCE = 0.35;
const SPIKE_RADIUS = 9;
const CULL_BEHIND = 420;
const PEG_SCORE_BONUS = 5;

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [16, 13, 34],
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
let score = 0;
let holding = false;
let vx = 0;
let vy = 0;
let attachedPeg = null;
let ropeLength = 0;
let pegs = [];
let spikes = [];
let nextPegX = 0;
let ropeObj = null;
let camX = GAME_WIDTH / 2;

for (let i = 0; i < 30; i++) {
    add([
        pos(rand(0, GAME_WIDTH), rand(0, GAME_HEIGHT)),
        circle(rand(1, 2)),
        color(255, 255, 255),
        opacity(1),
        fixed(),
        z(-10),
        { twinkleOffset: rand(0, 10) },
    ]).onUpdate(function () {
        this.opacity = wave(0.1, 0.7, time() * 1.5 + this.twinkleOffset);
    });
}

const ball = add([
    pos(0, 0),
    circle(BALL_RADIUS),
    color(255, 210, 61),
    outline(2, rgb(120, 90, 10)),
    area(),
    z(5),
    "ball",
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

function spawnPeg(isFirst) {
    const x = isFirst ? 130 : nextPegX;
    const y = isFirst ? 200 : rand(PEG_Y_MIN, PEG_Y_MAX);

    const peg = add([
        pos(x, y),
        circle(PEG_RADIUS),
        color(124, 92, 255),
        outline(2, rgb(230, 225, 255)),
        area(),
        "peg",
        { grabbed: false },
    ]);
    pegs.push(peg);

    if (!isFirst && pegs.length > 2 && Math.random() < SPIKE_CHANCE) {
        const prev = pegs[pegs.length - 2];
        const sx = (prev.pos.x + x) / 2 + rand(-16, 16);
        const sy = rand(PEG_Y_MIN - 20, PEG_Y_MAX + 20);
        const spike = add([
            pos(sx, sy),
            circle(SPIKE_RADIUS),
            color(255, 70, 70),
            outline(2, rgb(90, 15, 15)),
            area(),
            "spike",
        ]);
        spikes.push(spike);
    }

    nextPegX = x + rand(PEG_GAP_MIN, PEG_GAP_MAX);
}

function updateRope() {
    if (ropeObj) {
        destroy(ropeObj);
        ropeObj = null;
    }
    if (!attachedPeg) return;

    const dx = attachedPeg.pos.x - ball.pos.x;
    const dy = attachedPeg.pos.y - ball.pos.y;
    const dist = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    ropeObj = add([
        pos((ball.pos.x + attachedPeg.pos.x) / 2, (ball.pos.y + attachedPeg.pos.y) / 2),
        anchor("center"),
        rotate(angle),
        rect(dist, 2),
        color(255, 255, 255),
        opacity(0.55),
        z(-1),
    ]);
}

function findGrabbablePeg() {
    let closest = null;
    let closestDist = Infinity;
    for (const p of pegs) {
        if (p.pos.x < ball.pos.x - 4) continue;
        const dx = p.pos.x - ball.pos.x;
        const dy = p.pos.y - ball.pos.y;
        const d = Math.hypot(dx, dy);
        if (d <= ROPE_GRAB_RADIUS && d < closestDist) {
            closestDist = d;
            closest = p;
        }
    }
    return closest;
}

function die(reason) {
    if (state !== "playing") return;
    state = "gameover";
    holding = false;
    if (score > best) {
        best = score;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay("Game Over", `${reason} Score: ${score}. Press to try again.`, "Try Again");
}

function startGame() {
    pegs.forEach(destroy);
    spikes.forEach(destroy);
    if (ropeObj) destroy(ropeObj);
    pegs = [];
    spikes = [];
    ropeObj = null;
    nextPegX = 0;

    spawnPeg(true);

    const first = pegs[0];
    ball.pos.x = first.pos.x - 55;
    ball.pos.y = first.pos.y - 35;
    vx = 0;
    vy = 0;

    attachedPeg = first;
    first.grabbed = true;
    const dx0 = ball.pos.x - first.pos.x;
    const dy0 = ball.pos.y - first.pos.y;
    ropeLength = Math.hypot(dx0, dy0);

    holding = true;
    score = 0;
    camX = ball.pos.x;
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") {
        startGame();
        return;
    }
    holding = true;
}

function releaseHold() {
    holding = false;
}

onCollide("ball", "spike", () => die("You hit a hazard!"));

canvasEl.addEventListener("pointerdown", pressStart);
canvasEl.addEventListener("pointerup", releaseHold);
canvasEl.addEventListener("pointerleave", releaseHold);
overlayBtn.addEventListener("click", pressStart);

window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (!e.repeat) pressStart();
    }
});
window.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        releaseHold();
    }
});

onUpdate(() => {
    if (state !== "playing") return;

    vy += GRAVITY * dt();
    ball.pos.x += vx * dt();
    ball.pos.y += vy * dt();

    if (holding) {
        if (!attachedPeg) {
            const grabbed = findGrabbablePeg();
            if (grabbed) {
                attachedPeg = grabbed;
                const dx0 = ball.pos.x - grabbed.pos.x;
                const dy0 = ball.pos.y - grabbed.pos.y;
                ropeLength = Math.hypot(dx0, dy0);
                if (!grabbed.grabbed) {
                    grabbed.grabbed = true;
                    score += PEG_SCORE_BONUS;
                }
            }
        }
        if (attachedPeg) {
            const dx = ball.pos.x - attachedPeg.pos.x;
            const dy = ball.pos.y - attachedPeg.pos.y;
            const d = Math.hypot(dx, dy);
            if (d > ropeLength) {
                const nx = dx / d;
                const ny = dy / d;
                ball.pos.x = attachedPeg.pos.x + nx * ropeLength;
                ball.pos.y = attachedPeg.pos.y + ny * ropeLength;
                const vDot = vx * nx + vy * ny;
                vx -= vDot * nx;
                vy -= vDot * ny;
            }
        }
    } else {
        attachedPeg = null;
    }

    updateRope();

    camX = lerp(camX, ball.pos.x + 40, 0.08);
    setCamPos(camX, GAME_HEIGHT / 2);

    while (nextPegX - ball.pos.x < GAME_WIDTH * 2) spawnPeg(false);

    pegs = pegs.filter((p) => {
        if (p.pos.x < ball.pos.x - CULL_BEHIND) {
            destroy(p);
            return false;
        }
        return true;
    });
    spikes = spikes.filter((s) => {
        if (s.pos.x < ball.pos.x - CULL_BEHIND) {
            destroy(s);
            return false;
        }
        return true;
    });

    if (ball.pos.y < -30 || ball.pos.y > GAME_HEIGHT + 30) {
        die("You fell off the screen!");
        return;
    }

    score = Math.max(score, Math.floor(ball.pos.x / 10));
    updateHud();
});

setCamPos(camX, GAME_HEIGHT / 2);
updateHud();

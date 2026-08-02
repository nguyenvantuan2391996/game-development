const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const BEST_SCORE_KEY = "starCatcherBestScore";

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [12, 10, 30],
    letterbox: true,
    global: true,
});

loadBean();

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
let score = 0;
let lives = 3;
let spawnTimer = 0;
let spawnEvery = 0.9;
let fallSpeed = 140;

for (let i = 0; i < 40; i++) {
    add([
        pos(rand(0, GAME_WIDTH), rand(0, GAME_HEIGHT)),
        circle(rand(1, 2)),
        color(255, 255, 255),
        opacity(1),
        z(-10),
        { twinkleOffset: rand(0, 10) },
    ]).onUpdate(function () {
        this.opacity = wave(0.15, 0.9, time() * 2 + this.twinkleOffset);
    });
}

const player = add([
    sprite("bean"),
    pos(GAME_WIDTH / 2, GAME_HEIGHT - 60),
    anchor("center"),
    scale(0.5),
    area(),
    "player",
]);

let targetX = player.pos.x;

function updateHud() {
    hudScore.textContent = score;
    hudBest.textContent = best;
    hudLives.textContent = "❤".repeat(Math.max(0, lives));
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function burst(position, col) {
    for (let i = 0; i < 8; i++) {
        const angle = rand(0, 360);
        const speed = rand(60, 160);
        const rad = deg2rad(angle);
        add([
            pos(position),
            circle(rand(2, 4)),
            color(col[0], col[1], col[2]),
            opacity(1),
            lifespan(0.4, { fade: 0.3 }),
            move(vec2(Math.cos(rad), Math.sin(rad)), speed),
        ]);
    }
}

function flash(col) {
    add([
        rect(width(), height()),
        color(col[0], col[1], col[2]),
        opacity(0.35),
        fixed(),
        z(50),
        lifespan(0.15, { fade: 0.15 }),
    ]);
}

function spawnFalling() {
    const x = rand(24, GAME_WIDTH - 24);
    if (Math.random() < 0.25) {
        add([
            pos(x, -20),
            circle(10),
            color(255, 90, 90),
            outline(2, rgb(60, 12, 12)),
            area(),
            move(DOWN, fallSpeed),
            offscreen({ destroy: true }),
            "bomb",
        ]);
    } else {
        add([
            pos(x, -20),
            rotate(45),
            rect(14, 14),
            color(255, 210, 61),
            outline(2, rgb(120, 90, 10)),
            area(),
            move(DOWN, fallSpeed * rand(0.85, 1.15)),
            offscreen({ destroy: true }),
            "star",
        ]);
    }
}

function loseLife() {
    lives--;
    updateHud();
    shake(10);
    flash([255, 60, 60]);
    if (lives <= 0) gameOver();
}

function gameOver() {
    state = "gameover";
    get("bomb").forEach(destroy);
    get("star").forEach(destroy);
    if (score > best) {
        best = score;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay("Game Over", `You got hit too many times. Score: ${score}. Press to try again.`, "Try Again");
}

function startGame() {
    get("bomb").forEach(destroy);
    get("star").forEach(destroy);
    score = 0;
    lives = 3;
    spawnTimer = 0;
    spawnEvery = 0.9;
    fallSpeed = 140;
    player.pos.x = GAME_WIDTH / 2;
    targetX = player.pos.x;
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") startGame();
}

onCollide("player", "star", (p, star) => {
    destroy(star);
    score++;
    updateHud();
    burst(star.pos, [255, 210, 61]);
});

onCollide("player", "bomb", (p, bomb) => {
    destroy(bomb);
    loseLife();
});

onKeyDown("left", () => { targetX -= 6; });
onKeyDown("right", () => { targetX += 6; });
onKeyDown("a", () => { targetX -= 6; });
onKeyDown("d", () => { targetX += 6; });

canvasEl.addEventListener("pointermove", (e) => {
    if (state !== "playing") return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    targetX = (e.clientX - rect.left) * scaleX;
});

canvasEl.addEventListener("pointerdown", pressStart);
overlayBtn.addEventListener("click", pressStart);
window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) pressStart();
    }
});

onUpdate(() => {
    targetX = clamp(targetX, 20, GAME_WIDTH - 20);
    player.pos.x = lerp(player.pos.x, targetX, 0.35);

    if (state !== "playing") return;

    spawnTimer += dt();
    if (spawnTimer >= spawnEvery) {
        spawnTimer = 0;
        spawnFalling();
        spawnEvery = Math.max(0.35, spawnEvery - 0.01);
        fallSpeed = Math.min(340, fallSpeed + 2);
    }
});

updateHud();

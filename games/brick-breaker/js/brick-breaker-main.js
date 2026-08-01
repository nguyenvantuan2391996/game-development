(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudLives = document.getElementById("hud-lives");
    const hudLevel = document.getElementById("hud-level");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    const keys = {};
    let state = "ready";
    let score = 0;
    let lives = PADDLE_LIVES;
    let level = 1;
    let bricks = [];
    let paddle = { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2 };
    let ball = { x: 0, y: 0, vx: 0, vy: 0, launched: false };
    let lastTime = 0;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    window.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
        keys[e.key] = true;
        if (state === "ready" || state === "gameover") {
            if (e.key === " " || e.key === "Enter") startGame();
            return;
        }
        if (state === "playing" && !ball.launched && (e.key === " " || e.key === "ArrowUp")) {
            launchBall();
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener("pointerdown", () => {
        if (state === "ready" || state === "gameover") {
            startGame();
            return;
        }
        if (state === "playing" && !ball.launched) {
            launchBall();
        }
    });

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        const dir = btn.dataset.dir;
        const press = (e) => {
            e.preventDefault();
            keys[dir] = true;
            btn.classList.add("is-pressed");
            if (state === "ready" || state === "gameover") startGame();
        };
        const release = (e) => {
            e.preventDefault();
            keys[dir] = false;
            btn.classList.remove("is-pressed");
        };
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    });

    overlayBtn.addEventListener("click", startGame);

    function createBricks(forLevel) {
        const list = [];
        const toughChance = Math.min(0.35, TOUGH_BRICK_CHANCE_PER_LEVEL * forLevel);
        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                const x = BRICK_SIDE_MARGIN + c * (BRICK_WIDTH + BRICK_GAP);
                const y = BRICK_TOP_OFFSET + r * (BRICK_HEIGHT + BRICK_GAP);
                const hp = Math.random() < toughChance ? 2 : 1;
                list.push({
                    x,
                    y,
                    width: BRICK_WIDTH,
                    height: BRICK_HEIGHT,
                    hp,
                    maxHp: hp,
                    color: ROW_COLORS[r],
                    score: ROW_SCORE[r] + (forLevel - 1) * 5,
                    alive: true,
                });
            }
        }
        return list;
    }

    function resetBallOnPaddle() {
        ball.x = paddle.x + PADDLE_WIDTH / 2;
        ball.y = PADDLE_Y - BALL_RADIUS - 2;
        ball.vx = 0;
        ball.vy = 0;
        ball.launched = false;
    }

    function launchBall() {
        const angle = randomBetween(-100, -80) * (Math.PI / 180);
        const speed = BALL_SPEED_START + (level - 1) * BALL_SPEED_PER_LEVEL;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.launched = true;
    }

    function startGame() {
        state = "playing";
        score = 0;
        lives = PADDLE_LIVES;
        level = 1;
        paddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        bricks = createBricks(level);
        resetBallOnPaddle();
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function triggerGameOver() {
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `Score: ${score}. Level: ${level}. Tap to play again.`, "Play again");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function resolveBrickCollision() {
        for (const brick of bricks) {
            if (!brick.alive) continue;
            const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
            const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
            const dx = ball.x - closestX;
            const dy = ball.y - closestY;
            if (dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS) {
                brick.hp -= 1;
                if (brick.hp <= 0) {
                    brick.alive = false;
                    score += brick.score;
                } else {
                    score += Math.floor(brick.score / 2);
                }
                if (Math.abs(dx) > Math.abs(dy)) {
                    ball.vx = -ball.vx;
                    ball.x += dx > 0 ? BALL_RADIUS - Math.abs(dx) : -(BALL_RADIUS - Math.abs(dx));
                } else {
                    ball.vy = -ball.vy;
                    ball.y += dy > 0 ? BALL_RADIUS - Math.abs(dy) : -(BALL_RADIUS - Math.abs(dy));
                }
                return;
            }
        }
    }

    function updateWorld(dt) {
        if (keys.ArrowLeft || keys.a || keys.A) paddle.x -= PADDLE_SPEED * dt;
        if (keys.ArrowRight || keys.d || keys.D) paddle.x += PADDLE_SPEED * dt;
        paddle.x = clamp(paddle.x, 0, GAME_WIDTH - PADDLE_WIDTH);

        if (!ball.launched) {
            ball.x = paddle.x + PADDLE_WIDTH / 2;
            return;
        }

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - BALL_RADIUS < 0) {
            ball.x = BALL_RADIUS;
            ball.vx = Math.abs(ball.vx);
        } else if (ball.x + BALL_RADIUS > GAME_WIDTH) {
            ball.x = GAME_WIDTH - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y - BALL_RADIUS < 0) {
            ball.y = BALL_RADIUS;
            ball.vy = Math.abs(ball.vy);
        }

        if (
            ball.vy > 0 &&
            ball.y + BALL_RADIUS >= PADDLE_Y &&
            ball.y - BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT &&
            ball.x + BALL_RADIUS >= paddle.x &&
            ball.x - BALL_RADIUS <= paddle.x + PADDLE_WIDTH
        ) {
            const hitPos = clamp((ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2), -1, 1);
            const angle = hitPos * BALL_MAX_BOUNCE_ANGLE - Math.PI / 2;
            const speed = Math.hypot(ball.vx, ball.vy);
            ball.vx = Math.cos(angle) * speed;
            ball.vy = Math.sin(angle) * speed;
            ball.y = PADDLE_Y - BALL_RADIUS;
        }

        resolveBrickCollision();

        if (ball.y - BALL_RADIUS > GAME_HEIGHT) {
            lives -= 1;
            if (lives <= 0) {
                triggerGameOver();
            } else {
                resetBallOnPaddle();
            }
            return;
        }

        if (bricks.every((b) => !b.alive)) {
            score += 200;
            level += 1;
            bricks = createBricks(level);
            resetBallOnPaddle();
        }
    }

    function drawBrick(brick) {
        ctx.fillStyle = brick.color;
        ctx.globalAlpha = brick.hp < brick.maxHp ? 0.6 : 1;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(brick.x, brick.y, brick.width, 3);
        if (brick.maxHp > 1) {
            ctx.strokeStyle = "rgba(255,255,255,0.6)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(brick.x + 1.5, brick.y + 1.5, brick.width - 3, brick.height - 3);
        }
    }

    function render() {
        ctx.fillStyle = "#0a0e18";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        bricks.forEach((b) => {
            if (b.alive) drawBrick(b);
        });

        ctx.fillStyle = "#eaf2ff";
        ctx.beginPath();
        ctx.roundRect(paddle.x, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
        ctx.fill();

        const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_RADIUS);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#4dc9ff");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
        hudLives.textContent = lives;
        hudLevel.textContent = level;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        updateWorld(dt);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    bricks = createBricks(level);
    resetBallOnPaddle();
    render();
})();

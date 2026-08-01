(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudTime = document.getElementById("hud-time");
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
    let elapsedMs = 0;
    let ball = { x: PLAYER_X, y: PLAYER_Y, vx: 0, vy: 0, launched: false, touchedRim: false, scored: false, prevY: PLAYER_Y };
    let resetTimer = 0;
    let floatingTexts = [];
    let lastTime = 0;

    let isDragging = false;
    let dragPos = { x: 0, y: 0 };

    function dist(ax, ay, bx, by) {
        return Math.hypot(ax - bx, ay - by);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function spawnFloatingText(x, y, text, color) {
        floatingTexts.push({ x, y, text, color, life: 700, maxLife: 700 });
    }

    function canvasPosFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    canvas.addEventListener("pointerdown", (e) => {
        if (state === "ready" || state === "gameover") {
            startGame();
            return;
        }
        if (ball.launched) return;
        const pos = canvasPosFromEvent(e);
        if (dist(pos.x, pos.y, ball.x, ball.y) < 60) {
            isDragging = true;
            dragPos = pos;
        }
    });
    window.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        dragPos = canvasPosFromEvent(e);
    });
    window.addEventListener("pointerup", () => {
        if (!isDragging) return;
        isDragging = false;
        const dx = dragPos.x - ball.x;
        const dy = dragPos.y - ball.y;
        const pullDist = Math.min(MAX_PULL_DISTANCE, Math.hypot(dx, dy));
        const power = pullDist / MAX_PULL_DISTANCE;
        if (power < 0.08) return;

        const pullLen = Math.hypot(dx, dy) || 1;
        const shotDirX = -dx / pullLen;
        const shotDirY = -dy / pullLen;
        const speed = MIN_SHOT_SPEED + power * (MAX_SHOT_SPEED - MIN_SHOT_SPEED);
        ball.vx = shotDirX * speed;
        ball.vy = shotDirY * speed;
        ball.launched = true;
        ball.touchedRim = false;
        ball.scored = false;
    });

    overlayBtn.addEventListener("click", startGame);

    function startGame() {
        state = "playing";
        score = 0;
        elapsedMs = 0;
        floatingTexts = [];
        resetBall();
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function resetBall() {
        ball = { x: PLAYER_X, y: PLAYER_Y, vx: 0, vy: 0, launched: false, touchedRim: false, scored: false, prevY: PLAYER_Y };
        resetTimer = 0;
    }

    function triggerGameOver() {
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Time's up!", `Your score: ${score}. Tap to play again.`, "Play again");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function bounceOffPost(postX, postY) {
        const dx = ball.x - postX;
        const dy = ball.y - postY;
        const d = Math.hypot(dx, dy) || 0.0001;
        const minDist = BALL_RADIUS + RIM_POST_RADIUS;
        if (d >= minDist) return false;
        const nx = dx / d;
        const ny = dy / d;
        ball.x = postX + nx * minDist;
        ball.y = postY + ny * minDist;
        const velAlongNormal = ball.vx * nx + ball.vy * ny;
        ball.vx -= (1 + RIM_RESTITUTION) * velAlongNormal * nx;
        ball.vy -= (1 + RIM_RESTITUTION) * velAlongNormal * ny;
        ball.touchedRim = true;
        return true;
    }

    function handleCollisions() {
        bounceOffPost(HOOP_X - RIM_WIDTH / 2, HOOP_Y);
        bounceOffPost(HOOP_X + RIM_WIDTH / 2, HOOP_Y);

        const bbClosestX = clamp(ball.x, BACKBOARD_X, BACKBOARD_X + 4);
        const bbClosestY = clamp(ball.y, BACKBOARD_TOP, BACKBOARD_TOP + BACKBOARD_HEIGHT);
        const bdx = ball.x - bbClosestX;
        const bdy = ball.y - bbClosestY;
        if (bdx * bdx + bdy * bdy <= BALL_RADIUS * BALL_RADIUS && ball.vx > 0) {
            ball.x = BACKBOARD_X - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx) * BACKBOARD_RESTITUTION;
            ball.touchedRim = true;
        }

        if (ball.x - BALL_RADIUS < 0) {
            ball.x = BALL_RADIUS;
            ball.vx = Math.abs(ball.vx) * 0.6;
        } else if (ball.x + BALL_RADIUS > GAME_WIDTH) {
            ball.x = GAME_WIDTH - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx) * 0.6;
        }
    }

    function checkScore() {
        if (ball.scored) return;
        const scoreZoneHalf = RIM_WIDTH / 2 - BALL_RADIUS * 0.55;
        const crossedDown = ball.prevY < HOOP_Y && ball.y >= HOOP_Y;
        if (crossedDown && ball.vy > 0 && Math.abs(ball.x - HOOP_X) < scoreZoneHalf) {
            ball.scored = true;
            const bonus = ball.touchedRim ? 0 : SWISH_BONUS;
            const points = MAKE_SCORE + bonus;
            score += points;
            spawnFloatingText(ball.x, ball.y, bonus > 0 ? `+${points} SWISH!` : `+${points}`, bonus > 0 ? "#ffd93d" : "#4dff88");
        }
    }

    function updateWorld(dt, dtMs) {
        elapsedMs += dtMs;
        if (elapsedMs >= ROUND_TIME_MS) {
            elapsedMs = ROUND_TIME_MS;
            triggerGameOver();
            return;
        }

        if (ball.launched) {
            ball.prevY = ball.y;
            ball.vy += GRAVITY * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            handleCollisions();
            checkScore();

            if (ball.y - BALL_RADIUS > GAME_HEIGHT + 40) {
                resetTimer += dtMs;
                if (resetTimer > RESET_DELAY_MS) resetBall();
            } else if (ball.scored) {
                resetTimer += dtMs;
                if (resetTimer > RESET_DELAY_MS) resetBall();
            }
        }

        floatingTexts.forEach((t) => {
            t.y -= 40 * dt;
            t.life -= dtMs;
        });
        floatingTexts = floatingTexts.filter((t) => t.life > 0);
    }

    function drawCourt() {
        const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        bg.addColorStop(0, "#1a0f08");
        bg.addColorStop(1, "#0d0704");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(255,157,61,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT + 40, 160, Math.PI, Math.PI * 2);
        ctx.stroke();
    }

    function drawHoop() {
        ctx.fillStyle = "#e8e8f0";
        ctx.fillRect(BACKBOARD_X, BACKBOARD_TOP, 4, BACKBOARD_HEIGHT);
        ctx.strokeStyle = "rgba(255,82,82,0.7)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(BACKBOARD_X - 2, BACKBOARD_TOP + 8, 8, 22);

        ctx.strokeStyle = "#ff5252";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(HOOP_X - RIM_WIDTH / 2, HOOP_Y);
        ctx.lineTo(HOOP_X + RIM_WIDTH / 2, HOOP_Y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
            const nx = HOOP_X + (i * RIM_WIDTH) / 5;
            ctx.beginPath();
            ctx.moveTo(nx, HOOP_Y);
            ctx.lineTo(HOOP_X + i * 3, HOOP_Y + 26);
            ctx.stroke();
        }
    }

    function drawBall() {
        const grad = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, BALL_RADIUS);
        grad.addColorStop(0, "#ffb066");
        grad.addColorStop(1, "#e8590c");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ball.x - BALL_RADIUS, ball.y);
        ctx.lineTo(ball.x + BALL_RADIUS, ball.y);
        ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
        ctx.lineTo(ball.x, ball.y + BALL_RADIUS);
        ctx.stroke();
    }

    function drawAimLine() {
        if (!isDragging) return;
        const dx = dragPos.x - ball.x;
        const dy = dragPos.y - ball.y;
        const pullLen = Math.min(MAX_PULL_DISTANCE, Math.hypot(dx, dy));
        const dirLen = Math.hypot(dx, dy) || 1;
        const power = pullLen / MAX_PULL_DISTANCE;
        const shotDirX = -dx / dirLen;
        const shotDirY = -dy / dirLen;
        const color = power < 0.4 ? "#4dff88" : power < 0.75 ? "#ffd93d" : "#ff5252";

        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + shotDirX * (50 + power * 140), ball.y + shotDirY * (50 + power * 140));
        ctx.stroke();
        ctx.restore();
    }

    function render() {
        drawCourt();
        drawHoop();
        drawAimLine();
        drawBall();

        floatingTexts.forEach((t) => {
            const alpha = Math.max(0, t.life / t.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.color;
            ctx.font = "bold 18px 'Poppins', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1;
        });
    }

    function updateHud() {
        const remaining = Math.max(0, ROUND_TIME_MS - elapsedMs);
        hudTime.textContent = Math.ceil(remaining / 1000);
        hudScore.textContent = score;
        hudBest.textContent = best;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        updateWorld(dt, dt * 1000);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

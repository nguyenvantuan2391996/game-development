(function () {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "2p" ? "2p" : "cpu";

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudPlayerScore = document.getElementById("hud-player-score");
    const hudCpuScore = document.getElementById("hud-cpu-score");
    const hudPlayerLabel = document.getElementById("hud-player-label");
    const hudCpuLabel = document.getElementById("hud-cpu-label");
    const hudBestChip = document.getElementById("hud-best-chip");
    const hudBest = document.getElementById("hud-best");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");
    const touchControls = document.getElementById("touch-controls");
    const twoPlayerNote = document.getElementById("two-player-note");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    if (mode === "2p") {
        hudPlayerLabel.textContent = "Player 1";
        hudCpuLabel.textContent = "Player 2";
        hudBestChip.style.display = "none";
        if (touchControls) touchControls.style.display = "none";
        if (twoPlayerNote) twoPlayerNote.hidden = false;
        overlayDesc.textContent = "Player 1: ◀ ▶ · Player 2: A / D. First to 7 points wins. Press to start.";
    }

    const keys = {};
    let state = "ready";
    let playerScore = 0;
    let cpuScore = 0;
    let playerPaddle = { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2 };
    let cpuPaddle = { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2 };
    let ball = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: 0, vy: 0 };
    let paused = false;
    let pauseTimer = 0;
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
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener("pointerdown", () => {
        if (state === "ready" || state === "gameover") startGame();
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

    function serveBall(towardPlayer) {
        ball.x = GAME_WIDTH / 2;
        ball.y = GAME_HEIGHT / 2;
        const angle = randomBetween(-25, 25) * (Math.PI / 180);
        const speed = BALL_SPEED_START;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = towardPlayer ? Math.cos(angle) * speed : -Math.cos(angle) * speed;
    }

    function startGame() {
        state = "playing";
        playerScore = 0;
        cpuScore = 0;
        playerPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        cpuPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        paused = false;
        serveBall(Math.random() < 0.5);
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function triggerGameOver() {
        state = "gameover";
        const won = playerScore > cpuScore;
        if (mode === "2p") {
            showOverlay(
                won ? "Player 1 wins!" : "Player 2 wins!",
                `Score: ${playerScore} - ${cpuScore}. Press to play again.`,
                "Play Again"
            );
            return;
        }
        if (playerScore > best) {
            best = playerScore;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay(
            won ? "You win!" : "CPU wins!",
            `Score: ${playerScore} - ${cpuScore}. Press to play again.`,
            "Play Again"
        );
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function checkWin() {
        if (playerScore >= WIN_SCORE || cpuScore >= WIN_SCORE) {
            triggerGameOver();
            return true;
        }
        return false;
    }

    function updateWorld(dt, dtMs) {
        if (mode === "2p") {
            if (keys.ArrowLeft) playerPaddle.x -= PLAYER_SPEED * dt;
            if (keys.ArrowRight) playerPaddle.x += PLAYER_SPEED * dt;
            if (keys.a || keys.A) cpuPaddle.x -= PLAYER_SPEED * dt;
            if (keys.d || keys.D) cpuPaddle.x += PLAYER_SPEED * dt;
        } else {
            if (keys.ArrowLeft || keys.a || keys.A) playerPaddle.x -= PLAYER_SPEED * dt;
            if (keys.ArrowRight || keys.d || keys.D) playerPaddle.x += PLAYER_SPEED * dt;

            const cpuTarget = ball.x - PADDLE_WIDTH / 2;
            if (Math.abs(cpuPaddle.x - cpuTarget) > CPU_REACTION_DEADZONE) {
                cpuPaddle.x += Math.sign(cpuTarget - cpuPaddle.x) * CPU_SPEED * dt;
            }
        }
        playerPaddle.x = clamp(playerPaddle.x, 0, GAME_WIDTH - PADDLE_WIDTH);
        cpuPaddle.x = clamp(cpuPaddle.x, 0, GAME_WIDTH - PADDLE_WIDTH);

        if (paused) {
            pauseTimer -= dtMs;
            if (pauseTimer <= 0) paused = false;
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

        if (
            ball.vy > 0 &&
            ball.y + BALL_RADIUS >= PLAYER_Y &&
            ball.y - BALL_RADIUS <= PLAYER_Y + PADDLE_HEIGHT &&
            ball.x + BALL_RADIUS >= playerPaddle.x &&
            ball.x - BALL_RADIUS <= playerPaddle.x + PADDLE_WIDTH
        ) {
            const hitPos = clamp((ball.x - (playerPaddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2), -1, 1);
            const angle = hitPos * BALL_MAX_BOUNCE_ANGLE;
            const speed = Math.min(BALL_SPEED_MAX, Math.hypot(ball.vx, ball.vy) + BALL_SPEED_GAIN);
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.cos(angle) * speed;
            ball.y = PLAYER_Y - BALL_RADIUS;
        }

        if (
            ball.vy < 0 &&
            ball.y - BALL_RADIUS <= CPU_Y + PADDLE_HEIGHT &&
            ball.y + BALL_RADIUS >= CPU_Y &&
            ball.x + BALL_RADIUS >= cpuPaddle.x &&
            ball.x - BALL_RADIUS <= cpuPaddle.x + PADDLE_WIDTH
        ) {
            const hitPos = clamp((ball.x - (cpuPaddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2), -1, 1);
            const angle = hitPos * BALL_MAX_BOUNCE_ANGLE;
            const speed = Math.min(BALL_SPEED_MAX, Math.hypot(ball.vx, ball.vy) + BALL_SPEED_GAIN);
            ball.vx = Math.sin(angle) * speed;
            ball.vy = Math.cos(angle) * speed;
            ball.y = CPU_Y + PADDLE_HEIGHT + BALL_RADIUS;
        }

        if (ball.y - BALL_RADIUS > GAME_HEIGHT) {
            cpuScore += 1;
            if (checkWin()) return;
            paused = true;
            pauseTimer = SERVE_DELAY_MS;
            serveBall(true);
        } else if (ball.y + BALL_RADIUS < 0) {
            playerScore += 1;
            if (checkWin()) return;
            paused = true;
            pauseTimer = SERVE_DELAY_MS;
            serveBall(false);
        }
    }

    function render() {
        ctx.fillStyle = "#08111c";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.setLineDash([8, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT / 2);
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#4dc9ff";
        ctx.beginPath();
        ctx.roundRect(playerPaddle.x, PLAYER_Y, PADDLE_WIDTH, PADDLE_HEIGHT, 5);
        ctx.fill();

        ctx.fillStyle = "#ff5252";
        ctx.beginPath();
        ctx.roundRect(cpuPaddle.x, CPU_Y, PADDLE_WIDTH, PADDLE_HEIGHT, 5);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    function updateHud() {
        hudPlayerScore.textContent = playerScore;
        hudCpuScore.textContent = cpuScore;
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

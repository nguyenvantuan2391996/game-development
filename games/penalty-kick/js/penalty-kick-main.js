(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let state = "ready";
    let phase = "ready-kick";
    let streak = 0;
    let score = 0;
    let ball = { x: PLAYER_X, y: PLAYER_Y, startX: PLAYER_X, startY: PLAYER_Y };
    let keeper = { x: KEEPER_HOME_X, y: KEEPER_HOME_Y, startX: KEEPER_HOME_X, startY: KEEPER_HOME_Y, targetX: KEEPER_HOME_X, targetY: KEEPER_HOME_Y, targetIndex: -1 };
    let kickTargetIndex = -1;
    let animTimer = 0;
    let resultTimer = 0;
    let lastResult = "";
    let lastTime = 0;

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function zoneCenter(index) {
        const col = index % ZONE_COLS;
        const row = Math.floor(index / ZONE_COLS);
        return { x: GOAL_LEFT + ZONE_WIDTH * (col + 0.5), y: GOAL_TOP + ZONE_HEIGHT * (row + 0.5) };
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
        if (state !== "playing" || phase !== "ready-kick") return;
        const pos = canvasPosFromEvent(e);
        if (pos.x < GOAL_LEFT || pos.x > GOAL_RIGHT || pos.y < GOAL_TOP || pos.y > GOAL_BOTTOM) return;
        const col = clamp(Math.floor((pos.x - GOAL_LEFT) / ZONE_WIDTH), 0, ZONE_COLS - 1);
        const row = clamp(Math.floor((pos.y - GOAL_TOP) / ZONE_HEIGHT), 0, ZONE_ROWS - 1);
        attemptKick(row * ZONE_COLS + col);
    });

    overlayBtn.addEventListener("click", startGame);

    function resetForNextKick() {
        ball.x = PLAYER_X;
        ball.y = PLAYER_Y;
        keeper.x = KEEPER_HOME_X;
        keeper.y = KEEPER_HOME_Y;
        phase = "ready-kick";
    }

    function startGame() {
        state = "playing";
        streak = 0;
        score = 0;
        resetForNextKick();
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function attemptKick(targetIndex) {
        kickTargetIndex = targetIndex;
        ball.startX = ball.x;
        ball.startY = ball.y;

        const guessChance = Math.min(MAX_GUESS_CHANCE, BASE_GUESS_CHANCE + streak * GUESS_CHANCE_STEP);
        let diveIndex;
        if (Math.random() < guessChance) {
            diveIndex = targetIndex;
        } else {
            const others = [0, 1, 2, 3, 4, 5].filter((i) => i !== targetIndex);
            diveIndex = others[Math.floor(Math.random() * others.length)];
        }
        keeper.startX = keeper.x;
        keeper.startY = keeper.y;
        keeper.targetIndex = diveIndex;
        const kc = zoneCenter(diveIndex);
        keeper.targetX = kc.x;
        keeper.targetY = kc.y;

        phase = "animating";
        animTimer = 0;
    }

    function resolveKick() {
        const saved = keeper.targetIndex === kickTargetIndex;
        if (saved) {
            lastResult = "saved";
        } else {
            streak += 1;
            score = streak;
            if (score > best) {
                best = score;
                localStorage.setItem(BEST_SCORE_KEY, String(best));
            }
            lastResult = "goal";
        }
        phase = "result";
        resultTimer = 0;
    }

    function triggerGameOver() {
        state = "gameover";
        showOverlay("Bị cản phá!", `Bạn ghi được ${streak} quả liên tiếp. Nhấn để chơi lại.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function updateWorld(dtMs) {
        if (phase === "animating") {
            animTimer += dtMs;
            const t = clamp(animTimer / KICK_DURATION_MS, 0, 1);
            const target = zoneCenter(kickTargetIndex);
            ball.x = lerp(ball.startX, target.x, t);
            ball.y = lerp(ball.startY, target.y, t);
            keeper.x = lerp(keeper.startX, keeper.targetX, t);
            keeper.y = lerp(keeper.startY, keeper.targetY, t);
            if (t >= 1) resolveKick();
        } else if (phase === "result") {
            resultTimer += dtMs;
            if (resultTimer >= RESULT_DISPLAY_MS) {
                if (lastResult === "saved") {
                    triggerGameOver();
                } else {
                    resetForNextKick();
                }
            }
        }
    }

    function drawPitch() {
        const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        bg.addColorStop(0, "#0d3a1a");
        bg.addColorStop(1, "#0a2412");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "rgba(255,255,255,0.03)";
        for (let i = 0; i < 8; i++) {
            if (i % 2 === 0) ctx.fillRect(0, i * (GAME_HEIGHT / 8), GAME_WIDTH, GAME_HEIGHT / 8);
        }

        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 3;
        ctx.strokeRect(GOAL_LEFT, GOAL_TOP, GOAL_RIGHT - GOAL_LEFT, GOAL_BOTTOM - GOAL_TOP);

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        for (let c = 1; c < ZONE_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(GOAL_LEFT + c * ZONE_WIDTH, GOAL_TOP);
            ctx.lineTo(GOAL_LEFT + c * ZONE_WIDTH, GOAL_BOTTOM);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(GOAL_LEFT, GOAL_TOP + ZONE_HEIGHT);
        ctx.lineTo(GOAL_RIGHT, GOAL_TOP + ZONE_HEIGHT);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(PLAYER_X, PLAYER_Y + 20, 60, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawKeeper() {
        ctx.save();
        ctx.translate(keeper.x, keeper.y);
        ctx.fillStyle = "#ffd93d";
        ctx.fillRect(-16, -14, 32, 30);
        ctx.fillStyle = "#ffcf9e";
        ctx.beginPath();
        ctx.arc(0, -22, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0d3a1a";
        ctx.fillRect(-16, 16, 10, 12);
        ctx.fillRect(6, 16, 10, 12);
        ctx.restore();
    }

    function drawBall() {
        ctx.fillStyle = "#f4f4f4";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ball.x - 4, ball.y);
        ctx.lineTo(ball.x + 4, ball.y);
        ctx.moveTo(ball.x, ball.y - 4);
        ctx.lineTo(ball.x, ball.y + 4);
        ctx.stroke();
    }

    function drawResultText() {
        if (phase !== "result") return;
        ctx.fillStyle = lastResult === "goal" ? "#4dff88" : "#ff5252";
        ctx.font = "bold 30px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(lastResult === "goal" ? "VÀO RỒI!" : "CẢN PHÁ!", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
    }

    function render() {
        drawPitch();
        drawKeeper();
        drawBall();
        drawResultText();
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dtMs = Math.min(now - lastTime, 48);
        lastTime = now;

        updateWorld(dtMs);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

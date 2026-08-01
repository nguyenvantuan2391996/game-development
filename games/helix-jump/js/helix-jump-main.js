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
    let ball, camera, rings, nextRingWorldY, rotationOffset, score;

    function normalizeAngle(a) {
        const twoPi = Math.PI * 2;
        return ((a % twoPi) + twoPi) % twoPi;
    }

    function dangerChance() {
        if (score < DANGER_UNLOCK_SCORE) return 0;
        return Math.min(DANGER_CHANCE_MAX, DANGER_CHANCE_START + (score - DANGER_UNLOCK_SCORE) * 0.015);
    }

    function makeRing(worldY) {
        const segments = new Array(SEGMENTS).fill("safe");
        const indices = [...Array(SEGMENTS).keys()];
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const gapCount = Math.random() < 0.5 ? 2 : 3;
        for (let i = 0; i < gapCount; i++) segments[indices[i]] = "gap";

        const chance = dangerChance();
        for (let i = gapCount; i < indices.length; i++) {
            if (Math.random() < chance) segments[indices[i]] = "danger";
        }

        return {
            worldY,
            segments,
            baseRotation: Math.random() * Math.PI * 2,
            passed: false,
        };
    }

    function spawnRingsAhead() {
        while (nextRingWorldY - camera.target < GAME_HEIGHT + 200) {
            rings.push(makeRing(nextRingWorldY));
            nextRingWorldY += RING_GAP;
        }
    }

    function resetGame() {
        ball = { worldY: -40, prevWorldY: -40, vy: 0 };
        camera = { worldY: 0, target: 0 };
        rings = [];
        nextRingWorldY = 120;
        rotationOffset = 0;
        score = 0;
        spawnRingsAhead();
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        updateHud();
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    const keys = {};
    window.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow")) e.preventDefault();
        keys[e.key] = true;
        if (state !== "playing" && (e.key === " " || e.key === "Enter")) {
            startGame();
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    overlayBtn.addEventListener("click", startGame);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        const dir = btn.dataset.dir;
        const press = (e) => {
            e.preventDefault();
            keys[dir] = true;
            btn.classList.add("is-pressed");
            if (state !== "playing") startGame();
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

    let dragActive = false;
    let dragLastX = 0;
    canvas.addEventListener("pointerdown", (e) => {
        if (state !== "playing") {
            startGame();
            return;
        }
        dragActive = true;
        dragLastX = e.clientX;
    });
    window.addEventListener("pointermove", (e) => {
        if (!dragActive) return;
        const dx = e.clientX - dragLastX;
        dragLastX = e.clientX;
        rotationOffset += dx * 0.012;
    });
    window.addEventListener("pointerup", () => {
        dragActive = false;
    });

    function die() {
        if (state !== "playing") return;
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `You cleared ${score} floors. Press to play again.`, "Play Again");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
    }

    function segmentIndexAtFront(ring) {
        const rotation = ring.baseRotation + rotationOffset;
        const rel = normalizeAngle(FRONT_ANGLE - rotation);
        return Math.floor(rel / SEGMENT_ANGLE) % SEGMENTS;
    }

    function updateWorld(dt) {
        if (keys.ArrowLeft || keys.a || keys.A) rotationOffset -= ROTATE_SPEED * dt;
        if (keys.ArrowRight || keys.d || keys.D) rotationOffset += ROTATE_SPEED * dt;

        ball.prevWorldY = ball.worldY;
        ball.vy = Math.min(TERMINAL_VELOCITY, ball.vy + GRAVITY * dt);
        ball.worldY += ball.vy * dt;

        if (ball.vy > 0) {
            for (const ring of rings) {
                if (ring.worldY < ball.prevWorldY || ring.worldY > ball.worldY) continue;
                const idx = segmentIndexAtFront(ring);
                const type = ring.segments[idx];
                if (type === "danger") {
                    die();
                    return;
                } else if (type === "safe") {
                    ball.worldY = ring.worldY;
                    ball.vy = -BOUNCE_VELOCITY;
                    break;
                } else if (type === "gap" && !ring.passed) {
                    ring.passed = true;
                    score += 1;
                }
            }
        }

        camera.target = Math.max(camera.target, ball.worldY - CAMERA_MARGIN);
        camera.worldY += (camera.target - camera.worldY) * CAMERA_LERP;

        spawnRingsAhead();
        rings = rings.filter((r) => r.worldY - camera.worldY < GAME_HEIGHT + 250);
    }

    function screenY(worldY) {
        return worldY - camera.worldY + 90;
    }

    function drawRing(ring) {
        const y = screenY(ring.worldY);
        if (y < -RING_RY * 2 || y > GAME_HEIGHT + RING_RY * 2) return;
        const rotation = ring.baseRotation + rotationOffset;

        for (let i = 0; i < SEGMENTS; i++) {
            const type = ring.segments[i];
            if (type === "gap") continue;
            const start = rotation + i * SEGMENT_ANGLE;
            const end = start + SEGMENT_ANGLE;

            ctx.beginPath();
            ctx.moveTo(GAME_WIDTH / 2, y);
            ctx.ellipse(GAME_WIDTH / 2, y, RING_RX, RING_RY, 0, start, end);
            ctx.closePath();
            ctx.fillStyle = type === "danger" ? "#e63946" : "#4ade80";
            ctx.fill();
            ctx.strokeStyle = "rgba(11,10,31,0.6)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function drawBall() {
        const ballY = screenY(ball.worldY);
        ctx.fillStyle = "#ffcf4d";
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, ballY, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2 - 4, ballY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function render() {
        ctx.fillStyle = "#12102a";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(GAME_WIDTH / 2 - 3, 0, 6, GAME_HEIGHT);

        rings.forEach(drawRing);
        drawBall();
    }

    let lastTime = 0;
    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        updateWorld(dt);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    resetGame();
    render();
})();

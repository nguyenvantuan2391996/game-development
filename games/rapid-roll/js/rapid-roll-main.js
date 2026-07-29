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

    const keys = {};
    window.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
        keys[e.key] = true;
        if ((state === "ready" || state === "gameover") && (e.key === " " || e.key === "Enter")) {
            startGame();
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    let state = "ready";
    let ball = { x: GAME_WIDTH / 2, worldY: 40, vy: 0 };
    let camera = { y: 0 };
    let platforms = [];
    let lowestGeneratedY = 0;
    let maxDepth = 0;
    let score = 0;
    let lastTime = 0;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    overlayBtn.addEventListener("click", startGame);

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

    function makePlatform(worldY, x, width, type) {
        const p = { worldY, x, width, type, alive: true, collidable: true };
        if (type === "moving") {
            p.speed = randomBetween(MOVING_PLATFORM_SPEED_MIN, MOVING_PLATFORM_SPEED_MAX);
            p.dir = Math.random() < 0.5 ? 1 : -1;
        }
        if (type === "crumble") {
            p.crumbling = false;
            p.crumbleTimer = 0;
        }
        return p;
    }

    function pickPlatformType(depth) {
        const options = [{ type: "normal", w: 55 }];
        if (depth > MOVING_UNLOCK_DEPTH) options.push({ type: "moving", w: 20 });
        if (depth > CRUMBLE_UNLOCK_DEPTH) options.push({ type: "crumble", w: 20 });
        if (depth > SPIKE_UNLOCK_DEPTH) options.push({ type: "spike", w: 14 });
        const total = options.reduce((sum, o) => sum + o.w, 0);
        let roll = Math.random() * total;
        for (const o of options) {
            if (roll < o.w) return o.type;
            roll -= o.w;
        }
        return "normal";
    }

    function generatePlatformsAhead() {
        while (lowestGeneratedY < camera.y + GAME_HEIGHT + 220) {
            const width = randomBetween(PLATFORM_WIDTH_MIN, PLATFORM_WIDTH_MAX);
            const maxX = GAME_WIDTH - PLATFORM_MARGIN_X - width;
            const x = randomBetween(PLATFORM_MARGIN_X, Math.max(PLATFORM_MARGIN_X, maxX));
            const gap = randomBetween(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
            lowestGeneratedY += gap;
            const type = pickPlatformType(lowestGeneratedY);
            platforms.push(makePlatform(lowestGeneratedY, x, width, type));
        }
    }

    function startGame() {
        state = "playing";
        ball = { x: GAME_WIDTH / 2, worldY: 40, vy: 0 };
        camera = { y: 0 };
        platforms = [];
        lowestGeneratedY = 110;
        platforms.push(makePlatform(110, GAME_WIDTH / 2 - 70, 140, "normal"));
        generatePlatformsAhead();
        maxDepth = 0;
        score = 0;
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function handlePlayerInput(dt) {
        if (keys.ArrowLeft || keys.a || keys.A) ball.x -= PLAYER_SPEED * dt;
        if (keys.ArrowRight || keys.d || keys.D) ball.x += PLAYER_SPEED * dt;
        ball.x = Math.max(BALL_RADIUS, Math.min(GAME_WIDTH - BALL_RADIUS, ball.x));
    }

    function triggerGameOver(reason) {
        if (state === "gameover") return;
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `${reason} Độ sâu: ${score}m. Nhấn để chơi lại.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function updateWorld(dt, dtMs) {
        const prevY = ball.worldY;
        ball.vy += GRAVITY * dt;
        ball.worldY += ball.vy * dt;

        platforms.forEach((p) => {
            if (p.type === "moving") {
                p.x += p.dir * p.speed * dt;
                if (p.x < 0) {
                    p.x = 0;
                    p.dir = 1;
                } else if (p.x + p.width > GAME_WIDTH) {
                    p.x = GAME_WIDTH - p.width;
                    p.dir = -1;
                }
            }
            if (p.type === "crumble" && p.crumbling) {
                p.crumbleTimer -= dtMs;
                if (p.crumbleTimer <= 0) {
                    p.collidable = false;
                }
            }
        });

        if (ball.vy > 0) {
            for (const p of platforms) {
                if (!p.collidable) continue;
                const ballBottomPrev = prevY + BALL_RADIUS;
                const ballBottomNew = ball.worldY + BALL_RADIUS;
                if (ballBottomPrev <= p.worldY && ballBottomNew >= p.worldY && ball.x + BALL_RADIUS > p.x && ball.x - BALL_RADIUS < p.x + p.width) {
                    if (p.type === "spike") {
                        triggerGameOver("Bạn đã trúng bẫy gai!");
                        return;
                    }
                    ball.worldY = p.worldY - BALL_RADIUS;
                    ball.vy = -BOUNCE_VELOCITY;
                    if (p.type === "crumble" && !p.crumbling) {
                        p.crumbling = true;
                        p.crumbleTimer = CRUMBLE_DELAY_MS;
                    }
                    break;
                }
            }
        }

        if (state !== "playing") return;

        maxDepth = Math.max(maxDepth, ball.worldY);
        score = Math.max(0, Math.floor(maxDepth / 10));

        const scrollSpeed = Math.min(SCROLL_SPEED_MAX, BASE_SCROLL_SPEED + maxDepth * SCROLL_SPEED_PER_DEPTH);
        const followTarget = ball.worldY - GAME_HEIGHT * FOLLOW_LINE_RATIO;
        camera.y = Math.max(camera.y + scrollSpeed * dt, followTarget);

        const screenY = ball.worldY - camera.y;
        if (screenY < -BALL_RADIUS * 2) {
            triggerGameOver("Bạn đã bị bỏ lại phía sau!");
            return;
        }

        generatePlatformsAhead();
        platforms = platforms.filter((p) => p.alive && p.worldY > camera.y - 40);
    }

    function drawPlatform(p) {
        const screenY = p.worldY - camera.y;
        if (screenY < -30 || screenY > GAME_HEIGHT + 30) return;

        if (p.type === "spike") {
            ctx.fillStyle = "#ff4d4d";
            ctx.fillRect(p.x, screenY - 2, p.width, PLATFORM_HEIGHT - 2);
            ctx.fillStyle = "#ffb3b3";
            const teeth = Math.max(3, Math.floor(p.width / 14));
            for (let i = 0; i < teeth; i++) {
                const tx = p.x + (i + 0.5) * (p.width / teeth);
                ctx.beginPath();
                ctx.moveTo(tx - 6, screenY - 2);
                ctx.lineTo(tx, screenY - 14);
                ctx.lineTo(tx + 6, screenY - 2);
                ctx.closePath();
                ctx.fill();
            }
            return;
        }

        let color = "#4dc9ff";
        if (p.type === "moving") color = "#b388ff";
        if (p.type === "crumble") color = p.crumbling ? "#ffbf69" : "#ffe14d";
        if (!p.collidable) return;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(p.x, screenY, p.width, PLATFORM_HEIGHT, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(p.x + 2, screenY + 1.5, p.width - 4, 2);

        if (p.type === "crumble") {
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x + p.width * 0.3, screenY);
            ctx.lineTo(p.x + p.width * 0.4, screenY + PLATFORM_HEIGHT);
            ctx.moveTo(p.x + p.width * 0.65, screenY);
            ctx.lineTo(p.x + p.width * 0.55, screenY + PLATFORM_HEIGHT);
            ctx.stroke();
        }
    }

    function drawBall() {
        const screenY = ball.worldY - camera.y;
        const gradient = ctx.createRadialGradient(
            ball.x - 4, screenY - 4, 2,
            ball.x, screenY, BALL_RADIUS
        );
        gradient.addColorStop(0, "#ffe0b3");
        gradient.addColorStop(0.5, "#ff9d3d");
        gradient.addColorStop(1, "#e8590c");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, screenY, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    function render() {
        ctx.fillStyle = "#060814";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(0,229,255,0.08)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const gx = (GAME_WIDTH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, GAME_HEIGHT);
            ctx.stroke();
        }

        platforms.forEach(drawPlatform);
        if (state !== "ready") drawBall();
        else drawBall();
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

        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        handlePlayerInput(dt);
        updateWorld(dt, dt * 1000);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudTime = document.getElementById("hud-time");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let state = "ready";
    let controlHeights = new Map();
    let gems = [];
    let nextGemControlIndex = 0;
    let bird, timeLeft, scoreDistance, gemBonus, diving;

    function controlIndexOf(worldX) {
        return Math.floor(worldX / CONTROL_SPACING);
    }

    function getControlHeight(idx) {
        if (controlHeights.has(idx)) return controlHeights.get(idx);
        const prev = idx > 0 ? getControlHeight(idx - 1) : HEIGHT_MIN + Math.random() * 40;
        let h = prev + randomBetween(-MAX_DELTA, MAX_DELTA);
        h = Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, h));
        controlHeights.set(idx, h);
        return h;
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function terrainHeight(worldX) {
        const idx = controlIndexOf(worldX);
        const h0 = getControlHeight(idx);
        const h1 = getControlHeight(idx + 1);
        const t = (worldX - idx * CONTROL_SPACING) / CONTROL_SPACING;
        const ft = (1 - Math.cos(t * Math.PI)) / 2;
        return h0 * (1 - ft) + h1 * ft;
    }

    function terrainSlope(worldX) {
        const d = 3;
        return (terrainHeight(worldX + d) - terrainHeight(worldX - d)) / (2 * d);
    }

    function spawnGemsAhead() {
        const cameraWorldX = bird.worldX - BIRD_SCREEN_X;
        while (nextGemControlIndex * CONTROL_SPACING < cameraWorldX + GAME_WIDTH + 300) {
            const idx = nextGemControlIndex;
            nextGemControlIndex += 1;
            if (idx < 2) continue;
            if (Math.random() < GEM_CHANCE) {
                const gemWorldX = idx * CONTROL_SPACING + randomBetween(30, CONTROL_SPACING - 30);
                gems.push({ worldX: gemWorldX, heightOffset: randomBetween(50, 110), collected: false });
            }
        }
    }

    function resetGame() {
        controlHeights = new Map();
        gems = [];
        nextGemControlIndex = 0;
        bird = { worldX: 40, heightAboveGround: 90, vy: 0, speed: BASE_SPEED, angle: 0 };
        timeLeft = DAY_LENGTH;
        scoreDistance = 0;
        gemBonus = 0;
        diving = false;
        spawnGemsAhead();
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        updateHud();
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function setDiving(value) {
        diving = value;
    }

    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            e.preventDefault();
            if (state !== "playing") {
                startGame();
                return;
            }
            setDiving(true);
        } else if (e.key === "Enter" && state !== "playing") {
            startGame();
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.key === " " || e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            setDiving(false);
        }
    });

    canvas.addEventListener("pointerdown", () => {
        if (state !== "playing") {
            startGame();
            return;
        }
        setDiving(true);
    });
    window.addEventListener("pointerup", () => setDiving(false));
    window.addEventListener("pointercancel", () => setDiving(false));

    overlayBtn.addEventListener("click", startGame);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        const press = (e) => {
            e.preventDefault();
            btn.classList.add("is-pressed");
            if (state !== "playing") {
                startGame();
                return;
            }
            setDiving(true);
        };
        const release = (e) => {
            e.preventDefault();
            btn.classList.remove("is-pressed");
            setDiving(false);
        };
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    });

    function endDay() {
        if (state !== "playing") return;
        state = "gameover";
        const score = scoreDistance + gemBonus;
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Hết ngày!", `Bạn đã bay được ${scoreDistance}m và nhặt ${gemBonus / GEM_SCORE} viên ngọc. Điểm: ${score}.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function updateHud() {
        hudScore.textContent = scoreDistance + gemBonus;
        hudBest.textContent = best;
        hudTime.textContent = Math.max(0, Math.ceil(timeLeft));
    }

    function updateWorld(dt) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
            endDay();
            return;
        }

        bird.worldX += bird.speed * dt;
        bird.vy -= (diving ? GRAVITY * DIVE_GRAVITY_MULT : GRAVITY) * dt;
        bird.heightAboveGround += bird.vy * dt;

        if (bird.heightAboveGround <= 0) {
            const slope = Math.max(-1.2, Math.min(1.2, terrainSlope(bird.worldX)));
            const impact = Math.max(0, -bird.vy);
            if (slope < 0) {
                bird.speed = Math.min(MAX_SPEED, bird.speed + impact * -slope * BOOST_FACTOR);
            } else if (slope > 0) {
                bird.speed = Math.max(MIN_SPEED, bird.speed - impact * slope * DRAG_FACTOR);
            }
            bird.heightAboveGround = 0;
            bird.vy = Math.max(MIN_BOUNCE, bird.speed * HOP_RATIO);
            bird.angle = Math.max(-0.5, Math.min(0.5, -slope * 0.6));
        } else {
            bird.angle = Math.max(-0.6, Math.min(0.9, -bird.vy / 700));
        }

        scoreDistance = Math.floor(bird.worldX / 10);

        const birdAbsHeight = terrainHeight(bird.worldX) + bird.heightAboveGround;
        gems.forEach((g) => {
            if (g.collected) return;
            if (Math.abs(bird.worldX - g.worldX) > GEM_RADIUS_X) return;
            const gemAbsHeight = terrainHeight(g.worldX) + g.heightOffset;
            if (Math.abs(birdAbsHeight - gemAbsHeight) < GEM_RADIUS_Y) {
                g.collected = true;
                gemBonus += GEM_SCORE;
            }
        });

        spawnGemsAhead();
        const cameraWorldX = bird.worldX - BIRD_SCREEN_X;
        gems = gems.filter((g) => g.worldX - cameraWorldX > -60);
    }

    function screenX(worldX) {
        return worldX - bird.worldX + BIRD_SCREEN_X;
    }

    function screenY(absHeight) {
        return GROUND_BASELINE_Y - absHeight;
    }

    function drawTerrain() {
        const cameraWorldX = bird.worldX - BIRD_SCREEN_X;
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT);
        const step = 8;
        for (let sx = -step; sx <= GAME_WIDTH + step; sx += step) {
            const worldX = cameraWorldX + sx;
            const y = screenY(terrainHeight(worldX));
            ctx.lineTo(sx, y);
        }
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, GROUND_BASELINE_Y - HEIGHT_MAX, 0, GAME_HEIGHT);
        grad.addColorStop(0, "#3fae4a");
        grad.addColorStop(1, "#245c2c");
        ctx.fillStyle = grad;
        ctx.fill();
    }

    function drawGems() {
        gems.forEach((g) => {
            if (g.collected) return;
            const sx = screenX(g.worldX);
            if (sx < -30 || sx > GAME_WIDTH + 30) return;
            const sy = screenY(terrainHeight(g.worldX) + g.heightOffset);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = "#4dc3ff";
            ctx.fillRect(-9, -9, 18, 18);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 2;
            ctx.strokeRect(-9, -9, 18, 18);
            ctx.restore();
        });
    }

    function drawBird() {
        const sx = BIRD_SCREEN_X;
        const sy = screenY(terrainHeight(bird.worldX) + bird.heightAboveGround);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(bird.angle);
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffcf4d";
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.lineTo(-BIRD_SIZE / 2 - 10, diving ? 4 : -10);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1330";
        ctx.beginPath();
        ctx.arc(7.5, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.moveTo(BIRD_SIZE / 2 - 2, -2);
        ctx.lineTo(BIRD_SIZE / 2 + 8, 1);
        ctx.lineTo(BIRD_SIZE / 2 - 2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawSky() {
        const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        const dayT = state === "playing" ? Math.max(0, timeLeft / DAY_LENGTH) : 1;
        grad.addColorStop(0, `rgba(255,${140 + dayT * 60},${90 + dayT * 90},1)`);
        grad.addColorStop(1, "#12102a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    function render() {
        drawSky();
        drawTerrain();
        drawGems();
        drawBird();
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

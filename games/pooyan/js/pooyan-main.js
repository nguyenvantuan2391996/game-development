(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudLives = document.getElementById("hud-lives");
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
    let playerY = GAME_HEIGHT / 2;
    let lives = PLAYER_LIVES;
    let score = 0;
    let arrows = [];
    let balloons = [];
    let rocks = [];
    let fireCooldown = 0;
    let balloonSpawnTimer = 0;
    let rockSpawnTimer = 0;
    let invulnerable = false;
    let lastTime = 0;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function difficultyStep() {
        return Math.min(DIFFICULTY_MAX_STEPS, Math.floor(score / DIFFICULTY_SCORE_STEP));
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    overlayBtn.addEventListener("click", startGame);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        const dir = btn.dataset.dir;
        const press = (e) => {
            e.preventDefault();
            keys[dir] = true;
            btn.classList.add("is-pressed");
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

    const shootBtn = document.getElementById("shoot-btn");
    shootBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        keys[" "] = true;
        shootBtn.classList.add("is-pressed");
        if (state === "ready" || state === "gameover") startGame();
    });
    const releaseShoot = (e) => {
        e.preventDefault();
        keys[" "] = false;
        shootBtn.classList.remove("is-pressed");
    };
    shootBtn.addEventListener("pointerup", releaseShoot);
    shootBtn.addEventListener("pointercancel", releaseShoot);
    shootBtn.addEventListener("pointerleave", releaseShoot);

    function startGame() {
        state = "playing";
        playerY = GAME_HEIGHT / 2;
        lives = PLAYER_LIVES;
        score = 0;
        arrows = [];
        balloons = [];
        rocks = [];
        fireCooldown = 0;
        balloonSpawnTimer = 400;
        rockSpawnTimer = 900;
        invulnerable = false;
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnBalloon() {
        const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
        balloons.push({
            baseY: randomBetween(BALLOON_SIZE, GAME_HEIGHT - BALLOON_SIZE),
            x: GAME_WIDTH + BALLOON_SIZE,
            speed: randomBetween(BALLOON_SPEED_MIN, BALLOON_SPEED_MAX) + bonus,
            bobFreq: randomBetween(BALLOON_BOB_FREQ_MIN, BALLOON_BOB_FREQ_MAX),
            bobPhase: Math.random() * Math.PI * 2,
            elapsed: 0,
            alive: true,
        });
    }

    function spawnRock() {
        const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
        rocks.push({
            x: randomBetween(PLAYER_X + 60, GAME_WIDTH - ROCK_SIZE),
            y: -ROCK_SIZE,
            speed: randomBetween(ROCK_SPEED_MIN, ROCK_SPEED_MAX) + bonus,
            alive: true,
        });
    }

    function handlePlayerInput(dt) {
        if (keys.ArrowUp || keys.w || keys.W) playerY -= PLAYER_SPEED * dt;
        if (keys.ArrowDown || keys.s || keys.S) playerY += PLAYER_SPEED * dt;
        playerY = Math.max(PLAYER_SIZE / 2, Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, playerY));

        if (keys[" "] && fireCooldown <= 0) {
            arrows.push({ x: PLAYER_X + PLAYER_SIZE / 2, y: playerY, alive: true });
            fireCooldown = ARROW_COOLDOWN_MS;
        }
    }

    function loseLife() {
        if (invulnerable) return;
        lives -= 1;
        if (lives <= 0) {
            triggerGameOver("You ran out of lives!");
        } else {
            invulnerable = true;
            setTimeout(() => {
                invulnerable = false;
            }, 1000);
        }
    }

    function updateWorld(dt, dtMs) {
        fireCooldown -= dtMs;

        balloonSpawnTimer -= dtMs;
        if (balloonSpawnTimer <= 0) {
            spawnBalloon();
            balloonSpawnTimer = randomBetween(BALLOON_SPAWN_MIN_MS, BALLOON_SPAWN_MAX_MS);
        }

        rockSpawnTimer -= dtMs;
        if (rockSpawnTimer <= 0) {
            spawnRock();
            rockSpawnTimer = randomBetween(ROCK_SPAWN_MIN_MS, ROCK_SPAWN_MAX_MS);
        }

        arrows.forEach((a) => {
            a.x += ARROW_SPEED * dt;
        });
        arrows = arrows.filter((a) => a.alive && a.x < GAME_WIDTH + ARROW_WIDTH);

        balloons.forEach((b) => {
            b.elapsed += dt;
            b.x -= b.speed * dt;
        });

        rocks.forEach((r) => {
            r.y += r.speed * dt;
        });

        const playerLeft = PLAYER_X - PLAYER_SIZE / 2;
        const playerTop = playerY - PLAYER_SIZE / 2;

        balloons.forEach((b) => {
            if (!b.alive) return;
            const by = b.baseY + Math.sin(b.elapsed * b.bobFreq + b.bobPhase) * BALLOON_BOB_AMPLITUDE;
            b.currentY = by;

            arrows.forEach((a) => {
                if (!a.alive) return;
                if (rectsOverlap(a.x - ARROW_WIDTH / 2, a.y - ARROW_HEIGHT / 2, ARROW_WIDTH, ARROW_HEIGHT, b.x - BALLOON_SIZE / 2, by - BALLOON_SIZE / 2, BALLOON_SIZE, BALLOON_SIZE)) {
                    a.alive = false;
                    b.alive = false;
                    score += BALLOON_SCORE;
                }
            });

            if (b.alive && rectsOverlap(playerLeft, playerTop, PLAYER_SIZE, PLAYER_SIZE, b.x - BALLOON_SIZE / 2, by - BALLOON_SIZE / 2, BALLOON_SIZE, BALLOON_SIZE)) {
                b.alive = false;
                loseLife();
            }
        });
        balloons = balloons.filter((b) => b.alive && b.x > -BALLOON_SIZE);

        rocks.forEach((r) => {
            if (!r.alive) return;

            arrows.forEach((a) => {
                if (!a.alive) return;
                if (rectsOverlap(a.x - ARROW_WIDTH / 2, a.y - ARROW_HEIGHT / 2, ARROW_WIDTH, ARROW_HEIGHT, r.x - ROCK_SIZE / 2, r.y - ROCK_SIZE / 2, ROCK_SIZE, ROCK_SIZE)) {
                    a.alive = false;
                    r.alive = false;
                    score += ROCK_SCORE;
                }
            });

            if (r.alive && rectsOverlap(playerLeft, playerTop, PLAYER_SIZE, PLAYER_SIZE, r.x - ROCK_SIZE / 2, r.y - ROCK_SIZE / 2, ROCK_SIZE, ROCK_SIZE)) {
                r.alive = false;
                loseLife();
            }
        });
        rocks = rocks.filter((r) => r.alive && r.y < GAME_HEIGHT + ROCK_SIZE);

        arrows = arrows.filter((a) => a.alive);
    }

    function triggerGameOver(reason) {
        if (state === "gameover") return;
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `${reason} Score: ${score}. Tap to play again.`, "Play again");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function drawPlayer() {
        if (invulnerable && Math.floor(performance.now() / 100) % 2 === 0) return;
        ctx.save();
        ctx.translate(PLAYER_X, playerY);
        ctx.fillStyle = "#ffcf4d";
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 2 - 4, -4);
        ctx.lineTo(PLAYER_SIZE / 2 + 8, 0);
        ctx.lineTo(PLAYER_SIZE / 2 - 4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#0b0a1f";
        ctx.beginPath();
        ctx.arc(-4, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function render() {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(124,92,255,0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(PLAYER_X, 0);
        ctx.lineTo(PLAYER_X, GAME_HEIGHT);
        ctx.stroke();

        rocks.forEach((r) => {
            ctx.fillStyle = "#8a8a9a";
            ctx.beginPath();
            ctx.arc(r.x, r.y, ROCK_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.beginPath();
            ctx.arc(r.x - 3, r.y - 3, ROCK_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
        });

        balloons.forEach((b) => {
            const by = b.currentY != null ? b.currentY : b.baseY;
            ctx.fillStyle = "#ff3d9a";
            ctx.beginPath();
            ctx.ellipse(b.x, by, BALLOON_SIZE / 2, BALLOON_SIZE / 2 + 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x, by + BALLOON_SIZE / 2 + 4);
            ctx.lineTo(b.x, by + BALLOON_SIZE / 2 + 14);
            ctx.stroke();
            ctx.fillStyle = "#7c5cff";
            ctx.beginPath();
            ctx.arc(b.x, by + BALLOON_SIZE / 2 + 18, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        arrows.forEach((a) => {
            ctx.fillStyle = "#4ce6d0";
            ctx.fillRect(a.x - ARROW_WIDTH / 2, a.y - ARROW_HEIGHT / 2, ARROW_WIDTH, ARROW_HEIGHT);
            ctx.beginPath();
            ctx.moveTo(a.x + ARROW_WIDTH / 2, a.y - 4);
            ctx.lineTo(a.x + ARROW_WIDTH / 2 + 5, a.y);
            ctx.lineTo(a.x + ARROW_WIDTH / 2, a.y + 4);
            ctx.closePath();
            ctx.fill();
        });

        if (state !== "ready") drawPlayer();
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
        hudLives.textContent = lives;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.05);
        const dtMs = dt * 1000;
        lastTime = now;

        handlePlayerInput(dt);
        updateWorld(dt, dtMs);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

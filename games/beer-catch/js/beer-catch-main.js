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
        if (e.key.startsWith("Arrow")) e.preventDefault();
        keys[e.key] = true;
        if ((state === "ready" || state === "gameover") && (e.key === " " || e.key === "Enter")) {
            startGame();
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    let state = "ready";
    let playerX = GAME_WIDTH / 2;
    let lives = PLAYER_LIVES;
    let score = 0;
    let goodItems = [];
    let badItems = [];
    let goodSpawnTimer = 0;
    let badSpawnTimer = 0;
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

    function startGame() {
        state = "playing";
        playerX = GAME_WIDTH / 2;
        lives = PLAYER_LIVES;
        score = 0;
        goodItems = [];
        badItems = [];
        goodSpawnTimer = 300;
        badSpawnTimer = 900;
        invulnerable = false;
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnGood() {
        const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
        goodItems.push({
            x: randomBetween(BEER_SIZE, GAME_WIDTH - BEER_SIZE),
            y: -BEER_SIZE,
            speed: randomBetween(BEER_SPEED_MIN, BEER_SPEED_MAX) + bonus,
            golden: Math.random() < GOLDEN_BEER_CHANCE,
            alive: true,
        });
    }

    function spawnBad() {
        const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
        badItems.push({
            x: randomBetween(BAD_SIZE, GAME_WIDTH - BAD_SIZE),
            y: -BAD_SIZE,
            speed: randomBetween(BAD_SPEED_MIN, BAD_SPEED_MAX) + bonus,
            alive: true,
        });
    }

    function handlePlayerInput(dt) {
        if (keys.ArrowLeft || keys.a || keys.A) playerX -= PLAYER_SPEED * dt;
        if (keys.ArrowRight || keys.d || keys.D) playerX += PLAYER_SPEED * dt;
        playerX = Math.max(PLAYER_WIDTH / 2, Math.min(GAME_WIDTH - PLAYER_WIDTH / 2, playerX));
    }

    function loseLife() {
        if (invulnerable) return;
        lives -= 1;
        if (lives <= 0) {
            triggerGameOver("You're out of lives!");
        } else {
            invulnerable = true;
            setTimeout(() => {
                invulnerable = false;
            }, 1000);
        }
    }

    function updateWorld(dt, dtMs) {
        const spawnBonusMs = difficultyStep() * DIFFICULTY_SPAWN_BONUS_MS;

        goodSpawnTimer -= dtMs;
        if (goodSpawnTimer <= 0) {
            spawnGood();
            goodSpawnTimer = Math.max(180, randomBetween(BEER_SPAWN_MIN_MS, BEER_SPAWN_MAX_MS) - spawnBonusMs);
        }

        badSpawnTimer -= dtMs;
        if (badSpawnTimer <= 0) {
            spawnBad();
            badSpawnTimer = Math.max(300, randomBetween(BAD_SPAWN_MIN_MS, BAD_SPAWN_MAX_MS) - spawnBonusMs);
        }

        goodItems.forEach((item) => {
            item.y += item.speed * dt;
        });
        badItems.forEach((item) => {
            item.y += item.speed * dt;
        });

        const playerLeft = playerX - PLAYER_WIDTH / 2;
        const playerTop = PLAYER_Y - PLAYER_HEIGHT / 2;

        goodItems.forEach((item) => {
            if (!item.alive) return;
            if (
                rectsOverlap(
                    playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
                    item.x - BEER_SIZE / 2, item.y - BEER_SIZE / 2, BEER_SIZE, BEER_SIZE
                )
            ) {
                item.alive = false;
                score += item.golden ? GOLDEN_BEER_SCORE : BEER_SCORE;
            }
        });
        goodItems = goodItems.filter((item) => item.alive && item.y < GAME_HEIGHT + BEER_SIZE);

        badItems.forEach((item) => {
            if (!item.alive) return;
            if (
                rectsOverlap(
                    playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
                    item.x - BAD_SIZE / 2, item.y - BAD_SIZE / 2, BAD_SIZE, BAD_SIZE
                )
            ) {
                item.alive = false;
                loseLife();
            }
        });
        badItems = badItems.filter((item) => item.alive && item.y < GAME_HEIGHT + BAD_SIZE);
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
        ctx.translate(playerX, PLAYER_Y);

        ctx.fillStyle = "#ffcf4d";
        ctx.fillRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2, PLAYER_WIDTH - 14, PLAYER_HEIGHT);

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2 - 5, PLAYER_WIDTH - 14, 6);

        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(-PLAYER_WIDTH / 2 + 6, -PLAYER_HEIGHT / 2 + 2, 6, PLAYER_HEIGHT - 4);

        ctx.strokeStyle = "#ffcf4d";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(PLAYER_WIDTH / 2 - 20, 0, 10, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.restore();
    }

    function render() {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        badItems.forEach((item) => {
            ctx.fillStyle = "#8a8a9a";
            ctx.beginPath();
            ctx.arc(item.x, item.y, BAD_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(230,57,70,0.9)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(item.x - 8, item.y - 8);
            ctx.lineTo(item.x + 8, item.y + 8);
            ctx.moveTo(item.x + 8, item.y - 8);
            ctx.lineTo(item.x - 8, item.y + 8);
            ctx.stroke();
        });

        goodItems.forEach((item) => {
            ctx.fillStyle = item.golden ? "#ffd54d" : "#ff8a3d";
            ctx.beginPath();
            ctx.arc(item.x, item.y, BEER_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            if (item.golden) {
                ctx.strokeStyle = "rgba(255,255,255,0.8)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(item.x, item.y, BEER_SIZE / 2 + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.beginPath();
            ctx.arc(item.x, item.y - BEER_SIZE / 2 + 4, BEER_SIZE / 4, 0, Math.PI * 2);
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

(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudLives = document.getElementById("hud-lives");
    const hudWeapon = document.getElementById("hud-weapon");
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
    let player = { x: 56, y: GAME_HEIGHT / 2 };
    let lives = PLAYER_LIVES;
    let score = 0;
    let weaponLevel = 1;
    let bullets = [];
    let enemyBullets = [];
    let enemies = [];
    let powerups = [];
    let stars = [];
    let fireCooldown = 0;
    let enemySpawnTimer = 0;
    let invulnerable = false;
    let lastTime = 0;
    const playerMaxX = GAME_WIDTH * PLAYER_MAX_X_RATIO;

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

    const fireBtn = document.getElementById("fire-btn");
    fireBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        keys[" "] = true;
        fireBtn.classList.add("is-pressed");
        if (state === "ready" || state === "gameover") startGame();
    });
    const releaseFire = (e) => {
        e.preventDefault();
        keys[" "] = false;
        fireBtn.classList.remove("is-pressed");
    };
    fireBtn.addEventListener("pointerup", releaseFire);
    fireBtn.addEventListener("pointercancel", releaseFire);
    fireBtn.addEventListener("pointerleave", releaseFire);

    function initStars() {
        stars = [];
        for (let i = 0; i < 40; i++) {
            stars.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * GAME_HEIGHT,
                speed: randomBetween(20, 80),
                size: Math.random() < 0.2 ? 2 : 1,
            });
        }
    }

    function startGame() {
        state = "playing";
        player = { x: 56, y: GAME_HEIGHT / 2 };
        lives = PLAYER_LIVES;
        score = 0;
        weaponLevel = 1;
        bullets = [];
        enemyBullets = [];
        enemies = [];
        powerups = [];
        fireCooldown = 0;
        enemySpawnTimer = 500;
        invulnerable = false;
        initStars();
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function pickEnemyType() {
        const roll = Math.random();
        if (roll < 0.55) return "drone";
        if (roll < 0.8) return "asteroid";
        return "cruiser";
    }

    function spawnEnemy() {
        const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
        const type = pickEnemyType();
        if (type === "drone") {
            enemies.push({
                type,
                x: GAME_WIDTH + DRONE_SIZE,
                y: randomBetween(DRONE_SIZE, GAME_HEIGHT - DRONE_SIZE),
                baseY: 0,
                speed: randomBetween(DRONE_SPEED_MIN, DRONE_SPEED_MAX) + bonus,
                hp: DRONE_HP,
                size: DRONE_SIZE,
                elapsed: Math.random() * 10,
                bobFreq: randomBetween(1.5, 3),
                alive: true,
            });
        } else if (type === "asteroid") {
            enemies.push({
                type,
                x: GAME_WIDTH + ASTEROID_SIZE,
                y: randomBetween(ASTEROID_SIZE, GAME_HEIGHT - ASTEROID_SIZE),
                speed: randomBetween(ASTEROID_SPEED_MIN, ASTEROID_SPEED_MAX) + bonus,
                vy: randomBetween(-30, 30),
                hp: ASTEROID_HP,
                size: ASTEROID_SIZE,
                spin: randomBetween(-2, 2),
                angle: 0,
                alive: true,
            });
        } else {
            enemies.push({
                type,
                x: GAME_WIDTH + CRUISER_SIZE,
                y: randomBetween(CRUISER_SIZE, GAME_HEIGHT - CRUISER_SIZE),
                speed: randomBetween(CRUISER_SPEED_MIN, CRUISER_SPEED_MAX) + bonus,
                hp: CRUISER_HP,
                size: CRUISER_SIZE,
                fireTimer: randomBetween(CRUISER_FIRE_MIN_MS, CRUISER_FIRE_MAX_MS),
                alive: true,
            });
        }
    }

    function spawnPowerup(x, y) {
        powerups.push({ x, y, alive: true });
    }

    function fireBullets() {
        const midY = player.y;
        if (weaponLevel === 1) {
            bullets.push({ x: player.x + PLAYER_SIZE / 2, y: midY, vx: BULLET_SPEED, vy: 0, alive: true });
        } else if (weaponLevel === 2) {
            bullets.push({ x: player.x + PLAYER_SIZE / 2, y: midY - 7, vx: BULLET_SPEED, vy: 0, alive: true });
            bullets.push({ x: player.x + PLAYER_SIZE / 2, y: midY + 7, vx: BULLET_SPEED, vy: 0, alive: true });
        } else {
            bullets.push({ x: player.x + PLAYER_SIZE / 2, y: midY, vx: BULLET_SPEED, vy: 0, alive: true });
            bullets.push({ x: player.x + PLAYER_SIZE / 2, y: midY - 6, vx: BULLET_SPEED, vy: -110, alive: true });
            bullets.push({ x: player.x + PLAYER_SIZE / 2, y: midY + 6, vx: BULLET_SPEED, vy: 110, alive: true });
        }
    }

    function handlePlayerInput(dt) {
        if (keys.ArrowUp || keys.w || keys.W) player.y -= PLAYER_SPEED * dt;
        if (keys.ArrowDown || keys.s || keys.S) player.y += PLAYER_SPEED * dt;
        if (keys.ArrowLeft || keys.a || keys.A) player.x -= PLAYER_SPEED * dt;
        if (keys.ArrowRight || keys.d || keys.D) player.x += PLAYER_SPEED * dt;
        player.y = Math.max(PLAYER_SIZE / 2, Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, player.y));
        player.x = Math.max(PLAYER_SIZE / 2, Math.min(playerMaxX, player.x));

        if (keys[" "] && fireCooldown <= 0) {
            fireBullets();
            fireCooldown = FIRE_COOLDOWN_BY_LEVEL[weaponLevel - 1];
        }
    }

    function loseLife() {
        if (invulnerable) return;
        lives -= 1;
        if (lives <= 0) {
            triggerGameOver("Your ship has been destroyed!");
        } else {
            invulnerable = true;
            weaponLevel = Math.max(1, weaponLevel - 1);
            setTimeout(() => {
                invulnerable = false;
            }, 1200);
        }
    }

    function updateWorld(dt, dtMs) {
        fireCooldown -= dtMs;

        stars.forEach((s) => {
            s.x -= s.speed * dt;
            if (s.x < 0) {
                s.x = GAME_WIDTH;
                s.y = Math.random() * GAME_HEIGHT;
            }
        });

        enemySpawnTimer -= dtMs;
        if (enemySpawnTimer <= 0) {
            spawnEnemy();
            const step = difficultyStep();
            const min = Math.max(220, ENEMY_SPAWN_MIN_MS - step * 40);
            const max = Math.max(400, ENEMY_SPAWN_MAX_MS - step * 60);
            enemySpawnTimer = randomBetween(min, max);
        }

        bullets.forEach((b) => {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        });
        bullets = bullets.filter((b) => b.alive && b.x < GAME_WIDTH + BULLET_WIDTH && b.y > -20 && b.y < GAME_HEIGHT + 20);

        enemyBullets.forEach((b) => {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        });
        enemyBullets = enemyBullets.filter((b) => b.alive && b.x > -20 && b.x < GAME_WIDTH + 20 && b.y > -20 && b.y < GAME_HEIGHT + 20);

        powerups.forEach((p) => {
            p.x -= POWERUP_SPEED * dt;
        });
        powerups = powerups.filter((p) => p.alive && p.x > -POWERUP_SIZE);

        enemies.forEach((e) => {
            if (e.type === "drone") {
                e.elapsed += dt;
                e.x -= e.speed * dt;
                e.baseY = Math.sin(e.elapsed * e.bobFreq) * 18;
            } else if (e.type === "asteroid") {
                e.x -= e.speed * dt;
                e.y += e.vy * dt;
                e.angle += e.spin * dt;
                if (e.y < e.size / 2 || e.y > GAME_HEIGHT - e.size / 2) e.vy *= -1;
            } else {
                e.x -= e.speed * dt;
                e.fireTimer -= dtMs;
                if (e.fireTimer <= 0 && e.x < GAME_WIDTH - 10 && e.x > 40) {
                    const dx = player.x - e.x;
                    const dy = player.y - e.y;
                    const len = Math.hypot(dx, dy) || 1;
                    enemyBullets.push({
                        x: e.x,
                        y: e.y,
                        vx: (dx / len) * ENEMY_BULLET_SPEED,
                        vy: (dy / len) * ENEMY_BULLET_SPEED,
                        alive: true,
                    });
                    e.fireTimer = randomBetween(CRUISER_FIRE_MIN_MS, CRUISER_FIRE_MAX_MS);
                }
            }
        });

        const playerLeft = player.x - PLAYER_SIZE / 2;
        const playerTop = player.y - PLAYER_SIZE / 2;

        enemies.forEach((e) => {
            if (!e.alive) return;
            const ey = e.type === "drone" ? e.y + e.baseY : e.y;
            const scoreByType = e.type === "drone" ? DRONE_SCORE : e.type === "asteroid" ? ASTEROID_SCORE : CRUISER_SCORE;

            bullets.forEach((b) => {
                if (!b.alive) return;
                if (rectsOverlap(b.x - BULLET_WIDTH / 2, b.y - BULLET_HEIGHT / 2, BULLET_WIDTH, BULLET_HEIGHT, e.x - e.size / 2, ey - e.size / 2, e.size, e.size)) {
                    b.alive = false;
                    e.hp -= 1;
                    if (e.hp <= 0) {
                        e.alive = false;
                        score += scoreByType;
                        if (Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(e.x, ey);
                    }
                }
            });

            if (e.alive && rectsOverlap(playerLeft, playerTop, PLAYER_SIZE, PLAYER_SIZE, e.x - e.size / 2, ey - e.size / 2, e.size, e.size)) {
                e.alive = false;
                loseLife();
            }
        });
        enemies = enemies.filter((e) => e.alive && e.x > -e.size - 20);

        enemyBullets.forEach((b) => {
            if (!b.alive) return;
            if (rectsOverlap(playerLeft, playerTop, PLAYER_SIZE, PLAYER_SIZE, b.x - ENEMY_BULLET_SIZE / 2, b.y - ENEMY_BULLET_SIZE / 2, ENEMY_BULLET_SIZE, ENEMY_BULLET_SIZE)) {
                b.alive = false;
                loseLife();
            }
        });

        powerups.forEach((p) => {
            if (!p.alive) return;
            if (rectsOverlap(playerLeft, playerTop, PLAYER_SIZE, PLAYER_SIZE, p.x - POWERUP_SIZE / 2, p.y - POWERUP_SIZE / 2, POWERUP_SIZE, POWERUP_SIZE)) {
                p.alive = false;
                weaponLevel = Math.min(WEAPON_MAX_LEVEL, weaponLevel + 1);
                score += 30;
            }
        });

        bullets = bullets.filter((b) => b.alive);
        enemyBullets = enemyBullets.filter((b) => b.alive);
        powerups = powerups.filter((p) => p.alive);
    }

    function triggerGameOver(reason) {
        if (state === "gameover") return;
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `${reason} Score: ${score}. Press to play again.`, "Play Again");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function drawPixelGrid(cx, cy, size, rows, colorFn) {
        const cols = rows[0].length;
        const cell = size / cols;
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < cols; c++) {
                const ch = rows[r][c];
                if (ch === ".") continue;
                ctx.fillStyle = colorFn(ch);
                const px = cx - size / 2 + c * cell;
                const py = cy - (rows.length * cell) / 2 + r * cell;
                ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(cell) + 0.5, Math.ceil(cell) + 0.5);
            }
        }
    }

    const PLAYER_SPRITE = [
        "......1..",
        ".....111.",
        "..2..1111",
        "111111111",
        "..2..1111",
        ".....111.",
        "......1..",
    ];
    const playerColors = (ch) => (ch === "2" ? "#ff9d3d" : "#39ff88");

    const DRONE_SPRITE = ["..1..", ".111.", "11111", ".111.", "..1.."];
    const droneColors = () => "#ff3d7a";

    const CRUISER_SPRITE = [
        "...1...",
        "..111..",
        ".22111.",
        "1111111",
        ".22111.",
        "..111..",
        "...1...",
    ];
    const cruiserColors = (ch) => (ch === "2" ? "#8a6bff" : "#4dc9ff");

    function drawAsteroid(e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.fillStyle = "#9a8a6b";
        ctx.beginPath();
        ctx.moveTo(-e.size / 2, 0);
        ctx.lineTo(-e.size / 4, -e.size / 2);
        ctx.lineTo(e.size / 4, -e.size / 2.2);
        ctx.lineTo(e.size / 2, 0);
        ctx.lineTo(e.size / 4, e.size / 2.2);
        ctx.lineTo(-e.size / 4, e.size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.arc(-e.size / 8, -e.size / 8, e.size / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawStars() {
        ctx.fillStyle = "rgba(77,201,255,0.55)";
        stars.forEach((s) => {
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
    }

    function drawPlayer() {
        if (invulnerable && Math.floor(performance.now() / 100) % 2 === 0) return;
        drawPixelGrid(player.x, player.y, PLAYER_SIZE, PLAYER_SPRITE, playerColors);
    }

    function drawPowerups() {
        powerups.forEach((p) => {
            const pulse = 1 + Math.sin(performance.now() / 120) * 0.15;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(performance.now() / 400);
            ctx.fillStyle = "#ffd93d";
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const r1 = (POWERUP_SIZE / 2) * pulse;
                const r2 = r1 / 2.4;
                ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
                ctx.lineTo(Math.cos(angle + Math.PI / 5) * r2, Math.sin(angle + Math.PI / 5) * r2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    function render() {
        ctx.fillStyle = "#04140f";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        drawStars();

        enemies.forEach((e) => {
            if (e.type === "drone") {
                drawPixelGrid(e.x, e.y + e.baseY, DRONE_SIZE, DRONE_SPRITE, droneColors);
            } else if (e.type === "asteroid") {
                drawAsteroid(e);
            } else {
                drawPixelGrid(e.x, e.y, CRUISER_SIZE, CRUISER_SPRITE, cruiserColors);
            }
        });

        drawPowerups();

        bullets.forEach((b) => {
            ctx.fillStyle = "#ffe14d";
            ctx.fillRect(b.x - BULLET_WIDTH / 2, b.y - BULLET_HEIGHT / 2, BULLET_WIDTH, BULLET_HEIGHT);
        });

        enemyBullets.forEach((b) => {
            ctx.fillStyle = "#ff5252";
            ctx.beginPath();
            ctx.arc(b.x, b.y, ENEMY_BULLET_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        });

        if (state !== "ready") drawPlayer();
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
        hudLives.textContent = lives;
        hudWeapon.textContent = weaponLevel;
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

    initStars();
    render();
})();

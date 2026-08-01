(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = MAP_PIXEL;
    canvas.height = MAP_PIXEL;

    const hudLives = document.getElementById("hud-lives");
    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudWave = document.getElementById("hud-wave");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let map = null;
    let player = null;
    let enemies = [];
    let boss = null;
    let bullets = [];
    let score = 0;
    let wave = 1;
    let enemiesToSpawnInWave = 0;
    let bossSpawned = false;
    let state = "ready";
    let spawnTimer = 0;
    let lastTime = 0;

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

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function tileToPixelCenter(col, row, size) {
        return {
            x: col * TILE + TILE / 2 - size / 2,
            y: row * TILE + TILE / 2 - size / 2,
        };
    }

    function allTanks() {
        const list = [player, ...enemies];
        if (boss) list.push(boss);
        return list.filter((t) => t && t.alive);
    }

    function overlapsAnyTank(x, y, w, h, self, others) {
        for (const other of others) {
            if (other === self || !other.alive) continue;
            if (rectsOverlap(x, y, w, h, other.x, other.y, other.size, other.size)) return true;
        }
        return false;
    }

    function moveTank(tank, dx, dy, others) {
        if (dx !== 0) {
            const newX = clamp(tank.x + dx, 0, MAP_PIXEL - tank.size);
            if (!map.rectOverlapsSolidForTank(newX, tank.y, tank.size, tank.size) &&
                !overlapsAnyTank(newX, tank.y, tank.size, tank.size, tank, others)) {
                tank.x = newX;
            }
        }
        if (dy !== 0) {
            const newY = clamp(tank.y + dy, 0, MAP_PIXEL - tank.size);
            if (!map.rectOverlapsSolidForTank(tank.x, newY, tank.size, tank.size) &&
                !overlapsAnyTank(tank.x, newY, tank.size, tank.size, tank, others)) {
                tank.y = newY;
            }
        }
    }

    function fireBullet(tank) {
        const pos = tank.muzzlePosition();
        const speed = tank.type === "player" ? BULLET_SPEED_PLAYER : BULLET_SPEED_ENEMY;
        bullets.push(new Bullet(pos.x, pos.y, tank.dir, speed, tank.type === "player" ? "player" : "enemy"));
    }

    // ---------- Setup ----------
    function startGame() {
        map = new TileMap(MAP_LAYOUT);
        bullets = [];
        enemies = [];
        boss = null;
        bossSpawned = false;
        score = 0;
        wave = 1;
        state = "playing";
        overlay.hidden = true;
        spawnWave();
        spawnPlayer();
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnPlayer() {
        const pos = tileToPixelCenter(PLAYER_SPAWN.col, PLAYER_SPAWN.row, PLAYER_SIZE);
        player = new Tank({
            x: pos.x,
            y: pos.y,
            size: PLAYER_SIZE,
            speed: PLAYER_SPEED,
            dir: DIR.UP,
            type: "player",
            hp: 1,
        });
        player.lives = PLAYER_LIVES;
    }

    function spawnWave() {
        enemiesToSpawnInWave = ENEMIES_PER_WAVE_BASE + (wave - 1) * 2;
        bossSpawned = false;
        spawnTimer = 0;
    }

    function trySpawnEnemy() {
        if (enemies.length >= MAX_ENEMIES_ON_FIELD) return;
        if (enemiesToSpawnInWave <= 0) return;
        const sp = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
        const pos = tileToPixelCenter(sp.col, sp.row, ENEMY_SIZE);
        if (map.rectOverlapsSolidForTank(pos.x, pos.y, ENEMY_SIZE, ENEMY_SIZE)) return;
        if (overlapsAnyTank(pos.x, pos.y, ENEMY_SIZE, ENEMY_SIZE, null, allTanks())) return;

        const enemy = new Tank({
            x: pos.x,
            y: pos.y,
            size: ENEMY_SIZE,
            speed: ENEMY_SPEED,
            dir: DIR.DOWN,
            type: "enemy",
            hp: 1,
        });
        enemy.aiTimer = randomBetween(400, 1200);
        enemy.fireTimer = randomBetween(ENEMY_FIRE_MIN, ENEMY_FIRE_MAX);
        enemies.push(enemy);
        enemiesToSpawnInWave -= 1;
    }

    function trySpawnBoss() {
        if (bossSpawned || enemiesToSpawnInWave > 0 || enemies.length > 0) return;
        const sp = SPAWN_POINTS[1];
        const pos = tileToPixelCenter(sp.col, sp.row, BOSS_SIZE);
        boss = new Tank({
            x: pos.x,
            y: pos.y,
            size: BOSS_SIZE,
            speed: BOSS_SPEED,
            dir: DIR.DOWN,
            type: "boss",
            hp: BOSS_HP_BASE + (wave - 1) * 4,
        });
        boss.aiTimer = randomBetween(400, 1000);
        boss.fireTimer = BOSS_FIRE_INTERVAL;
        bossSpawned = true;
        showBossBanner();
    }

    function showBossBanner() {
        const banner = document.getElementById("boss-banner");
        banner.hidden = false;
        setTimeout(() => {
            banner.hidden = true;
        }, 1800);
    }

    // ---------- Input & AI ----------
    function handlePlayerInput(dt) {
        let dir = null;
        if (keys.ArrowUp || keys.w || keys.W) dir = DIR.UP;
        else if (keys.ArrowDown || keys.s || keys.S) dir = DIR.DOWN;
        else if (keys.ArrowLeft || keys.a || keys.A) dir = DIR.LEFT;
        else if (keys.ArrowRight || keys.d || keys.D) dir = DIR.RIGHT;

        if (dir) {
            player.dir = dir;
            const others = allTanks().filter((t) => t !== player);
            moveTank(player, dir.x * player.speed * dt, dir.y * player.speed * dt, others);
        }

        if (keys[" "] && player.canFire()) {
            fireBullet(player);
            player.resetFireCooldown(PLAYER_FIRE_COOLDOWN);
        }
    }

    function updateEnemyAI(enemy, dt, dtMs) {
        enemy.aiTimer -= dtMs;
        if (enemy.aiTimer <= 0 || enemy.blocked) {
            const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            enemy.dir = dirs[Math.floor(Math.random() * dirs.length)];
            enemy.aiTimer = randomBetween(600, 1600);
            enemy.blocked = false;
        }

        const before = { x: enemy.x, y: enemy.y };
        const others = allTanks().filter((t) => t !== enemy);
        moveTank(enemy, enemy.dir.x * enemy.speed * dt, enemy.dir.y * enemy.speed * dt, others);
        if (enemy.x === before.x && enemy.y === before.y) enemy.blocked = true;

        enemy.fireTimer -= dtMs;
        if (enemy.fireTimer <= 0) {
            fireBullet(enemy);
            enemy.fireTimer = randomBetween(ENEMY_FIRE_MIN, ENEMY_FIRE_MAX);
        }
    }

    function updateBossAI(dt, dtMs) {
        if (!boss) return;
        boss.aiTimer -= dtMs;
        if (boss.aiTimer <= 0 || boss.blocked) {
            const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            boss.dir = dirs[Math.floor(Math.random() * dirs.length)];
            boss.aiTimer = randomBetween(800, 1800);
            boss.blocked = false;
        }

        const before = { x: boss.x, y: boss.y };
        const others = allTanks().filter((t) => t !== boss);
        moveTank(boss, boss.dir.x * boss.speed * dt, boss.dir.y * boss.speed * dt, others);
        if (boss.x === before.x && boss.y === before.y) boss.blocked = true;

        boss.fireTimer -= dtMs;
        if (boss.fireTimer <= 0) {
            const spread = boss.dir.x !== 0
                ? [{ x: boss.dir.x, y: -0.35 }, { x: boss.dir.x, y: 0.35 }]
                : [{ x: -0.35, y: boss.dir.y }, { x: 0.35, y: boss.dir.y }];
            spread.forEach((d) => {
                const len = Math.hypot(d.x, d.y);
                bullets.push(new Bullet(boss.centerX, boss.centerY, { x: d.x / len, y: d.y / len }, BULLET_SPEED_ENEMY, "enemy"));
            });
            boss.fireTimer = BOSS_FIRE_INTERVAL;
        }
    }

    // ---------- Bullets & combat ----------
    function updateBullets(dt) {
        bullets.forEach((b) => b.update(dt));

        bullets.forEach((b) => {
            if (!b.alive) return;
            if (b.x < 0 || b.x > MAP_PIXEL || b.y < 0 || b.y > MAP_PIXEL) {
                b.alive = false;
                return;
            }
            const col = Math.floor(b.x / TILE);
            const row = Math.floor(b.y / TILE);
            if (map.isSolidForBullet(col, row)) {
                const result = map.damageTile(col, row);
                b.alive = false;
                if (result === "base") triggerGameOver("Base destroyed!");
            }
        });

        bullets.forEach((b) => {
            if (!b.alive) return;
            const bx = b.x - b.size / 2;
            const by = b.y - b.size / 2;
            if (b.owner === "player") {
                enemies.forEach((e) => {
                    if (e.alive && rectsOverlap(bx, by, b.size, b.size, e.x, e.y, e.size, e.size)) {
                        b.alive = false;
                        killEnemy(e);
                    }
                });
                if (boss && boss.alive && rectsOverlap(bx, by, b.size, b.size, boss.x, boss.y, boss.size, boss.size)) {
                    b.alive = false;
                    boss.hp -= 1;
                    if (boss.hp <= 0) killBoss();
                }
            } else if (player.alive && !player.invulnerable &&
                rectsOverlap(bx, by, b.size, b.size, player.x, player.y, player.size, player.size)) {
                b.alive = false;
                hitPlayer();
            }
        });

        bullets = bullets.filter((b) => b.alive);
    }

    function killEnemy(enemy) {
        enemy.alive = false;
        enemies = enemies.filter((e) => e !== enemy);
        score += 100;
    }

    function killBoss() {
        boss.alive = false;
        score += 1000;
        boss = null;
        wave += 1;
        spawnWave();
    }

    function hitPlayer() {
        player.lives -= 1;
        if (player.lives <= 0) {
            triggerGameOver("You're out of lives!");
        } else {
            respawnPlayer();
        }
    }

    function respawnPlayer() {
        const pos = tileToPixelCenter(PLAYER_SPAWN.col, PLAYER_SPAWN.row, PLAYER_SIZE);
        player.x = pos.x;
        player.y = pos.y;
        player.dir = DIR.UP;
        player.invulnerable = true;
        setTimeout(() => {
            if (player) player.invulnerable = false;
        }, 1200);
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

    // ---------- HUD & render ----------
    function updateHud() {
        hudLives.textContent = player.lives;
        hudScore.textContent = score;
        hudBest.textContent = best;
        hudWave.textContent = wave;
    }

    function render() {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, MAP_PIXEL, MAP_PIXEL);
        if (!map) return;

        map.render(ctx);
        enemies.forEach((e) => e.render(ctx));
        if (boss) boss.render(ctx);
        if (player && player.alive) {
            const blink = player.invulnerable && Math.floor(performance.now() / 100) % 2 === 0;
            if (!blink) player.render(ctx);
        }
        bullets.forEach((b) => b.render(ctx));
    }

    // ---------- Main loop ----------
    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.05);
        const dtMs = dt * 1000;
        lastTime = now;

        handlePlayerInput(dt);

        spawnTimer -= dtMs;
        if (spawnTimer <= 0) {
            trySpawnEnemy();
            spawnTimer = 1400;
        }
        trySpawnBoss();

        enemies.forEach((e) => updateEnemyAI(e, dt, dtMs));
        updateBossAI(dt, dtMs);

        player.tickCooldown(dtMs);

        updateBullets(dt);

        if (map.baseAlive === false && state === "playing") {
            triggerGameOver("Base destroyed!");
        }

        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

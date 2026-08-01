(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = MAP_PIXEL_W;
    canvas.height = MAP_PIXEL_H;

    const hudLives = document.getElementById("hud-lives");
    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudWave = document.getElementById("hud-wave");
    const hudBombs = document.getElementById("hud-bombs");
    const hudFlame = document.getElementById("hud-flame");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");
    const bossBanner = document.getElementById("boss-banner");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let map = null;
    let player = null;
    let enemies = [];
    let boss = null;
    let bombs = [];
    let bombUnderPlayer = null;
    let explosions = [];
    let powerups = [];
    let score = 0;
    let wave = 1;
    let enemiesToSpawnInWave = 0;
    let bossSpawned = false;
    let state = "ready";
    let spawnTimer = 0;
    let lastTime = 0;
    let prevSpacePressed = false;

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

    const bombBtn = document.getElementById("bomb-btn");
    bombBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        keys[" "] = true;
        bombBtn.classList.add("is-pressed");
        if (state === "ready" || state === "gameover") startGame();
    });
    const releaseBomb = (e) => {
        e.preventDefault();
        keys[" "] = false;
        bombBtn.classList.remove("is-pressed");
    };
    bombBtn.addEventListener("pointerup", releaseBomb);
    bombBtn.addEventListener("pointercancel", releaseBomb);
    bombBtn.addEventListener("pointerleave", releaseBomb);

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

    function allEntities() {
        const list = [player, ...enemies];
        if (boss) list.push(boss);
        return list.filter((e) => e && e.alive);
    }

    function overlapsAnyEntity(x, y, w, h, self, others) {
        for (const other of others) {
            if (other === self || !other.alive) continue;
            if (rectsOverlap(x, y, w, h, other.x, other.y, other.size, other.size)) return true;
        }
        return false;
    }

    function bombOverlaps(x, y, w, h, excludeBomb) {
        for (const bomb of bombs) {
            if (bomb === excludeBomb) continue;
            if (rectsOverlap(x, y, w, h, bomb.col * TILE, bomb.row * TILE, TILE, TILE)) return true;
        }
        return false;
    }

    function moveEntity(entity, dx, dy, others, ignoreBomb) {
        if (dx !== 0) {
            const newX = clamp(entity.x + dx, 0, MAP_PIXEL_W - entity.size);
            if (
                !map.rectOverlapsSolid(newX, entity.y, entity.size, entity.size) &&
                !bombOverlaps(newX, entity.y, entity.size, entity.size, ignoreBomb) &&
                !overlapsAnyEntity(newX, entity.y, entity.size, entity.size, entity, others)
            ) {
                entity.x = newX;
            }
        }
        if (dy !== 0) {
            const newY = clamp(entity.y + dy, 0, MAP_PIXEL_H - entity.size);
            if (
                !map.rectOverlapsSolid(entity.x, newY, entity.size, entity.size) &&
                !bombOverlaps(entity.x, newY, entity.size, entity.size, ignoreBomb) &&
                !overlapsAnyEntity(entity.x, newY, entity.size, entity.size, entity, others)
            ) {
                entity.y = newY;
            }
        }
    }

    // ---------- Setup ----------
    function startGame() {
        map = new BombermanMap();
        bombs = [];
        bombUnderPlayer = null;
        explosions = [];
        powerups = [];
        enemies = [];
        boss = null;
        bossSpawned = false;
        score = 0;
        wave = 1;
        state = "playing";
        overlay.hidden = true;
        spawnPlayer();
        spawnWave();
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnPlayer() {
        const pos = tileToPixelCenter(PLAYER_SPAWN.col, PLAYER_SPAWN.row, PLAYER_SIZE);
        player = new Entity({
            x: pos.x,
            y: pos.y,
            size: PLAYER_SIZE,
            speed: PLAYER_BASE_SPEED,
            dir: DIR.DOWN,
            type: "player",
            hp: 1,
        });
        player.lives = PLAYER_LIVES;
        player.maxBombs = PLAYER_MAX_BOMBS_BASE;
        player.flameRange = PLAYER_FLAME_RANGE_BASE;
    }

    function spawnWave() {
        enemiesToSpawnInWave = ENEMIES_PER_WAVE_BASE + (wave - 1) * 2;
        bossSpawned = false;
        spawnTimer = 500;
    }

    function trySpawnEnemy() {
        if (enemies.length >= MAX_ENEMIES_ON_FIELD) return;
        if (enemiesToSpawnInWave <= 0) return;

        const sp = SPAWN_POINTS[1 + Math.floor(Math.random() * (SPAWN_POINTS.length - 1))];
        const pos = tileToPixelCenter(sp.col, sp.row, ENEMY_SIZE);
        if (map.rectOverlapsSolid(pos.x, pos.y, ENEMY_SIZE, ENEMY_SIZE)) return;
        if (overlapsAnyEntity(pos.x, pos.y, ENEMY_SIZE, ENEMY_SIZE, null, allEntities())) return;

        const enemy = new Entity({
            x: pos.x,
            y: pos.y,
            size: ENEMY_SIZE,
            speed: ENEMY_SPEED,
            dir: DIR.DOWN,
            type: "enemy",
            hp: 1,
        });
        enemy.aiTimer = randomBetween(300, 1000);
        enemies.push(enemy);
        enemiesToSpawnInWave -= 1;
    }

    function trySpawnBoss() {
        if (bossSpawned || enemiesToSpawnInWave > 0 || enemies.length > 0) return;
        const sp = SPAWN_POINTS[2];
        const pos = tileToPixelCenter(sp.col, sp.row, BOSS_SIZE);
        boss = new Entity({
            x: pos.x,
            y: pos.y,
            size: BOSS_SIZE,
            speed: BOSS_SPEED,
            dir: DIR.DOWN,
            type: "boss",
            hp: BOSS_HP_BASE + (wave - 1) * 2,
        });
        boss.aiTimer = randomBetween(300, 900);
        bossSpawned = true;
        showBossBanner();
    }

    function showBossBanner() {
        bossBanner.hidden = false;
        setTimeout(() => {
            bossBanner.hidden = true;
        }, 1800);
    }

    // ---------- Input & AI ----------
    function handlePlayerInput(dt, now) {
        let dir = null;
        if (keys.ArrowUp || keys.w || keys.W) dir = DIR.UP;
        else if (keys.ArrowDown || keys.s || keys.S) dir = DIR.DOWN;
        else if (keys.ArrowLeft || keys.a || keys.A) dir = DIR.LEFT;
        else if (keys.ArrowRight || keys.d || keys.D) dir = DIR.RIGHT;

        if (dir) {
            player.dir = dir;
            const others = allEntities().filter((e) => e !== player);
            moveEntity(player, dir.x * player.speed * dt, dir.y * player.speed * dt, others, bombUnderPlayer);
        }

        if (
            bombUnderPlayer &&
            !rectsOverlap(player.x, player.y, player.size, player.size, bombUnderPlayer.col * TILE, bombUnderPlayer.row * TILE, TILE, TILE)
        ) {
            bombUnderPlayer = null;
        }

        const spacePressed = !!keys[" "];
        if (spacePressed && !prevSpacePressed) placeBomb(now);
        prevSpacePressed = spacePressed;
    }

    function placeBomb(now) {
        const placedAt = now == null ? performance.now() : now;
        const col = player.gridCol;
        const row = player.gridRow;
        if (bombs.length >= player.maxBombs) return;
        if (bombs.some((b) => b.col === col && b.row === row)) return;
        const bomb = new Bomb(col, row, player.flameRange, placedAt);
        bombs.push(bomb);
        bombUnderPlayer = bomb;
    }

    function updateEnemyAI(enemy, dt, dtMs) {
        enemy.aiTimer -= dtMs;
        if (enemy.aiTimer <= 0 || enemy.blocked) {
            const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            enemy.dir = dirs[Math.floor(Math.random() * dirs.length)];
            enemy.aiTimer = randomBetween(500, 1400);
            enemy.blocked = false;
        }

        const before = { x: enemy.x, y: enemy.y };
        const others = allEntities().filter((e) => e !== enemy);
        moveEntity(enemy, enemy.dir.x * enemy.speed * dt, enemy.dir.y * enemy.speed * dt, others, null);
        if (enemy.x === before.x && enemy.y === before.y) enemy.blocked = true;
    }

    function updateBossAI(dt, dtMs) {
        if (!boss) return;
        boss.aiTimer -= dtMs;
        if (boss.aiTimer <= 0 || boss.blocked) {
            const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            boss.dir = dirs[Math.floor(Math.random() * dirs.length)];
            boss.aiTimer = randomBetween(500, 1400);
            boss.blocked = false;
        }

        const before = { x: boss.x, y: boss.y };
        const others = allEntities().filter((e) => e !== boss);
        moveEntity(boss, boss.dir.x * boss.speed * dt, boss.dir.y * boss.speed * dt, others, null);
        if (boss.x === before.x && boss.y === before.y) boss.blocked = true;
    }

    // ---------- Bombs / explosions ----------
    function maybeDropPowerup(col, row) {
        if (Math.random() >= POWERUP_DROP_CHANCE) return;
        const kinds = [POWERUP_BOMB, POWERUP_FLAME, POWERUP_SPEED];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        powerups.push(new PowerUp(col, row, kind));
    }

    function explodeBomb(bomb, now) {
        if (bomb.exploded) return;
        bomb.exploded = true;
        bombs = bombs.filter((b) => b !== bomb);

        const cells = [{ col: bomb.col, row: bomb.row }];
        [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT].forEach((dir) => {
            for (let i = 1; i <= bomb.flameRange; i++) {
                const col = bomb.col + dir.x * i;
                const row = bomb.row + dir.y * i;
                if (map.isHard(col, row)) break;
                cells.push({ col, row });
                if (map.destroySoft(col, row)) {
                    maybeDropPowerup(col, row);
                    break;
                }
            }
        });

        explosions.push({ cells, expiresAt: now + EXPLOSION_DURATION_MS, hit: new Set() });

        bombs.slice().forEach((other) => {
            if (cells.some((c) => c.col === other.col && c.row === other.row)) {
                explodeBomb(other, now);
            }
        });
    }

    function updateBombs(now) {
        bombs.slice().forEach((bomb) => {
            if (now - bomb.placedAt >= BOMB_FUSE_MS) explodeBomb(bomb, now);
        });
    }

    function updateExplosions(now) {
        explosions.forEach((explosion) => {
            if (now >= explosion.expiresAt) return;

            if (player.alive && !player.invulnerable && !explosion.hit.has(player)) {
                if (explosion.cells.some((c) => c.col === player.gridCol && c.row === player.gridRow)) {
                    explosion.hit.add(player);
                    hitPlayer();
                }
            }

            enemies.forEach((enemy) => {
                if (!enemy.alive || explosion.hit.has(enemy)) return;
                if (explosion.cells.some((c) => c.col === enemy.gridCol && c.row === enemy.gridRow)) {
                    explosion.hit.add(enemy);
                    killEnemy(enemy);
                }
            });

            if (boss && boss.alive && !explosion.hit.has(boss)) {
                if (explosion.cells.some((c) => c.col === boss.gridCol && c.row === boss.gridRow)) {
                    explosion.hit.add(boss);
                    boss.hp -= 1;
                    if (boss.hp <= 0) killBoss();
                }
            }
        });

        explosions = explosions.filter((explosion) => now < explosion.expiresAt);
    }

    function updatePowerups() {
        powerups.forEach((p) => {
            if (p.collected) return;
            if (player.gridCol === p.col && player.gridRow === p.row) {
                p.collected = true;
                score += 20;
                if (p.kind === POWERUP_BOMB) {
                    player.maxBombs = Math.min(POWERUP_MAX_BOMBS_CAP, player.maxBombs + 1);
                } else if (p.kind === POWERUP_FLAME) {
                    player.flameRange = Math.min(POWERUP_MAX_FLAME_CAP, player.flameRange + 1);
                } else if (p.kind === POWERUP_SPEED) {
                    player.speed = Math.min(POWERUP_SPEED_CAP, player.speed + POWERUP_SPEED_STEP);
                }
            }
        });
        powerups = powerups.filter((p) => !p.collected);
    }

    function checkEntityContact() {
        [...enemies, ...(boss ? [boss] : [])].forEach((other) => {
            if (!other.alive || !player.alive || player.invulnerable) return;
            if (rectsOverlap(player.x, player.y, player.size, player.size, other.x, other.y, other.size, other.size)) {
                hitPlayer();
            }
        });
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
        bombUnderPlayer = null;
        player.invulnerable = true;
        setTimeout(() => {
            if (player) player.invulnerable = false;
        }, 1300);
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

    // ---------- HUD & render ----------
    function updateHud() {
        hudLives.textContent = player.lives;
        hudScore.textContent = score;
        hudBest.textContent = best;
        hudWave.textContent = wave;
        hudBombs.textContent = (player.maxBombs - bombs.length) + "/" + player.maxBombs;
        hudFlame.textContent = player.flameRange;
    }

    function render(now) {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, MAP_PIXEL_W, MAP_PIXEL_H);
        if (!map) return;

        map.render(ctx);
        powerups.forEach((p) => p.render(ctx));
        bombs.forEach((b) => b.render(ctx));

        explosions.forEach((explosion) => {
            const remaining = (explosion.expiresAt - now) / EXPLOSION_DURATION_MS;
            ctx.globalAlpha = Math.max(0, Math.min(1, remaining));
            ctx.fillStyle = "#ff8a3d";
            explosion.cells.forEach((c) => {
                ctx.fillRect(c.col * TILE + 3, c.row * TILE + 3, TILE - 6, TILE - 6);
            });
            ctx.globalAlpha = 1;
        });

        enemies.forEach((e) => e.render(ctx));
        if (boss) boss.render(ctx);
        if (player && player.alive) player.render(ctx);
    }

    // ---------- Main loop ----------
    function loop(now) {
        if (state !== "playing") {
            render(now);
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.05);
        const dtMs = dt * 1000;
        lastTime = now;

        handlePlayerInput(dt, now);

        spawnTimer -= dtMs;
        if (spawnTimer <= 0) {
            trySpawnEnemy();
            spawnTimer = 1300;
        }
        trySpawnBoss();

        enemies.forEach((e) => updateEnemyAI(e, dt, dtMs));
        updateBossAI(dt, dtMs);

        updateBombs(now);
        updateExplosions(now);
        updatePowerups();
        checkEntityContact();

        updateHud();
        render(now);

        requestAnimationFrame(loop);
    }

    render(performance.now());
})();

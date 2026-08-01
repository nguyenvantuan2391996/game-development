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
    let player, camera, platforms, monsters, nextRowWorldY, maxWorldY, score;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function spawnRow() {
        const roll = Math.random();
        let type = "normal";
        if (score >= BREAKABLE_UNLOCK_SCORE && roll < 0.15) type = "breakable";
        else if (score >= MOVING_UNLOCK_SCORE && roll < 0.4) type = "moving";

        const platform = {
            type,
            worldY: nextRowWorldY,
            x: randomBetween(0, GAME_WIDTH - PLATFORM_WIDTH),
            width: PLATFORM_WIDTH,
            dir: Math.random() < 0.5 ? 1 : -1,
            speed: randomBetween(MOVING_PLATFORM_SPEED_MIN, MOVING_PLATFORM_SPEED_MAX),
            broken: false,
        };
        platforms.push(platform);

        if (type === "normal" && score >= MONSTER_UNLOCK_SCORE && Math.random() < MONSTER_CHANCE) {
            monsters.push({
                worldY: platform.worldY + 70,
                x: (platform.x + platform.width / 2 + randomBetween(-60, 60) + GAME_WIDTH) % GAME_WIDTH,
                baseX: 0,
                phase: Math.random() * Math.PI * 2,
            });
        }

        nextRowWorldY += randomBetween(ROW_GAP_MIN, ROW_GAP_MAX);
    }

    function resetGame() {
        player = { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, worldY: 40, prevWorldY: 40, vy: JUMP_VELOCITY, facing: 1 };
        camera = { worldY: 0, target: 0 };
        platforms = [];
        monsters = [];
        nextRowWorldY = 10;
        maxWorldY = 40;
        score = 0;

        platforms.push({ type: "normal", worldY: 0, x: GAME_WIDTH / 2 - PLATFORM_WIDTH / 2, width: PLATFORM_WIDTH, dir: 1, speed: 0, broken: false });
        while (nextRowWorldY < GAME_HEIGHT) spawnRow();
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
        if (state !== "playing" && (e.key === " " || e.key === "Enter" || e.key === "ArrowUp")) {
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

    function die() {
        if (state !== "playing") return;
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `Bạn đã leo cao ${score}m. Nhấn để chơi lại.`, "Chơi lại");
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

    function handleInput(dt) {
        let vx = 0;
        if (keys.ArrowLeft || keys.a || keys.A) vx -= MOVE_SPEED;
        if (keys.ArrowRight || keys.d || keys.D) vx += MOVE_SPEED;
        if (vx !== 0) player.facing = vx > 0 ? 1 : -1;
        player.x += vx * dt;
        if (player.x + PLAYER_SIZE < 0) player.x = GAME_WIDTH;
        else if (player.x > GAME_WIDTH) player.x = -PLAYER_SIZE;
    }

    function updateWorld(dt) {
        handleInput(dt);

        player.prevWorldY = player.worldY;
        player.vy -= GRAVITY * dt;
        player.worldY += player.vy * dt;

        if (player.worldY > maxWorldY) {
            maxWorldY = player.worldY;
            score = Math.floor(maxWorldY / 10);
        }

        platforms.forEach((p) => {
            if (p.type === "moving" && !p.broken) {
                p.x += p.dir * p.speed * dt;
                if (p.x <= 0) {
                    p.x = 0;
                    p.dir = 1;
                } else if (p.x + p.width >= GAME_WIDTH) {
                    p.x = GAME_WIDTH - p.width;
                    p.dir = -1;
                }
            }
        });

        if (player.vy < 0) {
            for (const p of platforms) {
                if (p.broken) continue;
                if (player.x + PLAYER_SIZE < p.x || player.x > p.x + p.width) continue;
                if (player.prevWorldY >= p.worldY && player.worldY <= p.worldY) {
                    player.vy = JUMP_VELOCITY;
                    player.worldY = p.worldY;
                    if (p.type === "breakable") p.broken = true;
                    break;
                }
            }
        }

        for (const m of monsters) {
            if (
                player.x + PLAYER_SIZE * 0.7 > m.x - MONSTER_SIZE / 2 &&
                player.x + PLAYER_SIZE * 0.3 < m.x + MONSTER_SIZE / 2 &&
                player.worldY + PLAYER_SIZE * 0.7 > m.worldY - MONSTER_SIZE / 2 &&
                player.worldY < m.worldY + MONSTER_SIZE / 2
            ) {
                die();
                return;
            }
        }

        camera.target = Math.max(camera.target, player.worldY - CAMERA_MARGIN);
        camera.worldY += (camera.target - camera.worldY) * CAMERA_LERP;

        while (nextRowWorldY - camera.worldY < GAME_HEIGHT + 100) spawnRow();
        platforms = platforms.filter((p) => p.worldY - camera.worldY > -60);
        monsters = monsters.filter((m) => m.worldY - camera.worldY > -60);

        const playerScreenY = GAME_HEIGHT - (player.worldY - camera.worldY);
        if (playerScreenY > GAME_HEIGHT + PLAYER_SIZE * 2) {
            die();
        }
    }

    function screenY(worldY) {
        return GAME_HEIGHT - (worldY - camera.worldY);
    }

    function drawPlatform(p) {
        const y = screenY(p.worldY);
        if (p.type === "breakable") {
            ctx.fillStyle = "#a0774a";
        } else if (p.type === "moving") {
            ctx.fillStyle = "#4dc3ff";
        } else {
            ctx.fillStyle = "#4ade80";
        }
        ctx.fillRect(p.x, y - PLATFORM_HEIGHT / 2, p.width, PLATFORM_HEIGHT);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(p.x, y - PLATFORM_HEIGHT / 2, p.width, 4);
        if (p.type === "breakable") {
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x + p.width * 0.3, y - PLATFORM_HEIGHT / 2);
            ctx.lineTo(p.x + p.width * 0.45, y + PLATFORM_HEIGHT / 2);
            ctx.moveTo(p.x + p.width * 0.7, y - PLATFORM_HEIGHT / 2);
            ctx.lineTo(p.x + p.width * 0.55, y + PLATFORM_HEIGHT / 2);
            ctx.stroke();
        }
    }

    function drawMonster(m) {
        const y = screenY(m.worldY);
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.arc(m.x, y, MONSTER_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(m.x - 6, y - 4, 5, 0, Math.PI * 2);
        ctx.arc(m.x + 6, y - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1330";
        ctx.beginPath();
        ctx.arc(m.x - 6, y - 4, 2.4, 0, Math.PI * 2);
        ctx.arc(m.x + 6, y - 4, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPlayer() {
        const y = screenY(player.worldY);
        ctx.save();
        ctx.translate(player.x + PLAYER_SIZE / 2, y - PLAYER_SIZE / 2);
        ctx.scale(player.facing, 1);
        ctx.fillStyle = "#7cff8f";
        ctx.beginPath();
        ctx.ellipse(0, 0, PLAYER_SIZE / 2, PLAYER_SIZE / 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(6, -6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1330";
        ctx.beginPath();
        ctx.arc(8, -6, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function render() {
        ctx.fillStyle = "#101226";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        platforms.forEach(drawPlatform);
        monsters.forEach(drawMonster);
        drawPlayer();
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

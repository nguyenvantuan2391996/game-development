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
    let distance = 0;
    let elapsed = 0;
    let score = 0;
    let obstacles = [];
    let nextSpawnWorldX = 0;
    let player = { y: GROUND_Y - PLAYER_SIZE, vy: 0, onGround: true, angle: 0 };

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function scrollSpeed() {
        return Math.min(MAX_SCROLL_SPEED, BASE_SCROLL_SPEED + elapsed * SPEED_RAMP_PER_SEC);
    }

    function spawnObstacle() {
        const roll = Math.random();
        let obstacle;
        if (roll < 0.4) {
            obstacle = { type: "spike", worldX: nextSpawnWorldX, width: SPIKE_SIZE };
        } else if (roll < 0.75) {
            const height = randomBetween(BLOCK_HEIGHT_MIN, BLOCK_HEIGHT_MAX);
            obstacle = { type: "block", worldX: nextSpawnWorldX, width: BLOCK_WIDTH, height };
        } else {
            const width = randomBetween(GAP_WIDTH_MIN, GAP_WIDTH_MAX);
            obstacle = { type: "gap", worldX: nextSpawnWorldX, width };
        }
        obstacles.push(obstacle);
        nextSpawnWorldX += obstacle.width + randomBetween(OBSTACLE_GAP_MIN, OBSTACLE_GAP_MAX);
    }

    function resetGame() {
        distance = 0;
        elapsed = 0;
        score = 0;
        obstacles = [];
        nextSpawnWorldX = 500;
        player = { y: GROUND_Y - PLAYER_SIZE, vy: 0, onGround: true, angle: 0 };
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function jump() {
        if (state !== "playing") {
            startGame();
            return;
        }
        if (player.onGround) {
            player.vy = JUMP_VELOCITY;
            player.onGround = false;
        }
    }

    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "ArrowUp" || e.key === "Enter" || e.key === "w" || e.key === "W") {
            e.preventDefault();
            if (!e.repeat) jump();
        }
    });

    canvas.addEventListener("pointerdown", jump);
    overlayBtn.addEventListener("click", jump);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            btn.classList.add("is-pressed");
            jump();
        });
        const release = () => btn.classList.remove("is-pressed");
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    });

    function die(reason) {
        if (state !== "playing") return;
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `${reason} Điểm: ${score}. Nhấn để chơi lại.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function gapUnderPlayer(playerWorldX) {
        return obstacles.find(
            (o) => o.type === "gap" && playerWorldX + PLAYER_SIZE > o.worldX && playerWorldX < o.worldX + o.width
        );
    }

    function updateWorld(dt) {
        elapsed += dt;
        const speed = scrollSpeed();
        distance += speed * dt;

        while (nextSpawnWorldX - distance < GAME_WIDTH + 200) spawnObstacle();
        obstacles = obstacles.filter((o) => o.worldX + o.width - distance > -60);

        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;

        const playerWorldX = distance + PLAYER_X;
        const gap = gapUnderPlayer(playerWorldX);

        if (gap) {
            player.onGround = false;
            if (player.y > GAME_HEIGHT) {
                die("Bạn đã rơi xuống hố!");
                return;
            }
        } else if (player.y + PLAYER_SIZE >= GROUND_Y) {
            player.y = GROUND_Y - PLAYER_SIZE;
            player.vy = 0;
            if (!player.onGround) player.angle = Math.round(player.angle / (Math.PI / 2)) * (Math.PI / 2);
            player.onGround = true;
        } else {
            player.onGround = false;
        }

        if (!player.onGround) {
            player.angle += ROTATION_SPEED * dt;
        }

        const px = PLAYER_X;
        const py = player.y;
        for (const o of obstacles) {
            const sx = o.worldX - distance;
            if (o.type === "spike") {
                if (
                    rectsOverlap(
                        px + 5, py + 5, PLAYER_SIZE - 10, PLAYER_SIZE - 10,
                        sx + 4, GROUND_Y - SPIKE_SIZE + 6, SPIKE_SIZE - 8, SPIKE_SIZE - 6
                    )
                ) {
                    die("Bạn đã đâm vào chông!");
                    return;
                }
            } else if (o.type === "block") {
                if (
                    rectsOverlap(
                        px, py, PLAYER_SIZE, PLAYER_SIZE,
                        sx, GROUND_Y - o.height, o.width, o.height
                    )
                ) {
                    die("Bạn đã va vào khối chắn!");
                    return;
                }
            }
        }

        score = Math.floor(distance / 10);
    }

    function drawBackground() {
        ctx.fillStyle = "#150f2e";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(124,92,255,0.12)";
        ctx.lineWidth = 1;
        const offset = (distance * 0.4) % 40;
        for (let x = -offset; x < GAME_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GROUND_Y);
            ctx.stroke();
        }
    }

    function drawGround() {
        ctx.fillStyle = "#241a45";
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GROUND_HEIGHT);
        ctx.fillStyle = "#ff3d9a";
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 4);

        obstacles.forEach((o) => {
            if (o.type !== "gap") return;
            const sx = o.worldX - distance;
            ctx.fillStyle = "#150f2e";
            ctx.fillRect(sx, GROUND_Y, o.width, GROUND_HEIGHT);
        });
    }

    function drawObstacles() {
        obstacles.forEach((o) => {
            const sx = o.worldX - distance;
            if (sx > GAME_WIDTH || sx + o.width < -40) return;

            if (o.type === "spike") {
                ctx.fillStyle = "#ff8a3d";
                ctx.beginPath();
                ctx.moveTo(sx, GROUND_Y);
                ctx.lineTo(sx + o.width / 2, GROUND_Y - SPIKE_SIZE);
                ctx.lineTo(sx + o.width, GROUND_Y);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.5)";
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (o.type === "block") {
                ctx.fillStyle = "#7c5cff";
                ctx.fillRect(sx, GROUND_Y - o.height, o.width, o.height);
                ctx.fillStyle = "rgba(255,255,255,0.18)";
                ctx.fillRect(sx, GROUND_Y - o.height, o.width, 6);
                ctx.strokeStyle = "rgba(0,0,0,0.35)";
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 2, GROUND_Y - o.height + 2, o.width - 4, o.height - 4);
            }
        });
    }

    function drawPlayer() {
        ctx.save();
        ctx.translate(PLAYER_X + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
        ctx.rotate(player.angle);
        ctx.fillStyle = "#ffcf4d";
        ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
        ctx.strokeStyle = "#e63946";
        ctx.lineWidth = 4;
        ctx.strokeRect(-PLAYER_SIZE / 2 + 2, -PLAYER_SIZE / 2 + 2, PLAYER_SIZE - 4, PLAYER_SIZE - 4);
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.beginPath();
        ctx.arc(2, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function render() {
        drawBackground();
        drawGround();
        drawObstacles();
        if (state !== "ready") drawPlayer();
        else {
            ctx.save();
            ctx.translate(PLAYER_X + PLAYER_SIZE / 2, GROUND_Y - PLAYER_SIZE / 2);
            ctx.fillStyle = "#ffcf4d";
            ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
            ctx.restore();
        }
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
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

    render();
})();

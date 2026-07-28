(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudSpeed = document.getElementById("hud-speed");
    const fuelBarFill = document.getElementById("fuel-bar-fill");
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
        if ((state === "ready" || state === "gameover") && (e.key === " " || e.key === "Enter" || e.key === "ArrowUp")) {
            startGame();
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    let state = "ready";
    let scrollDistance = 0;
    let playerX = GAME_WIDTH / 2;
    let playerSpeed = CRUISE_SPEED;
    let fuel = FUEL_MAX;
    let score = 0;
    let traffic = [];
    let fuelItems = [];
    let trafficSpawnTimer = 0;
    let fuelSpawnTimer = 0;
    let lastTime = 0;

    const TRAFFIC_COLORS = ["#e63946", "#3ddc84", "#ffcf4d", "#4cc9f0", "#f5f4fb"];
    const SPAWN_RELATIVE_DISTANCE = GAME_HEIGHT - SPAWN_SCREEN_Y;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function roadCenterForScreenY(screenY, scrollDist) {
        const aheadDist = scrollDist + (GAME_HEIGHT - screenY);
        return GAME_WIDTH / 2 + Math.sin(aheadDist * ROAD_CURVE_FREQ) * ROAD_CURVE_AMPLITUDE;
    }

    overlayBtn.addEventListener("click", startGame);

    function startGame() {
        state = "playing";
        scrollDistance = 0;
        playerX = GAME_WIDTH / 2;
        playerSpeed = CRUISE_SPEED;
        fuel = FUEL_MAX;
        score = 0;
        traffic = [];
        fuelItems = [];
        trafficSpawnTimer = randomBetween(TRAFFIC_SPAWN_MIN_MS, TRAFFIC_SPAWN_MAX_MS);
        fuelSpawnTimer = randomBetween(FUEL_SPAWN_MIN_MS, FUEL_SPAWN_MAX_MS);
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnTraffic() {
        const center = roadCenterForScreenY(SPAWN_SCREEN_Y, scrollDistance);
        const margin = TRAFFIC_WIDTH / 2 + 8;
        const minX = center - ROAD_WIDTH / 2 + margin;
        const maxX = center + ROAD_WIDTH / 2 - margin;
        traffic.push({
            x: randomBetween(minX, maxX),
            relativeDistance: SPAWN_RELATIVE_DISTANCE,
            color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)],
            scored: false,
        });
    }

    function spawnFuelItem() {
        const center = roadCenterForScreenY(SPAWN_SCREEN_Y, scrollDistance);
        const margin = FUEL_ITEM_SIZE / 2 + 8;
        const minX = center - ROAD_WIDTH / 2 + margin;
        const maxX = center + ROAD_WIDTH / 2 - margin;
        fuelItems.push({
            x: randomBetween(minX, maxX),
            relativeDistance: SPAWN_RELATIVE_DISTANCE,
        });
    }

    function updatePlayerInput(dt) {
        if (keys.ArrowLeft || keys.a || keys.A) playerX -= PLAYER_TURN_SPEED * dt;
        if (keys.ArrowRight || keys.d || keys.D) playerX += PLAYER_TURN_SPEED * dt;
        playerX = Math.max(PLAYER_WIDTH / 2, Math.min(GAME_WIDTH - PLAYER_WIDTH / 2, playerX));

        if (keys.ArrowUp || keys.w || keys.W) {
            playerSpeed = Math.min(playerSpeed + ACCEL_RATE * dt, MAX_SPEED);
        } else if (keys.ArrowDown || keys.s || keys.S) {
            playerSpeed = Math.max(playerSpeed - BRAKE_RATE * dt, MIN_SPEED);
        } else if (playerSpeed > CRUISE_SPEED) {
            playerSpeed = Math.max(CRUISE_SPEED, playerSpeed - SPEED_DECAY_RATE * dt);
        } else if (playerSpeed < CRUISE_SPEED) {
            playerSpeed = Math.min(CRUISE_SPEED, playerSpeed + SPEED_DECAY_RATE * dt);
        }
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function updateWorld(dt) {
        scrollDistance += playerSpeed * dt;
        fuel -= FUEL_DRAIN_PER_SEC * (playerSpeed / CRUISE_SPEED) * dt;
        score += playerSpeed * dt * 0.08;

        if (fuel <= 0) {
            fuel = 0;
            triggerGameOver("Hết xăng!");
            return;
        }

        trafficSpawnTimer -= dt * 1000;
        if (trafficSpawnTimer <= 0) {
            spawnTraffic();
            trafficSpawnTimer = randomBetween(TRAFFIC_SPAWN_MIN_MS, TRAFFIC_SPAWN_MAX_MS);
        }

        fuelSpawnTimer -= dt * 1000;
        if (fuelSpawnTimer <= 0) {
            spawnFuelItem();
            fuelSpawnTimer = randomBetween(FUEL_SPAWN_MIN_MS, FUEL_SPAWN_MAX_MS);
        }

        const playerLeft = playerX - PLAYER_WIDTH / 2;
        const playerTop = PLAYER_SCREEN_Y - PLAYER_HEIGHT / 2;

        traffic.forEach((t) => {
            t.relativeDistance -= playerSpeed * dt;
            const screenY = GAME_HEIGHT - t.relativeDistance;
            const carTop = screenY - TRAFFIC_HEIGHT / 2;

            if (!t.scored && carTop > PLAYER_SCREEN_Y + PLAYER_HEIGHT / 2) {
                t.scored = true;
                score += 15;
            }

            if (rectsOverlap(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT, t.x - TRAFFIC_WIDTH / 2, carTop, TRAFFIC_WIDTH, TRAFFIC_HEIGHT)) {
                triggerGameOver("Bạn đã đâm xe!");
            }
        });
        traffic = traffic.filter((t) => GAME_HEIGHT - t.relativeDistance <= DESPAWN_SCREEN_Y);

        fuelItems.forEach((f) => {
            f.relativeDistance -= playerSpeed * dt;
            const screenY = GAME_HEIGHT - f.relativeDistance;
            const itemTop = screenY - FUEL_ITEM_SIZE / 2;

            if (rectsOverlap(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT, f.x - FUEL_ITEM_SIZE / 2, itemTop, FUEL_ITEM_SIZE, FUEL_ITEM_SIZE)) {
                fuel = Math.min(FUEL_MAX, fuel + FUEL_PICKUP_AMOUNT);
                score += 5;
                f.collected = true;
            }
        });
        fuelItems = fuelItems.filter((f) => !f.collected && GAME_HEIGHT - f.relativeDistance <= DESPAWN_SCREEN_Y);

        const roadCenter = roadCenterForScreenY(PLAYER_SCREEN_Y, scrollDistance);
        const roadLeft = roadCenter - ROAD_WIDTH / 2;
        const roadRight = roadCenter + ROAD_WIDTH / 2;
        if (playerX - PLAYER_WIDTH / 2 < roadLeft - 4 || playerX + PLAYER_WIDTH / 2 > roadRight + 4) {
            triggerGameOver("Bạn đã lao ra ngoài đường!");
        }
    }

    function triggerGameOver(reason) {
        if (state === "gameover") return;
        state = "gameover";
        const finalScore = Math.floor(score);
        if (finalScore > best) {
            best = finalScore;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Game Over", `${reason} Điểm: ${finalScore}. Nhấn để chơi lại.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function drawCar(x, screenY, w, h, bodyColor) {
        ctx.save();
        ctx.translate(x, screenY);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(11,10,31,0.55)";
        ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w - 8, h * 0.4);
        ctx.restore();
    }

    function render() {
        ctx.fillStyle = "#2f7a3d";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const STRIP = 8;
        for (let y = 0; y < GAME_HEIGHT; y += STRIP) {
            const center = roadCenterForScreenY(y, scrollDistance);
            const left = center - ROAD_WIDTH / 2;
            const right = center + ROAD_WIDTH / 2;
            ctx.fillStyle = "#3a3a44";
            ctx.fillRect(left, y, ROAD_WIDTH, STRIP + 1);

            const dashPhase = (scrollDistance * 0.6) % 40;
            if (Math.floor((y + dashPhase) / 20) % 2 === 0) {
                ctx.fillStyle = "#f5f4fb";
                ctx.fillRect(left + ROAD_WIDTH * 0.33 - 2, y, 4, STRIP + 1);
                ctx.fillRect(left + ROAD_WIDTH * 0.67 - 2, y, 4, STRIP + 1);
            }
        }

        fuelItems.forEach((f) => {
            const screenY = GAME_HEIGHT - f.relativeDistance;
            ctx.fillStyle = "#ffcf4d";
            ctx.beginPath();
            ctx.roundRect(f.x - FUEL_ITEM_SIZE / 2, screenY - FUEL_ITEM_SIZE / 2, FUEL_ITEM_SIZE, FUEL_ITEM_SIZE, 5);
            ctx.fill();
            ctx.fillStyle = "#0b0a1f";
            ctx.font = "bold 14px Poppins, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("F", f.x, screenY + 1);
        });

        traffic.forEach((t) => {
            const screenY = GAME_HEIGHT - t.relativeDistance;
            drawCar(t.x, screenY, TRAFFIC_WIDTH, TRAFFIC_HEIGHT, t.color);
        });

        if (state !== "ready") {
            drawCar(playerX, PLAYER_SCREEN_Y, PLAYER_WIDTH, PLAYER_HEIGHT, "#ff3d9a");
        }
    }

    function updateHud() {
        hudScore.textContent = Math.floor(score);
        hudBest.textContent = best;
        hudSpeed.textContent = Math.round(playerSpeed);
        fuelBarFill.style.width = `${Math.max(0, (fuel / FUEL_MAX) * 100)}%`;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        updatePlayerInput(dt);
        updateWorld(dt);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

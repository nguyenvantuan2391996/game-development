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
    let rooftops = [];
    let nextSpawnWorldX = 0;
    let player = { y: 0, vy: 0, onGround: true, charging: false, chargeStart: 0, runCycle: 0 };

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function scrollSpeed() {
        return Math.min(MAX_RUN_SPEED, BASE_RUN_SPEED + elapsed * SPEED_RAMP_PER_SEC);
    }

    function buildWindows(width, roofY) {
        const windows = [];
        for (let dy = 20; roofY + dy < GAME_HEIGHT + 40; dy += 32) {
            for (let dx = 10; dx < width - 10; dx += 26) {
                if ((Math.round(dx) + Math.round(dy)) % 3 === 0) continue;
                windows.push({ dx, dy });
            }
        }
        return windows;
    }

    function spawnRooftop(isFirst) {
        const prev = rooftops[rooftops.length - 1];
        const width = isFirst ? 300 : randomBetween(ROOF_WIDTH_MIN, ROOF_WIDTH_MAX);
        let topY;
        if (isFirst) {
            topY = 380;
        } else {
            const step = randomBetween(-ROOF_HEIGHT_STEP_MAX, ROOF_HEIGHT_STEP_MAX);
            topY = clamp(prev.topY + step, ROOF_TOP_MIN, ROOF_TOP_MAX);
        }

        const rooftop = { worldX: nextSpawnWorldX, width, topY, windows: buildWindows(width, topY), crate: null };

        if (!isFirst && Math.random() < CRATE_CHANCE && width > 90) {
            const crateX = randomBetween(30, width - 55);
            rooftop.crate = { worldX: nextSpawnWorldX + crateX, size: CRATE_SIZE };
        }

        rooftops.push(rooftop);

        const gapMax = Math.min(ROOF_GAP_MAX_CAP, scrollSpeed() * 0.55);
        const gap = isFirst ? 0 : randomBetween(ROOF_GAP_MIN, Math.max(ROOF_GAP_MIN + 10, gapMax));
        nextSpawnWorldX += width + gap;
    }

    function resetGame() {
        distance = 0;
        elapsed = 0;
        score = 0;
        rooftops = [];
        nextSpawnWorldX = 0;
        spawnRooftop(true);
        player = { y: rooftops[0].topY - PLAYER_H, vy: 0, onGround: true, charging: false, chargeStart: 0, runCycle: 0 };
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function beginCharge() {
        if (state !== "playing" || !player.onGround || player.charging) return;
        player.charging = true;
        player.chargeStart = performance.now();
    }

    function releaseCharge() {
        if (state !== "playing" || !player.charging) return;
        const fraction = clamp((performance.now() - player.chargeStart) / (JUMP_CHARGE_TIME * 1000), 0, 1);
        player.vy = lerp(JUMP_VELOCITY_MIN, JUMP_VELOCITY_MAX, fraction);
        player.onGround = false;
        player.charging = false;
    }

    function pressAction() {
        if (state !== "playing") {
            startGame();
            return;
        }
        beginCharge();
    }

    function releaseAction() {
        releaseCharge();
    }

    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "ArrowUp" || e.key === "Enter" || e.key === "w" || e.key === "W") {
            e.preventDefault();
            if (!e.repeat) pressAction();
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.key === " " || e.key === "ArrowUp" || e.key === "Enter" || e.key === "w" || e.key === "W") {
            e.preventDefault();
            releaseAction();
        }
    });

    canvas.addEventListener("pointerdown", pressAction);
    canvas.addEventListener("pointerup", releaseAction);
    canvas.addEventListener("pointerleave", releaseAction);
    overlayBtn.addEventListener("click", pressAction);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            btn.classList.add("is-pressed");
            pressAction();
        });
        const release = () => {
            btn.classList.remove("is-pressed");
            releaseAction();
        };
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
        showOverlay("Game Over", `${reason} Score: ${score}. Press to run again.`, "Run Again");
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

    function rooftopUnder(worldXLeft, worldXRight) {
        return rooftops.find((r) => worldXRight > r.worldX && worldXLeft < r.worldX + r.width);
    }

    function updateWorld(dt) {
        elapsed += dt;
        const speed = scrollSpeed();
        distance += speed * dt;
        player.runCycle += dt * (player.onGround ? speed * 0.02 : 0);

        while (nextSpawnWorldX - distance < GAME_WIDTH + 250) spawnRooftop(false);
        rooftops = rooftops.filter((r) => r.worldX + r.width - distance > -80);

        if (player.charging && performance.now() - player.chargeStart >= JUMP_CHARGE_TIME * 1000) {
            releaseCharge();
        }

        if (!player.charging) {
            player.vy += GRAVITY * dt;
            player.y += player.vy * dt;
        }

        const playerWorldX = distance + PLAYER_X;
        const roof = rooftopUnder(playerWorldX, playerWorldX + PLAYER_W);

        if (roof) {
            if (roof.crate) {
                const cx = roof.crate.worldX - distance;
                if (
                    rectsOverlap(
                        PLAYER_X, player.y, PLAYER_W, PLAYER_H,
                        cx, roof.topY - CRATE_SIZE, CRATE_SIZE, CRATE_SIZE
                    )
                ) {
                    die("You crashed into a crate!");
                    return;
                }
            }
            if (player.y + PLAYER_H >= roof.topY && player.vy >= 0) {
                player.y = roof.topY - PLAYER_H;
                player.vy = 0;
                player.onGround = true;
            } else {
                player.onGround = false;
            }
        } else {
            player.onGround = false;
            if (player.y > GAME_HEIGHT) {
                die("You fell into the gap!");
                return;
            }
        }

        score = Math.floor(distance / 10);
    }

    function drawSky() {
        const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        grad.addColorStop(0, "#2b1b3d");
        grad.addColorStop(0.55, "#5a2f4f");
        grad.addColorStop(1, "#ff8a3d");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "rgba(255, 210, 61, 0.9)";
        ctx.beginPath();
        ctx.arc(GAME_WIDTH - 70, 110, 34, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawParallax() {
        const offset = (distance * 0.25) % 90;
        ctx.fillStyle = "rgba(20, 14, 30, 0.55)";
        for (let x = -offset; x < GAME_WIDTH + 90; x += 90) {
            const h = 90 + (Math.floor((x + offset) / 90) % 3) * 30;
            ctx.fillRect(x, GAME_HEIGHT - h - 40, 60, h + 40);
        }
    }

    function drawRooftops() {
        rooftops.forEach((r) => {
            const sx = r.worldX - distance;
            if (sx > GAME_WIDTH || sx + r.width < -40) return;

            ctx.fillStyle = "#1c1630";
            ctx.fillRect(sx, r.topY, r.width, GAME_HEIGHT - r.topY + 40);

            ctx.fillStyle = "#ff5e62";
            ctx.fillRect(sx, r.topY, r.width, 5);

            ctx.fillStyle = "rgba(255, 210, 61, 0.55)";
            r.windows.forEach((w) => {
                ctx.fillRect(sx + w.dx, r.topY + w.dy, 8, 10);
            });

            if (r.crate) {
                const cx = r.crate.worldX - distance;
                ctx.fillStyle = "#a9713f";
                ctx.fillRect(cx, r.topY - CRATE_SIZE, CRATE_SIZE, CRATE_SIZE);
                ctx.strokeStyle = "rgba(0,0,0,0.4)";
                ctx.lineWidth = 2;
                ctx.strokeRect(cx + 2, r.topY - CRATE_SIZE + 2, CRATE_SIZE - 4, CRATE_SIZE - 4);
                ctx.beginPath();
                ctx.moveTo(cx, r.topY - CRATE_SIZE / 2);
                ctx.lineTo(cx + CRATE_SIZE, r.topY - CRATE_SIZE / 2);
                ctx.stroke();
            }
        });
    }

    function drawPlayer() {
        const cx = PLAYER_X + PLAYER_W / 2;
        const cy = player.y + PLAYER_H / 2;
        ctx.save();
        ctx.translate(cx, cy);

        const airborne = !player.onGround;
        const lean = airborne ? clamp(player.vy / 900, -0.5, 0.5) : 0;
        ctx.rotate(lean);

        const legSwing = player.onGround ? Math.sin(player.runCycle) * 10 : 6;
        ctx.strokeStyle = "#2a2140";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-3, PLAYER_H / 2 - 10);
        ctx.lineTo(-3 + legSwing, PLAYER_H / 2 + 10);
        ctx.moveTo(3, PLAYER_H / 2 - 10);
        ctx.lineTo(3 - legSwing, PLAYER_H / 2 + 10);
        ctx.stroke();

        const armSwing = player.onGround ? Math.sin(player.runCycle + Math.PI) * 8 : -6;
        ctx.beginPath();
        ctx.moveTo(0, -PLAYER_H / 2 + 16);
        ctx.lineTo(armSwing, -PLAYER_H / 2 + 30);
        ctx.stroke();

        const squish = player.charging ? 0.8 : 1;
        ctx.fillStyle = "#ffcf4d";
        ctx.beginPath();
        ctx.roundRect(-PLAYER_W / 2 + 3, (-PLAYER_H / 2 + 12) * squish, PLAYER_W - 6, (PLAYER_H - 20) * squish, 6);
        ctx.fill();

        ctx.fillStyle = "#f4c9a0";
        ctx.beginPath();
        ctx.arc(2, -PLAYER_H / 2 + 6, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (player.charging) {
            const fraction = clamp((performance.now() - player.chargeStart) / (JUMP_CHARGE_TIME * 1000), 0, 1);
            const barW = 30;
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(cx - barW / 2, player.y - 14, barW, 5);
            ctx.fillStyle = "#3ec6ff";
            ctx.fillRect(cx - barW / 2, player.y - 14, barW * fraction, 5);
        }
    }

    function render() {
        drawSky();
        drawParallax();
        drawRooftops();
        drawPlayer();
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

    resetGame();
    render();
})();

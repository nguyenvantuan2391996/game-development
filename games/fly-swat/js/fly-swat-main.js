(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudTime = document.getElementById("hud-time");
    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let state = "ready";
    let score = 0;
    let elapsedMs = 0;
    let spawnTimer = 0;
    let insects = [];
    let particles = [];
    let floatingTexts = [];
    let lastTime = 0;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function dist(ax, ay, bx, by) {
        return Math.hypot(ax - bx, ay - by);
    }

    function pickInsectType() {
        const entries = Object.entries(INSECT_TYPES);
        const total = entries.reduce((sum, [, def]) => sum + def.weight, 0);
        let roll = Math.random() * total;
        for (const [key, def] of entries) {
            if (roll < def.weight) return key;
            roll -= def.weight;
        }
        return "normal";
    }

    function spawnInsect() {
        const typeKey = pickInsectType();
        const def = INSECT_TYPES[typeKey];
        const angle = Math.random() * Math.PI * 2;
        const speed = randomBetween(def.speedMin, def.speedMax);
        insects.push({
            typeKey,
            def,
            x: randomBetween(def.radius + 10, GAME_WIDTH - def.radius - 10),
            y: randomBetween(def.radius + 40, GAME_HEIGHT - def.radius - 10),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: def.radius,
            turnTimer: randomBetween(TURN_INTERVAL_MIN_MS, TURN_INTERVAL_MAX_MS),
            wingPhase: Math.random() * 10,
            bornAt: performance.now(),
            alive: true,
        });
    }

    function spawnParticles(x, y, color) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randomBetween(40, 160);
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: PARTICLE_LIFE_MS,
                maxLife: PARTICLE_LIFE_MS,
                color,
            });
        }
    }

    function spawnFloatingText(x, y, text, color) {
        floatingTexts.push({ x, y, text, color, life: FLOATING_TEXT_LIFE_MS, maxLife: FLOATING_TEXT_LIFE_MS });
    }

    function killInsect(insect) {
        insect.alive = false;
        score = Math.max(0, score + insect.def.score);
        const label = insect.def.score >= 0 ? `+${insect.def.score}` : `${insect.def.score}`;
        const textColor = insect.def.score >= 0 ? "#4dff88" : "#ff5252";
        spawnParticles(insect.x, insect.y, insect.def.color);
        spawnFloatingText(insect.x, insect.y, label, textColor);
    }

    function canvasPosFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    canvas.addEventListener("pointerdown", (e) => {
        if (state === "ready" || state === "gameover") {
            startGame();
            return;
        }
        const pos = canvasPosFromEvent(e);
        for (let i = insects.length - 1; i >= 0; i--) {
            const insect = insects[i];
            if (dist(pos.x, pos.y, insect.x, insect.y) <= insect.radius + CLICK_TOLERANCE) {
                killInsect(insect);
                break;
            }
        }
    });

    overlayBtn.addEventListener("click", startGame);

    function startGame() {
        state = "playing";
        score = 0;
        elapsedMs = 0;
        spawnTimer = 300;
        insects = [];
        particles = [];
        floatingTexts = [];
        overlay.hidden = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function triggerGameOver() {
        state = "gameover";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        showOverlay("Time's Up!", `Your score: ${score}. Press to play again.`, "Play Again");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function updateWorld(dt, dtMs) {
        elapsedMs += dtMs;
        if (elapsedMs >= ROUND_TIME_MS) {
            elapsedMs = ROUND_TIME_MS;
            triggerGameOver();
            return;
        }

        const progress = Math.min(1, elapsedMs / ROUND_TIME_MS);
        spawnTimer -= dtMs;
        if (spawnTimer <= 0) {
            spawnInsect();
            const min = lerp(SPAWN_MIN_MS_START, SPAWN_MIN_MS_END, progress);
            const max = lerp(SPAWN_MAX_MS_START, SPAWN_MAX_MS_END, progress);
            spawnTimer = randomBetween(min, max);
        }

        const now = performance.now();
        insects.forEach((insect) => {
            insect.x += insect.vx * dt;
            insect.y += insect.vy * dt;
            insect.wingPhase += dt * 14;

            if (insect.x - insect.radius < 0) {
                insect.x = insect.radius;
                insect.vx = Math.abs(insect.vx);
            } else if (insect.x + insect.radius > GAME_WIDTH) {
                insect.x = GAME_WIDTH - insect.radius;
                insect.vx = -Math.abs(insect.vx);
            }
            if (insect.y - insect.radius < 40) {
                insect.y = 40 + insect.radius;
                insect.vy = Math.abs(insect.vy);
            } else if (insect.y + insect.radius > GAME_HEIGHT) {
                insect.y = GAME_HEIGHT - insect.radius;
                insect.vy = -Math.abs(insect.vy);
            }

            insect.turnTimer -= dtMs;
            if (insect.turnTimer <= 0) {
                const speed = Math.hypot(insect.vx, insect.vy);
                const angle = Math.random() * Math.PI * 2;
                insect.vx = Math.cos(angle) * speed;
                insect.vy = Math.sin(angle) * speed;
                insect.turnTimer = randomBetween(TURN_INTERVAL_MIN_MS, TURN_INTERVAL_MAX_MS);
            }

            if (insect.def.lifespanMs && now - insect.bornAt > insect.def.lifespanMs) {
                insect.alive = false;
            }
        });
        insects = insects.filter((i) => i.alive);

        particles.forEach((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 220 * dt;
            p.life -= dtMs;
        });
        particles = particles.filter((p) => p.life > 0);

        floatingTexts.forEach((t) => {
            t.y -= 35 * dt;
            t.life -= dtMs;
        });
        floatingTexts = floatingTexts.filter((t) => t.life > 0);
    }

    function drawInsect(insect) {
        const flap = Math.sin(insect.wingPhase) * 0.5 + 0.5;
        ctx.save();
        ctx.translate(insect.x, insect.y);
        const heading = Math.atan2(insect.vy, insect.vx);
        ctx.rotate(heading);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(-2, -insect.radius * 0.5 * (0.4 + flap * 0.6), insect.radius * 0.9, insect.radius * 0.45, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-2, insect.radius * 0.5 * (0.4 + flap * 0.6), insect.radius * 0.9, insect.radius * 0.45, -0.3, 0, Math.PI * 2);
        ctx.fill();

        if (insect.typeKey === "wasp") {
            ctx.fillStyle = "#ffb300";
            ctx.beginPath();
            ctx.ellipse(0, 0, insect.radius, insect.radius * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#1a1a1a";
            for (let i = -1; i <= 1; i++) {
                ctx.fillRect(i * insect.radius * 0.4 - 1.5, -insect.radius * 0.65, 3, insect.radius * 1.3);
            }
        } else if (insect.typeKey === "golden") {
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, insect.radius);
            grad.addColorStop(0, "#fff3b0");
            grad.addColorStop(1, "#ffb300");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, insect.radius, insect.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = insect.def.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, insect.radius, insect.radius * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#ff3d3d";
        ctx.beginPath();
        ctx.arc(insect.radius * 0.65, -insect.radius * 0.2, 1.8, 0, Math.PI * 2);
        ctx.arc(insect.radius * 0.65, insect.radius * 0.2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function render() {
        const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        bg.addColorStop(0, "#0f1a10");
        bg.addColorStop(1, "#050a06");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(120,255,150,0.06)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
            const gy = (GAME_HEIGHT / 6) * i;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(GAME_WIDTH, gy);
            ctx.stroke();
        }

        insects.forEach(drawInsect);

        particles.forEach((p) => {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        floatingTexts.forEach((t) => {
            const alpha = Math.max(0, t.life / t.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.color;
            ctx.font = "bold 16px 'Poppins', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1;
        });
    }

    function updateHud() {
        const remaining = Math.max(0, ROUND_TIME_MS - elapsedMs);
        hudTime.textContent = Math.ceil(remaining / 1000);
        hudScore.textContent = score;
        hudBest.textContent = best;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        updateWorld(dt, dt * 1000);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    render();
})();

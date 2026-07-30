(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudPlayerScore = document.getElementById("hud-player-score");
    const hudCpuScore = document.getElementById("hud-cpu-score");
    const hudTurn = document.getElementById("hud-turn");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");
    const powerSlider = document.getElementById("power-slider");
    const powerLabel = document.getElementById("power-label");
    const shootBtn = document.getElementById("shoot-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;

    const center = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
    const playMin = BOARD_PADDING;
    const playMaxX = GAME_WIDTH - BOARD_PADDING;
    const playMaxY = GAME_HEIGHT - BOARD_PADDING;
    const pockets = [
        { x: BOARD_PADDING, y: BOARD_PADDING },
        { x: GAME_WIDTH - BOARD_PADDING, y: BOARD_PADDING },
        { x: BOARD_PADDING, y: GAME_HEIGHT - BOARD_PADDING },
        { x: GAME_WIDTH - BOARD_PADDING, y: GAME_HEIGHT - BOARD_PADDING },
    ];
    const playerBaseline = { x: center.x, y: playMaxY - 40 };
    const cpuBaseline = { x: center.x, y: playMin + 40 };

    let state = "ready";
    let turn = "player";
    let phase = "aim";
    let playerScore = 0;
    let cpuScore = 0;
    let coins = [];
    let striker = null;
    let pottedThisTurn = [];
    let cpuTimer = 0;
    let lastTime = 0;

    let isDragging = false;
    let dragPos = { x: 0, y: 0 };

    // Aiming is decoupled from firing: dragging the striker (or the power
    // slider) only updates the locked-in aim/power; the shot only actually
    // fires when the "Bắn" button is pressed. This gives touch players a
    // second, more forgiving chance to fine-tune power before committing,
    // instead of having to nail direction+power in one continuous drag.
    let aimReady = false;
    let aimDirX = 0;
    let aimDirY = -1;
    let shotPower = 0.5;

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function createCoins() {
        const list = [];
        list.push({ id: "queen", color: "red", radius: QUEEN_RADIUS, x: center.x, y: center.y, vx: 0, vy: 0, active: true });

        const ring1Radius = COIN_RADIUS * 2.3;
        const ring2Radius = COIN_RADIUS * 4.6;
        const combined = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            combined.push({ x: center.x + Math.cos(angle) * ring1Radius, y: center.y + Math.sin(angle) * ring1Radius });
        }
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI / 6) * i - Math.PI / 2 + Math.PI / 12;
            combined.push({ x: center.x + Math.cos(angle) * ring2Radius, y: center.y + Math.sin(angle) * ring2Radius });
        }
        combined.forEach((pos, i) => {
            list.push({
                id: `coin-${i}`,
                color: i % 2 === 0 ? "white" : "black",
                radius: COIN_RADIUS,
                x: pos.x,
                y: pos.y,
                vx: 0,
                vy: 0,
                active: true,
            });
        });
        return list;
    }

    function resetStrikerForTurn() {
        const base = turn === "player" ? playerBaseline : cpuBaseline;
        striker = { id: "striker", color: "cream", radius: STRIKER_RADIUS, x: base.x, y: base.y, vx: 0, vy: 0, active: true };
        aimReady = false;
        updateShootControls();
    }

    function updateShootControls() {
        const canAim = state === "playing" && turn === "player" && phase === "aim" && !!striker;
        powerSlider.disabled = !canAim;
        shootBtn.disabled = !(canAim && aimReady);
    }

    function allPieces() {
        return striker ? coins.concat([striker]) : coins.slice();
    }

    function speedOf(p) {
        return Math.hypot(p.vx, p.vy);
    }

    function applyFriction(p, dt) {
        const speed = speedOf(p);
        if (speed <= 0) return;
        const newSpeed = Math.max(0, speed - FRICTION_DECEL * dt);
        const scale = speed > 0 ? newSpeed / speed : 0;
        p.vx *= scale;
        p.vy *= scale;
    }

    function handlePocketsAndWalls(p) {
        for (const pocket of pockets) {
            if (dist(p, pocket) < POCKET_RADIUS - p.radius * 0.35) {
                p.active = false;
                p.pocketed = true;
                return;
            }
        }
        if (p.x - p.radius < playMin) {
            p.x = playMin + p.radius;
            p.vx = Math.abs(p.vx) * WALL_RESTITUTION;
        } else if (p.x + p.radius > playMaxX) {
            p.x = playMaxX - p.radius;
            p.vx = -Math.abs(p.vx) * WALL_RESTITUTION;
        }
        if (p.y - p.radius < playMin) {
            p.y = playMin + p.radius;
            p.vy = Math.abs(p.vy) * WALL_RESTITUTION;
        } else if (p.y + p.radius > playMaxY) {
            p.y = playMaxY - p.radius;
            p.vy = -Math.abs(p.vy) * WALL_RESTITUTION;
        }
    }

    function resolveCollision(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const minDist = a.radius + b.radius;
        if (distance >= minDist) return;

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDist - distance;
        const massA = a.radius * a.radius;
        const massB = b.radius * b.radius;
        const totalMass = massA + massB;

        a.x -= nx * overlap * (massB / totalMass);
        a.y -= ny * overlap * (massB / totalMass);
        b.x += nx * overlap * (massA / totalMass);
        b.y += ny * overlap * (massA / totalMass);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal > 0) return;

        const impulse = (-(1 + PIECE_RESTITUTION) * velAlongNormal) / (1 / massA + 1 / massB);
        const ix = impulse * nx;
        const iy = impulse * ny;
        a.vx -= ix / massA;
        a.vy -= iy / massA;
        b.vx += ix / massB;
        b.vy += iy / massB;
    }

    function updatePhysics(dt) {
        const pieces = allPieces().filter((p) => p.active);
        pieces.forEach((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            applyFriction(p, dt);
            if (speedOf(p) < MIN_VELOCITY) {
                p.vx = 0;
                p.vy = 0;
            }
        });

        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                resolveCollision(pieces[i], pieces[j]);
            }
        }

        pieces.forEach((p) => {
            const wasActive = p.active;
            handlePocketsAndWalls(p);
            if (wasActive && !p.active) {
                onPiecePocketed(p);
            }
        });
    }

    function onPiecePocketed(p) {
        if (p.id === "striker") {
            pottedThisTurn.push({ id: "striker", color: "cream", foul: true });
            return;
        }
        pottedThisTurn.push({ id: p.id, color: p.color });
        const points = p.color === "red" ? QUEEN_SCORE : COIN_SCORE;
        if (turn === "player") playerScore += points;
        else cpuScore += points;
    }

    function allSettled() {
        return allPieces().every((p) => !p.active || speedOf(p) === 0);
    }

    function resolveTurnEnd() {
        const foul = pottedThisTurn.some((p) => p.foul);
        const ownColor = turn === "player" ? PLAYER_COLOR : CPU_COLOR;
        const gotOwnOrQueen = pottedThisTurn.some((p) => !p.foul && (p.color === ownColor || p.color === "red"));

        coins = coins.filter((c) => c.active);

        if (coins.length === 0) {
            finishGame();
            return;
        }

        if (foul) {
            turn = turn === "player" ? "cpu" : "player";
        } else if (!gotOwnOrQueen) {
            turn = turn === "player" ? "cpu" : "player";
        }

        pottedThisTurn = [];
        resetStrikerForTurn();
        phase = turn === "player" ? "aim" : "cpu-wait";
        cpuTimer = CPU_THINK_DELAY_MS;
        updateHud();
    }

    function finishGame() {
        state = "gameover";
        aimReady = false;
        updateShootControls();
        const totalBest = Math.max(playerScore, best);
        if (totalBest > best) {
            best = totalBest;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        let resultText;
        if (playerScore > cpuScore) resultText = "Bạn đã thắng!";
        else if (playerScore < cpuScore) resultText = "Máy đã thắng!";
        else resultText = "Hòa!";
        showOverlay("Kết thúc ván!", `${resultText} Bạn: ${playerScore} - Máy: ${cpuScore}. Nhấn để chơi lại.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function startGame() {
        state = "playing";
        turn = "player";
        phase = "aim";
        playerScore = 0;
        cpuScore = 0;
        coins = createCoins();
        pottedThisTurn = [];
        resetStrikerForTurn();
        overlay.hidden = true;
        lastTime = performance.now();
        updateHud();
        requestAnimationFrame(loop);
    }

    function performCpuShot() {
        const blackCoins = coins.filter((c) => c.active && c.color === CPU_COLOR);
        const candidates = blackCoins.length > 0 ? blackCoins : coins.filter((c) => c.active);
        if (candidates.length === 0 || !striker) return;

        let best = null;
        let bestDist = Infinity;
        candidates.forEach((c) => {
            pockets.forEach((pocket) => {
                const d = dist(c, pocket);
                if (d < bestDist) {
                    bestDist = d;
                    best = { coin: c, pocket };
                }
            });
        });
        if (!best) return;

        const toPocketX = best.pocket.x - best.coin.x;
        const toPocketY = best.pocket.y - best.coin.y;
        const toPocketLen = Math.hypot(toPocketX, toPocketY) || 1;
        const nx = toPocketX / toPocketLen;
        const ny = toPocketY / toPocketLen;
        const ghostX = best.coin.x - nx * (STRIKER_RADIUS + best.coin.radius);
        const ghostY = best.coin.y - ny * (STRIKER_RADIUS + best.coin.radius);

        let dirX = ghostX - striker.x;
        let dirY = ghostY - striker.y;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        dirX /= dirLen;
        dirY /= dirLen;

        const error = randomBetween(-CPU_AIM_ERROR, CPU_AIM_ERROR);
        const cos = Math.cos(error);
        const sin = Math.sin(error);
        const rotX = dirX * cos - dirY * sin;
        const rotY = dirX * sin + dirY * cos;

        const speed = randomBetween(MAX_SHOT_SPEED * 0.55, MAX_SHOT_SPEED * 0.92);
        striker.vx = rotX * speed;
        striker.vy = rotY * speed;
        pottedThisTurn = [];
        phase = "moving";
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
        if (turn !== "player" || phase !== "aim" || !striker) return;
        const pos = canvasPosFromEvent(e);
        if (dist(pos, striker) < 60) {
            isDragging = true;
            dragPos = pos;
        }
    });

    window.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        dragPos = canvasPosFromEvent(e);
    });

    window.addEventListener("pointerup", () => {
        if (!isDragging) return;
        isDragging = false;
        if (!striker) return;

        const dx = dragPos.x - striker.x;
        const dy = dragPos.y - striker.y;
        const pullLen = Math.hypot(dx, dy);
        if (pullLen < 4) return;

        const pullDist = Math.min(MAX_PULL_DISTANCE, pullLen);
        shotPower = pullDist / MAX_PULL_DISTANCE;
        aimDirX = -dx / pullLen;
        aimDirY = -dy / pullLen;
        aimReady = true;

        powerSlider.value = String(Math.round(shotPower * 100));
        updatePowerLabel();
        updateShootControls();
    });

    function updatePowerLabel() {
        powerLabel.textContent = Math.round(shotPower * 100) + "%";
    }

    function fireShot() {
        if (state !== "playing" || turn !== "player" || phase !== "aim" || !striker || !aimReady) return;

        const speed = MIN_SHOT_SPEED + shotPower * (MAX_SHOT_SPEED - MIN_SHOT_SPEED);
        striker.vx = aimDirX * speed;
        striker.vy = aimDirY * speed;
        pottedThisTurn = [];
        phase = "moving";
        aimReady = false;
        updateShootControls();
    }

    powerSlider.addEventListener("input", () => {
        shotPower = Number(powerSlider.value) / 100;
        updatePowerLabel();
    });

    shootBtn.addEventListener("click", fireShot);

    overlayBtn.addEventListener("click", startGame);

    function drawBoard() {
        const bgGrad = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
        bgGrad.addColorStop(0, "#8a5a2b");
        bgGrad.addColorStop(1, "#5c3a1a");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const innerGrad = ctx.createLinearGradient(playMin, playMin, playMaxX, playMaxY);
        innerGrad.addColorStop(0, "#e8c48a");
        innerGrad.addColorStop(1, "#d1a566");
        ctx.fillStyle = innerGrad;
        ctx.fillRect(playMin, playMin, playMaxX - playMin, playMaxY - playMin);

        ctx.strokeStyle = "rgba(92,58,26,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(playMin, playMin, playMaxX - playMin, playMaxY - playMin);

        ctx.beginPath();
        ctx.arc(center.x, center.y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(92,58,26,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        [playerBaseline, cpuBaseline].forEach((base) => {
            ctx.beginPath();
            ctx.moveTo(base.x - 55, base.y);
            ctx.lineTo(base.x + 55, base.y);
            ctx.strokeStyle = "rgba(92,58,26,0.5)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        pockets.forEach((pocket) => {
            const grad = ctx.createRadialGradient(pocket.x, pocket.y, 2, pocket.x, pocket.y, POCKET_RADIUS);
            grad.addColorStop(0, "#1a1008");
            grad.addColorStop(1, "#000000");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawPiece(p) {
        if (!p.active) return;
        let fillA;
        let fillB;
        let ringColor = "rgba(0,0,0,0.3)";
        if (p.color === "white") {
            fillA = "#fffdf5";
            fillB = "#d8d0bd";
        } else if (p.color === "black") {
            fillA = "#4a4a4a";
            fillB = "#101010";
            ringColor = "rgba(255,255,255,0.15)";
        } else if (p.color === "red") {
            fillA = "#ff6b6b";
            fillB = "#c0392b";
            ringColor = "rgba(255,255,255,0.5)";
        } else {
            fillA = "#ffffff";
            fillB = "#bcd4ff";
            ringColor = "rgba(30,90,200,0.6)";
        }
        const grad = ctx.createRadialGradient(p.x - p.radius * 0.3, p.y - p.radius * 0.3, 1, p.x, p.y, p.radius);
        grad.addColorStop(0, fillA);
        grad.addColorStop(1, fillB);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function drawAimLine() {
        if (!striker) return;

        let shotDirX;
        let shotDirY;
        let power;
        let handleX;
        let handleY;

        if (isDragging) {
            const dx = dragPos.x - striker.x;
            const dy = dragPos.y - striker.y;
            const pullLen = Math.min(MAX_PULL_DISTANCE, Math.hypot(dx, dy));
            const dirLen = Math.hypot(dx, dy) || 1;
            power = pullLen / MAX_PULL_DISTANCE;
            shotDirX = -dx / dirLen;
            shotDirY = -dy / dirLen;
            handleX = striker.x - dx * (pullLen / dirLen);
            handleY = striker.y - dy * (pullLen / dirLen);
        } else if (aimReady) {
            shotDirX = aimDirX;
            shotDirY = aimDirY;
            power = shotPower;
            handleX = striker.x - shotDirX * shotPower * MAX_PULL_DISTANCE;
            handleY = striker.y - shotDirY * shotPower * MAX_PULL_DISTANCE;
        } else {
            return;
        }

        const color = power < 0.4 ? "#4dff88" : power < 0.75 ? "#ffe14d" : "#ff5252";

        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(striker.x + shotDirX * (40 + power * 120), striker.y + shotDirY * (40 + power * 120));
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    function render() {
        drawBoard();
        coins.forEach(drawPiece);
        if (striker) drawPiece(striker);
        drawAimLine();
    }

    function updateHud() {
        hudPlayerScore.textContent = playerScore;
        hudCpuScore.textContent = cpuScore;
        if (state === "gameover") {
            hudTurn.textContent = "--";
        } else {
            hudTurn.textContent = turn === "player" ? "Bạn" : "Máy";
        }
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        updatePhysics(dt);

        if (phase === "moving" && allSettled()) {
            resolveTurnEnd();
        } else if (phase === "cpu-wait") {
            cpuTimer -= dt * 1000;
            if (cpuTimer <= 0) {
                performCpuShot();
            }
        }

        render();
        requestAnimationFrame(loop);
    }

    coins = createCoins();
    updateShootControls();
    render();
})();

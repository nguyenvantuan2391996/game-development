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
    let stack = [];
    let current = null;
    let camera = { row: 0, target: 0 };
    let score = 0;
    let combo = 0;
    let debris = [];
    let popText = null;

    function colorForRow(row) {
        const hue = (18 + row * 13) % 360;
        return `hsl(${hue}, 72%, 58%)`;
    }

    function rowSpeed(row) {
        return Math.min(MAX_SPEED, BASE_SPEED + row * SPEED_INCREMENT_PER_ROW);
    }

    function spawnMovingBlock() {
        const row = stack.length;
        const prev = stack[stack.length - 1];
        current = {
            row,
            x: 0,
            width: prev.width,
            dir: 1,
            speed: rowSpeed(row),
            color: colorForRow(row),
        };
    }

    function resetGame() {
        stack = [{ row: 0, x: (GAME_WIDTH - INITIAL_BLOCK_WIDTH) / 2, width: INITIAL_BLOCK_WIDTH, color: colorForRow(0) }];
        camera = { row: 0, target: 0 };
        score = 0;
        combo = 0;
        debris = [];
        popText = null;
        spawnMovingBlock();
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        updateHud();
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function drop() {
        if (state !== "playing") {
            startGame();
            return;
        }
        const prev = stack[stack.length - 1];
        const overlapLeft = Math.max(current.x, prev.x);
        const overlapRight = Math.min(current.x + current.width, prev.x + prev.width);
        const overlapWidth = overlapRight - overlapLeft;

        if (overlapWidth <= MIN_OVERLAP) {
            spillDebris(current.x, current.row, current.width, current.dir);
            die();
            return;
        }

        const isPerfect = current.width - overlapWidth <= PERFECT_TOLERANCE;
        let finalX = overlapLeft;
        let finalWidth = overlapWidth;
        if (isPerfect) {
            finalX = prev.x;
            finalWidth = prev.width;
            combo += 1;
            popText = { text: combo > 1 ? `PERFECT x${combo}` : "PERFECT", row: current.row, life: 0.8 };
        } else {
            combo = 0;
            if (current.x < overlapLeft) {
                spillDebris(current.x, current.row, overlapLeft - current.x, -1);
            }
            const rightLeftover = current.x + current.width - overlapRight;
            if (rightLeftover > 0) {
                spillDebris(overlapRight, current.row, rightLeftover, 1);
            }
        }

        stack.push({ row: current.row, x: finalX, width: finalWidth, color: current.color });
        score = stack.length - 1;
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        updateHud();
        spawnMovingBlock();
    }

    function spillDebris(x, row, width, dir) {
        debris.push({ x, row, width, vy: 0, dir });
    }

    function die() {
        state = "gameover";
        current = null;
        showOverlay("Game Over", `Bạn đã xếp được ${score} khối. Nhấn để chơi lại.`, "Chơi lại");
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

    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") {
            e.preventDefault();
            if (!e.repeat) drop();
        }
    });
    canvas.addEventListener("pointerdown", drop);
    overlayBtn.addEventListener("click", drop);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            btn.classList.add("is-pressed");
            drop();
        });
        const release = () => btn.classList.remove("is-pressed");
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    });

    function updateWorld(dt) {
        if (current) {
            current.x += current.dir * current.speed * dt;
            if (current.x <= 0) {
                current.x = 0;
                current.dir = 1;
            } else if (current.x + current.width >= GAME_WIDTH) {
                current.x = GAME_WIDTH - current.width;
                current.dir = -1;
            }
        }

        camera.target = Math.max(0, stack.length - FIXED_ROWS_BEFORE_SCROLL);
        camera.row += (camera.target - camera.row) * CAMERA_LERP;

        debris.forEach((d) => {
            d.vy += DEBRIS_GRAVITY * dt;
            d.row -= (d.vy * dt) / BLOCK_HEIGHT;
        });
        debris = debris.filter((d) => rowScreenTop(d.row) < GAME_HEIGHT + BLOCK_HEIGHT * 2);

        if (popText) {
            popText.life -= dt;
            if (popText.life <= 0) popText = null;
        }
    }

    function rowScreenTop(row) {
        return GAME_HEIGHT - BLOCK_HEIGHT - (row - camera.row) * BLOCK_HEIGHT;
    }

    function drawBlock(x, y, width, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, BLOCK_HEIGHT - 2);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(x, y, width, 5);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(x, y + BLOCK_HEIGHT - 7, width, 5);
    }

    function render() {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        stack.forEach((b) => {
            const y = rowScreenTop(b.row);
            if (y < -BLOCK_HEIGHT || y > GAME_HEIGHT + BLOCK_HEIGHT) return;
            drawBlock(b.x, y, b.width, b.color);
        });

        debris.forEach((d) => {
            const y = rowScreenTop(d.row);
            ctx.globalAlpha = 0.85;
            drawBlock(d.x, y, d.width, "#5c5480");
            ctx.globalAlpha = 1;
        });

        if (current) {
            const y = rowScreenTop(current.row);
            drawBlock(current.x, y, current.width, current.color);
        }

        if (popText) {
            const y = rowScreenTop(popText.row) - 14;
            ctx.globalAlpha = Math.min(1, popText.life / 0.4);
            ctx.fillStyle = "#ffcf4d";
            ctx.font = "800 18px Poppins, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(popText.text, GAME_WIDTH / 2, y);
            ctx.globalAlpha = 1;
        }
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
        render();

        requestAnimationFrame(loop);
    }

    resetGame();
    render();
})();

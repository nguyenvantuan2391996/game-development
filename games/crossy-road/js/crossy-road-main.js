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
    let rows = new Map();
    let lastTypes = [];
    let player, camera, elapsed, score;

    function weightedType() {
        if (lastTypes.slice(-2).every((t) => t !== "grass")) return "grass";
        const total = ROW_TYPE_WEIGHTS.reduce((s, r) => s + r.weight, 0);
        let roll = Math.random() * total;
        for (const r of ROW_TYPE_WEIGHTS) {
            if (roll < r.weight) return r.type;
            roll -= r.weight;
        }
        return "grass";
    }

    function getRow(rowIndex) {
        if (rows.has(rowIndex)) return rows.get(rowIndex);
        let type = rowIndex < SAFE_START_ROWS ? "grass" : weightedType();
        lastTypes.push(type);
        if (lastTypes.length > 6) lastTypes.shift();

        const dir = Math.random() < 0.5 ? 1 : -1;
        const row = { type, dir };

        if (type === "road") {
            row.speed = CAR_SPEED_MIN + Math.random() * (CAR_SPEED_MAX - CAR_SPEED_MIN);
            row.gap = CAR_GAP_MIN + Math.random() * (CAR_GAP_MAX - CAR_GAP_MIN);
            row.phase = Math.random() * row.gap;
        } else if (type === "water") {
            row.speed = LOG_SPEED_MIN + Math.random() * (LOG_SPEED_MAX - LOG_SPEED_MIN);
            row.gap = LOG_GAP_MIN + Math.random() * (LOG_GAP_MAX - LOG_GAP_MIN);
            row.phase = Math.random() * row.gap;
        } else if (type === "grass" && rowIndex >= SAFE_START_ROWS && Math.random() < 0.35) {
            row.decorCol = Math.floor(Math.random() * COLS);
        }

        rows.set(rowIndex, row);
        return row;
    }

    function laneItemCenters(row, itemWidth) {
        const travel = row.dir * row.speed * elapsed;
        let pos = (((row.phase + travel) % row.gap) + row.gap) % row.gap;
        const items = [];
        for (let x = pos - row.gap; x < GAME_WIDTH + itemWidth; x += row.gap) {
            items.push(x + itemWidth / 2);
        }
        return items;
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function resetGame() {
        rows = new Map();
        lastTypes = [];
        elapsed = 0;
        score = 0;
        player = {
            col: Math.floor(COLS / 2),
            row: 0,
            fromCol: Math.floor(COLS / 2),
            fromRow: 0,
            toCol: Math.floor(COLS / 2),
            toRow: 0,
            animStart: 0,
            offsetX: 0,
            alive: true,
        };
        camera = { row: 0, target: 0 };
        for (let i = 0; i < SAFE_START_ROWS + LOOKAHEAD_ROWS + 2; i++) getRow(i);
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        updateHud();
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function isAnimating() {
        return performance.now() - player.animStart < MOVE_ANIM_MS;
    }

    function movePlayer(dCol, dRow) {
        if (state !== "playing" || isAnimating()) return;
        const newCol = Math.max(0, Math.min(COLS - 1, player.col + dCol));
        const newRow = player.row + dRow;
        const minRow = Math.max(0, Math.ceil(camera.row));
        if (newRow < minRow || newRow < 0) return;
        if (newCol === player.col && newRow === player.row) return;

        player.fromCol = player.col;
        player.fromRow = player.row;
        player.toCol = newCol;
        player.toRow = newRow;
        player.animStart = performance.now();
        player.col = newCol;
        player.row = newRow;
        player.offsetX = 0;

        for (let i = player.row; i < player.row + LOOKAHEAD_ROWS + 2; i++) getRow(i);

        if (player.row > score) {
            score = player.row;
        }
    }

    const keys = {};
    window.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow")) e.preventDefault();
        if (state !== "playing" && (e.key === " " || e.key === "Enter")) {
            startGame();
            return;
        }
        if (e.repeat) return;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") movePlayer(0, 1);
        else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") movePlayer(0, -1);
        else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") movePlayer(-1, 0);
        else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") movePlayer(1, 0);
    });

    overlayBtn.addEventListener("click", startGame);

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            btn.classList.add("is-pressed");
            if (state !== "playing") {
                startGame();
                return;
            }
            const dir = btn.dataset.dir;
            if (dir === "ArrowUp") movePlayer(0, 1);
            else if (dir === "ArrowDown") movePlayer(0, -1);
            else if (dir === "ArrowLeft") movePlayer(-1, 0);
            else if (dir === "ArrowRight") movePlayer(1, 0);
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

    function updateCamera() {
        camera.target = Math.max(camera.target, player.row - LOOKAHEAD_ROWS);
        camera.row += (camera.target - camera.row) * CAMERA_LERP;
    }

    function updateWorld(dt) {
        elapsed += dt;
        updateCamera();

        const settled = !isAnimating();
        if (settled) {
            const row = getRow(player.row);
            const centerX = player.col * CELL + CELL / 2 + player.offsetX;

            if (row.type === "road") {
                const centers = laneItemCenters(row, CAR_WIDTH);
                for (const cx of centers) {
                    if (
                        rectsOverlap(
                            centerX - PLAYER_SIZE / 2, 0, PLAYER_SIZE, 1,
                            cx - CAR_WIDTH / 2, 0, CAR_WIDTH, 1
                        )
                    ) {
                        die("Bạn đã va vào xe!");
                        break;
                    }
                }
            } else if (row.type === "water") {
                const centers = laneItemCenters(row, LOG_WIDTH);
                let onLog = false;
                for (const cx of centers) {
                    if (Math.abs(centerX - cx) < LOG_WIDTH / 2 - PLAYER_SIZE / 4) {
                        onLog = true;
                        player.offsetX += row.dir * row.speed * dt;
                        break;
                    }
                }
                if (!onLog) {
                    die("Bạn đã rơi xuống nước!");
                } else {
                    const px = player.col * CELL + CELL / 2 + player.offsetX;
                    if (px < -CELL / 2 || px > GAME_WIDTH + CELL / 2) {
                        die("Bạn đã trôi ra khỏi màn hình!");
                    }
                }
            }
        }
    }

    function rowScreenTop(rowIndex) {
        return GAME_HEIGHT - (rowIndex - camera.row + 1) * CELL;
    }

    function drawRow(rowIndex) {
        const row = getRow(rowIndex);
        const y = rowScreenTop(rowIndex);
        let base = "#3fae4a";
        if (row.type === "road") base = "#3a3a46";
        else if (row.type === "water") base = "#2f6fb5";
        ctx.fillStyle = base;
        ctx.fillRect(0, y, GAME_WIDTH, CELL);

        if (row.type === "grass") {
            ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
            ctx.fillRect(0, y, GAME_WIDTH, CELL);
            if (row.decorCol !== undefined) {
                const cx = row.decorCol * CELL + CELL / 2;
                ctx.fillStyle = "#2c8a3a";
                ctx.beginPath();
                ctx.arc(cx, y + CELL / 2, CELL * 0.32, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (row.type === "road") {
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            for (let x = -40; x < GAME_WIDTH + 40; x += 40) {
                ctx.fillRect(((x + (elapsed * 20 * row.dir)) % (GAME_WIDTH + 80)) - 40, y + CELL / 2 - 2, 20, 4);
            }
            laneItemCenters(row, CAR_WIDTH).forEach((cx) => {
                ctx.fillStyle = "#e63946";
                ctx.fillRect(cx - CAR_WIDTH / 2, y + (CELL - CAR_HEIGHT) / 2, CAR_WIDTH, CAR_HEIGHT);
                ctx.fillStyle = "rgba(255,255,255,0.6)";
                const wDir = row.dir > 0 ? CAR_WIDTH * 0.62 : 6;
                ctx.fillRect(cx - CAR_WIDTH / 2 + wDir, y + (CELL - CAR_HEIGHT) / 2 + 5, 10, CAR_HEIGHT - 10);
            });
        } else if (row.type === "water") {
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            for (let x = 0; x < GAME_WIDTH; x += 24) {
                ctx.fillRect(((x + elapsed * 15) % GAME_WIDTH), y + 6, 12, 3);
            }
            laneItemCenters(row, LOG_WIDTH).forEach((cx) => {
                ctx.fillStyle = "#8a5a2f";
                ctx.fillRect(cx - LOG_WIDTH / 2, y + (CELL - LOG_HEIGHT) / 2, LOG_WIDTH, LOG_HEIGHT);
                ctx.strokeStyle = "rgba(0,0,0,0.25)";
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - LOG_WIDTH / 2 + 6, y + (CELL - LOG_HEIGHT) / 2 + 4, LOG_WIDTH - 12, LOG_HEIGHT - 8);
            });
        }
    }

    function drawPlayer() {
        const t = Math.min(1, (performance.now() - player.animStart) / MOVE_ANIM_MS);
        const dispCol = player.fromCol + (player.toCol - player.fromCol) * t;
        const dispRow = player.fromRow + (player.toRow - player.fromRow) * t;
        const hop = Math.sin(Math.PI * t) * 8;
        const extraX = t >= 1 ? player.offsetX : 0;

        const cx = dispCol * CELL + CELL / 2 + extraX;
        const cy = GAME_HEIGHT - (dispRow - camera.row + 1) * CELL + CELL / 2 - hop;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(0, PLAYER_SIZE / 2 + hop + 2, PLAYER_SIZE / 2.4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffcf4d";
        ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
        ctx.fillStyle = "#e63946";
        ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE * 0.3);
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(-PLAYER_SIZE / 2 + 4, -4, 6, 6);
        ctx.fillRect(PLAYER_SIZE / 2 - 10, -4, 6, 6);
        ctx.restore();
    }

    function render() {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const startRow = Math.floor(camera.row) - 1;
        const endRow = startRow + ROWS_VISIBLE + 2;
        for (let r = startRow; r <= endRow; r++) drawRow(r);

        if (state !== "ready") drawPlayer();
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

(function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudLevel = document.getElementById("hud-level");
    const hudLines = document.getElementById("hud-lines");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let state = "ready";
    let board = [];
    let current = null;
    let bag = [];
    let nextKey = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropInterval = DROP_INTERVAL_START_MS;
    let dropTimer = 0;
    let lastTime = 0;

    const keys = {};

    function createEmptyBoard() {
        const b = [];
        for (let r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(null));
        return b;
    }

    function nextFromBag() {
        if (bag.length === 0) {
            bag = Object.keys(SHAPES);
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        return bag.pop();
    }

    function matrixFromShape(key) {
        return SHAPES[key].grid.map((rowStr) => rowStr.split("").map((ch) => ch === "X"));
    }

    function rotateMatrix(m) {
        const n = m.length;
        const result = [];
        for (let i = 0; i < n; i++) result.push(new Array(n).fill(false));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                result[c][n - 1 - r] = m[r][c];
            }
        }
        return result;
    }

    function collides(matrix, row, col) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const br = row + r;
                const bc = col + c;
                if (bc < 0 || bc >= COLS || br >= ROWS) return true;
                if (br >= 0 && board[br][bc]) return true;
            }
        }
        return false;
    }

    function spawnPiece() {
        const key = nextKey;
        nextKey = nextFromBag();
        const def = SHAPES[key];
        const matrix = matrixFromShape(key);
        current = { key, color: def.color, matrix, row: 0, col: SPAWN_COL };
        if (collides(current.matrix, current.row, current.col)) {
            triggerGameOver();
        }
    }

    function tryMove(dRow, dCol) {
        if (!current) return false;
        const newRow = current.row + dRow;
        const newCol = current.col + dCol;
        if (!collides(current.matrix, newRow, newCol)) {
            current.row = newRow;
            current.col = newCol;
            return true;
        }
        return false;
    }

    function rotate() {
        if (!current) return;
        const rotated = rotateMatrix(current.matrix);
        for (const offset of WALL_KICK_OFFSETS) {
            if (!collides(rotated, current.row, current.col + offset)) {
                current.matrix = rotated;
                current.col += offset;
                return;
            }
        }
    }

    function hardDrop() {
        if (!current) return;
        let dist = 0;
        while (tryMove(1, 0)) dist++;
        score += dist * HARD_DROP_SCORE;
        lockPiece();
    }

    function softDrop(scored) {
        if (!current) return;
        if (!tryMove(1, 0)) {
            lockPiece();
        } else if (scored) {
            score += SOFT_DROP_SCORE;
        }
    }

    function lockPiece() {
        current.matrix.forEach((rowArr, r) => {
            rowArr.forEach((filled, c) => {
                if (!filled) return;
                const br = current.row + r;
                const bc = current.col + c;
                if (br >= 0 && br < ROWS) board[br][bc] = current.color;
            });
        });

        const remaining = board.filter((row) => !row.every(Boolean));
        const clearedCount = ROWS - remaining.length;
        const newRows = [];
        for (let i = 0; i < clearedCount; i++) newRows.push(new Array(COLS).fill(null));
        board = newRows.concat(remaining);

        if (clearedCount > 0) {
            score += LINE_SCORE[clearedCount] * level;
            lines += clearedCount;
            level = 1 + Math.floor(lines / LINES_PER_LEVEL);
            dropInterval = Math.max(DROP_INTERVAL_MIN_MS, DROP_INTERVAL_START_MS - (level - 1) * DROP_INTERVAL_STEP_MS);
        }

        if (state === "playing") spawnPiece();
    }

    function computeGhostRow() {
        let r = current.row;
        while (!collides(current.matrix, r + 1, current.col)) r++;
        return r;
    }

    window.addEventListener("keydown", (e) => {
        if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();

        if (state === "ready" || state === "gameover") {
            if (e.key === " " || e.key === "Enter") startGame();
            return;
        }
        if (state !== "playing") return;

        if (e.key === "ArrowLeft") tryMove(0, -1);
        else if (e.key === "ArrowRight") tryMove(0, 1);
        else if (e.key === "ArrowUp") rotate();
        else if (e.key === " ") hardDrop();

        keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        const dir = btn.dataset.dir;
        const press = (e) => {
            e.preventDefault();
            if (state === "ready" || state === "gameover") {
                startGame();
                return;
            }
            btn.classList.add("is-pressed");
            if (dir === "ArrowLeft") tryMove(0, -1);
            else if (dir === "ArrowRight") tryMove(0, 1);
            else if (dir === "ArrowDown") keys.ArrowDown = true;
        };
        const release = (e) => {
            e.preventDefault();
            btn.classList.remove("is-pressed");
            if (dir === "ArrowDown") keys.ArrowDown = false;
        };
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    });

    const rotateBtn = document.getElementById("rotate-btn");
    rotateBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        rotateBtn.classList.add("is-pressed");
        if (state === "ready" || state === "gameover") {
            startGame();
            return;
        }
        rotate();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
        rotateBtn.addEventListener(evt, (e) => {
            e.preventDefault();
            rotateBtn.classList.remove("is-pressed");
        });
    });

    overlayBtn.addEventListener("click", startGame);

    function startGame() {
        state = "playing";
        board = createEmptyBoard();
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = DROP_INTERVAL_START_MS;
        dropTimer = dropInterval;
        bag = [];
        nextKey = nextFromBag();
        spawnPiece();
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
        showOverlay("Game Over", `Điểm: ${score}. Dòng: ${lines}. Nhấn để chơi lại.`, "Chơi lại");
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function updateWorld(dtMs) {
        const effectiveInterval = keys.ArrowDown ? Math.min(dropInterval, 55) : dropInterval;
        dropTimer -= dtMs;
        if (dropTimer <= 0) {
            softDrop(!!keys.ArrowDown);
            dropTimer = effectiveInterval;
        }
    }

    function drawCell(r, c, color) {
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, 3);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 1, y + CELL_SIZE - 4, CELL_SIZE - 2, 3);
    }

    function render() {
        ctx.fillStyle = "#0b0e14";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL_SIZE, 0);
            ctx.lineTo(c * CELL_SIZE, GAME_HEIGHT);
            ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL_SIZE);
            ctx.lineTo(GAME_WIDTH, r * CELL_SIZE);
            ctx.stroke();
        }

        board.forEach((rowArr, r) => {
            rowArr.forEach((color, c) => {
                if (color) drawCell(r, c, color);
            });
        });

        if (current) {
            const ghostRow = computeGhostRow();
            current.matrix.forEach((rowArr, r) => {
                rowArr.forEach((filled, c) => {
                    if (!filled) return;
                    const br = ghostRow + r;
                    const bc = current.col + c;
                    if (br < 0) return;
                    ctx.strokeStyle = current.color;
                    ctx.globalAlpha = 0.35;
                    ctx.strokeRect(bc * CELL_SIZE + 2, br * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                    ctx.globalAlpha = 1;
                });
            });

            current.matrix.forEach((rowArr, r) => {
                rowArr.forEach((filled, c) => {
                    if (!filled) return;
                    const br = current.row + r;
                    const bc = current.col + c;
                    if (br < 0) return;
                    drawCell(br, bc, current.color);
                });
            });
        }

        if (nextKey) {
            const boxSize = CELL_SIZE * 4.4;
            const boxX = GAME_WIDTH - boxSize - 8;
            const boxY = 8;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(boxX, boxY, boxSize, boxSize);
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.strokeRect(boxX, boxY, boxSize, boxSize);
            const previewMatrix = matrixFromShape(nextKey);
            const previewColor = SHAPES[nextKey].color;
            const previewCell = CELL_SIZE * 0.8;
            previewMatrix.forEach((rowArr, r) => {
                rowArr.forEach((filled, c) => {
                    if (!filled) return;
                    ctx.fillStyle = previewColor;
                    ctx.fillRect(boxX + 6 + c * previewCell, boxY + 6 + r * previewCell, previewCell - 2, previewCell - 2);
                });
            });
        }
    }

    function updateHud() {
        hudScore.textContent = score;
        hudBest.textContent = best;
        hudLevel.textContent = level;
        hudLines.textContent = lines;
    }

    function loop(now) {
        if (state !== "playing") {
            render();
            return;
        }

        const dtMs = Math.min(now - lastTime, 48);
        lastTime = now;

        updateWorld(dtMs);
        updateHud();
        render();

        requestAnimationFrame(loop);
    }

    board = createEmptyBoard();
    render();
})();

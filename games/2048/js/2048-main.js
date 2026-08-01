(function () {
    const boardEl = document.getElementById("board");
    const bgEl = document.getElementById("board-bg");
    const tilesEl = document.getElementById("tiles");
    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");
    const btnRestart = document.getElementById("btn-restart");

    let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    hudBest.textContent = best;

    let grid = [];
    let tiles = new Map();
    let nextId = 1;
    let score = 0;
    let state = "ready";
    let wonShown = false;
    let cellMetrics = [];

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement("div");
        cell.className = "board-cell";
        bgEl.appendChild(cell);
    }
    const bgCells = Array.from(bgEl.children);

    function measureCells() {
        cellMetrics = bgCells.map((el) => ({
            left: el.offsetLeft,
            top: el.offsetTop,
            size: el.offsetWidth,
        }));
    }

    function emptyGrid() {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    }

    function createTile(r, c, value) {
        const tile = { id: nextId++, r, c, value, merged: false, isNew: true };
        tiles.set(tile.id, tile);
        grid[r][c] = tile;
        return tile;
    }

    function randomEmptyCell() {
        const empties = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!grid[r][c]) empties.push({ r, c });
            }
        }
        if (empties.length === 0) return null;
        return empties[Math.floor(Math.random() * empties.length)];
    }

    function spawnRandomTile() {
        const cell = randomEmptyCell();
        if (!cell) return;
        const value = Math.random() < NEW_TILE_FOUR_CHANCE ? 4 : 2;
        createTile(cell.r, cell.c, value);
    }

    function resetGame() {
        grid = emptyGrid();
        tiles = new Map();
        nextId = 1;
        score = 0;
        wonShown = false;
        tilesEl.innerHTML = "";
        spawnRandomTile();
        spawnRandomTile();
        updateHud();
    }

    function startGame() {
        resetGame();
        state = "playing";
        overlay.hidden = true;
        render(true);
    }

    function getLines(direction) {
        const lines = [];
        if (direction === "left" || direction === "right") {
            for (let r = 0; r < GRID_SIZE; r++) {
                const cells = [];
                for (let i = 0; i < GRID_SIZE; i++) {
                    const c = direction === "left" ? i : GRID_SIZE - 1 - i;
                    cells.push({ r, c });
                }
                lines.push(cells);
            }
        } else {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cells = [];
                for (let i = 0; i < GRID_SIZE; i++) {
                    const r = direction === "up" ? i : GRID_SIZE - 1 - i;
                    cells.push({ r, c });
                }
                lines.push(cells);
            }
        }
        return lines;
    }

    function move(direction) {
        if (state !== "playing") return;
        const lines = getLines(direction);
        let moved = false;
        let scoreGained = 0;
        const removed = [];

        tiles.forEach((t) => {
            t.merged = false;
            t.isNew = false;
        });

        lines.forEach((cells) => {
            const lineTiles = cells.map((cell) => grid[cell.r][cell.c]).filter((t) => t);
            const result = [];
            for (const t of lineTiles) {
                const last = result[result.length - 1];
                if (last && last.value === t.value && !last.merged) {
                    last.value *= 2;
                    last.merged = true;
                    scoreGained += last.value;
                    t.mergedInto = last.id;
                    removed.push(t);
                } else {
                    result.push(t);
                }
            }
            cells.forEach((cell, idx) => {
                if (idx < result.length) {
                    const t = result[idx];
                    if (t.r !== cell.r || t.c !== cell.c) moved = true;
                    t.r = cell.r;
                    t.c = cell.c;
                    grid[cell.r][cell.c] = t;
                } else {
                    grid[cell.r][cell.c] = null;
                }
            });
        });

        removed.forEach((t) => {
            const target = tiles.get(t.mergedInto);
            if (target) {
                t.r = target.r;
                t.c = target.c;
            }
            tiles.delete(t.id);
        });

        if (!moved && removed.length === 0) return;

        score += scoreGained;
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_SCORE_KEY, String(best));
        }
        updateHud();
        render(false, removed, scoreGained > 0);

        setTimeout(() => {
            spawnRandomTile();
            render(true);
            checkEndState();
        }, MOVE_TRANSITION_MS);
    }

    function canMove() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!grid[r][c]) return true;
                const v = grid[r][c].value;
                if (c < GRID_SIZE - 1 && grid[r][c + 1] && grid[r][c + 1].value === v) return true;
                if (r < GRID_SIZE - 1 && grid[r + 1][c] && grid[r + 1][c].value === v) return true;
            }
        }
        return false;
    }

    function checkEndState() {
        if (!wonShown) {
            for (const t of tiles.values()) {
                if (t.value >= WIN_VALUE) {
                    wonShown = true;
                    state = "won";
                    showOverlay("You win!", `You reached ${WIN_VALUE}! Score: ${score}.`, "Keep playing");
                    return;
                }
            }
        }
        if (!canMove()) {
            state = "gameover";
            showOverlay("Game Over", `No more moves! Score: ${score}.`, "Play again");
        }
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

    function render(withNewSpawnPop, removedTiles, pulse) {
        measureCells();

        tiles.forEach((tile) => {
            let el = document.getElementById(`tile-${tile.id}`);
            const colors = TILE_COLORS[tile.value] || { bg: "#3c3a55", fg: "#f5f4fb" };
            if (!el) {
                el = document.createElement("div");
                el.id = `tile-${tile.id}`;
                el.className = "tile tile-pop";
                tilesEl.appendChild(el);
            }
            el.textContent = tile.value;
            el.style.background = colors.bg;
            el.style.color = colors.fg;
            el.style.fontSize = tile.value >= 1024 ? "1.3rem" : tile.value >= 128 ? "1.6rem" : "2rem";
            placeTile(el, tile.r, tile.c);
            if (tile.merged && pulse) {
                el.classList.remove("tile-merge-pop");
                void el.offsetWidth;
                el.classList.add("tile-merge-pop");
            }
        });

        if (removedTiles && removedTiles.length) {
            removedTiles.forEach((t) => {
                const el = document.getElementById(`tile-${t.id}`);
                if (el) {
                    placeTile(el, t.r, t.c);
                    el.classList.add("tile-remove");
                    setTimeout(() => el.remove(), MOVE_TRANSITION_MS);
                }
            });
        }
    }

    function placeTile(el, r, c) {
        const m = cellMetrics[r * GRID_SIZE + c];
        if (!m) return;
        el.style.width = `${m.size}px`;
        el.style.height = `${m.size}px`;
        el.style.transform = `translate(${m.left}px, ${m.top}px)`;
    }

    function handleDirection(direction) {
        if (state === "ready" || state === "gameover") {
            startGame();
            return;
        }
        if (state === "won") state = "playing";
        move(direction);
    }

    window.addEventListener("keydown", (e) => {
        const map = {
            ArrowUp: "up", w: "up", W: "up",
            ArrowDown: "down", s: "down", S: "down",
            ArrowLeft: "left", a: "left", A: "left",
            ArrowRight: "right", d: "right", D: "right",
        };
        if (map[e.key]) {
            e.preventDefault();
            handleDirection(map[e.key]);
            return;
        }
        if ((state === "ready" || state === "gameover") && (e.key === " " || e.key === "Enter")) {
            startGame();
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    boardEl.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    boardEl.addEventListener("touchend", (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) {
            handleDirection(dx > 0 ? "right" : "left");
        } else {
            handleDirection(dy > 0 ? "down" : "up");
        }
    }, { passive: true });

    document.querySelectorAll(".dpad-btn").forEach((btn) => {
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            btn.classList.add("is-pressed");
            handleDirection(btn.dataset.dir);
        });
        const release = () => btn.classList.remove("is-pressed");
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    });

    overlayBtn.addEventListener("click", () => {
        if (state === "won") {
            state = "playing";
            overlay.hidden = true;
        } else {
            startGame();
        }
    });
    btnRestart.addEventListener("click", startGame);

    window.addEventListener("resize", () => render(true));

    resetGame();
    render(true);
    state = "ready";
    showOverlay("2048", "Merge matching tiles to reach 2048! Use the arrow keys or swipe to move.", "Start");
})();

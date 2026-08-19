const GRID = 6;
const TILE = 60;
const GAME_WIDTH = GRID * TILE;
const GAME_HEIGHT = GRID * TILE;
const BEST_SCORE_KEY = "enyoBestFloor";
const START_COL = 2;
const START_ROW = 5;
const LERP_RATE = 12;

const FLOOR_COLOR_A = [26, 18, 38];
const FLOOR_COLOR_B = [32, 22, 46];
const LAVA_COLOR = [249, 115, 22];
const LAVA_COLOR_DIM = [194, 65, 12];
const PLAYER_COLOR = [251, 191, 36];
const ENEMY_COLOR = [220, 38, 38];
const SHIELD_COLOR = [168, 85, 247];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [11, 7, 16],
    letterbox: true,
    global: true,
});

const hudFloor = document.getElementById("hud-floor");
const hudHp = document.getElementById("hud-hp");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");
const modeBar = document.getElementById("mode-bar");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let mode = "push";
let grid = [];
let tileObjs = [];
let player = { col: START_COL, row: START_ROW, hp: 3, maxHp: 3, shielded: false, obj: null };
let enemies = [];
let floorNum = 1;
let kills = 0;

function gridToPx(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function inBounds(col, row) {
    return col >= 0 && col < GRID && row >= 0 && row < GRID;
}

function tileAt(col, row) {
    return grid[row][col];
}

function enemyAt(col, row) {
    return enemies.find((e) => e.col === col && e.row === row);
}

function updateHud() {
    hudFloor.textContent = floorNum;
    hudHp.textContent = player.hp;
    hudBest.textContent = best;
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function clearBoardObjs() {
    tileObjs.forEach((row) => row.forEach((o) => destroy(o)));
    tileObjs = [];
    enemies.forEach((e) => destroy(e.obj));
    enemies = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
}

function regenerateFloor() {
    clearBoardObjs();

    grid = [];
    for (let r = 0; r < GRID; r++) {
        grid.push(new Array(GRID).fill("floor"));
    }

    player.col = START_COL;
    player.row = START_ROW;

    const safe = new Set([`${player.col},${player.row}`]);
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const c = player.col + dc;
        const r = player.row + dr;
        if (inBounds(c, r)) safe.add(`${c},${r}`);
    }

    const lavaCount = Math.min(2 + floorNum, 11);
    let placed = 0;
    let guard = 0;
    while (placed < lavaCount && guard < 500) {
        guard++;
        const c = Math.floor(rand(0, GRID));
        const r = Math.floor(rand(0, GRID));
        if (safe.has(`${c},${r}`)) continue;
        if (grid[r][c] === "lava") continue;
        grid[r][c] = "lava";
        placed++;
    }

    const enemyCount = Math.min(1 + floorNum, 6);
    let eplaced = 0;
    guard = 0;
    while (eplaced < enemyCount && guard < 500) {
        guard++;
        const c = Math.floor(rand(0, GRID));
        const r = Math.floor(rand(0, GRID));
        const dist = Math.abs(c - player.col) + Math.abs(r - player.row);
        if (dist < 2) continue;
        if (grid[r][c] !== "floor") continue;
        if (enemyAt(c, r)) continue;
        enemies.push({ col: c, row: r, obj: null });
        eplaced++;
    }

    for (let r = 0; r < GRID; r++) {
        const rowObjs = [];
        for (let c = 0; c < GRID; c++) {
            const p = gridToPx(c, r);
            const isLava = grid[r][c] === "lava";
            const baseColor = isLava ? LAVA_COLOR : (r + c) % 2 === 0 ? FLOOR_COLOR_A : FLOOR_COLOR_B;
            const obj = add([
                pos(p.x, p.y),
                anchor("center"),
                rect(TILE - 3, TILE - 3),
                color(baseColor[0], baseColor[1], baseColor[2]),
                z(0),
                { isLava },
            ]);
            rowObjs.push(obj);
        }
        tileObjs.push(rowObjs);
    }

    const pp = gridToPx(player.col, player.row);
    player.obj = add([
        pos(pp.x, pp.y),
        anchor("center"),
        rotate(45),
        rect(TILE * 0.42, TILE * 0.42),
        color(PLAYER_COLOR[0], PLAYER_COLOR[1], PLAYER_COLOR[2]),
        outline(3, rgb(120, 72, 8)),
        z(5),
    ]);

    enemies.forEach((e) => {
        const ep = gridToPx(e.col, e.row);
        e.obj = add([
            pos(ep.x, ep.y),
            anchor("center"),
            rect(TILE * 0.5, TILE * 0.5),
            color(ENEMY_COLOR[0], ENEMY_COLOR[1], ENEMY_COLOR[2]),
            outline(3, rgb(90, 10, 10)),
            z(4),
        ]);
    });
}

function killEnemy(enemy) {
    destroy(enemy.obj);
    enemies = enemies.filter((e) => e !== enemy);
    kills += 1;
    shake(4);
}

function attemptPush(enemy, dcol, drow) {
    const tcol = enemy.col + dcol;
    const trow = enemy.row + drow;
    if (!inBounds(tcol, trow)) return;
    if (enemyAt(tcol, trow)) return;
    if (tcol === player.col && trow === player.row) return;
    if (tileAt(tcol, trow) === "lava") {
        killEnemy(enemy);
    } else {
        enemy.col = tcol;
        enemy.row = trow;
    }
}

function attemptPull(enemy) {
    const midCol = (enemy.col + player.col) / 2;
    const midRow = (enemy.row + player.row) / 2;
    if (enemyAt(midCol, midRow)) return;
    if (tileAt(midCol, midRow) === "lava") {
        killEnemy(enemy);
    } else {
        enemy.col = midCol;
        enemy.row = midRow;
    }
}

function moveEnemyToward(enemy) {
    const dc = player.col - enemy.col;
    const dr = player.row - enemy.row;
    const options = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push([Math.sign(dc), 0]);
        if (dr !== 0) options.push([0, Math.sign(dr)]);
    } else {
        if (dr !== 0) options.push([0, Math.sign(dr)]);
        if (dc !== 0) options.push([Math.sign(dc), 0]);
    }
    for (const [ddc, ddr] of options) {
        const tc = enemy.col + ddc;
        const tr = enemy.row + ddr;
        if (!inBounds(tc, tr)) continue;
        if (tileAt(tc, tr) !== "floor") continue;
        if (enemyAt(tc, tr)) continue;
        if (tc === player.col && tr === player.row) continue;
        enemy.col = tc;
        enemy.row = tr;
        return;
    }
}

function enemyPhase() {
    const snapshot = [...enemies];
    for (const enemy of snapshot) {
        if (!enemies.includes(enemy)) continue;
        const dist = Math.abs(enemy.col - player.col) + Math.abs(enemy.row - player.row);
        if (dist === 1) {
            if (player.shielded) {
                player.shielded = false;
            } else {
                player.hp -= 1;
                shake(6);
            }
        } else {
            moveEnemyToward(enemy);
        }
    }
    player.shielded = false;
    updateHud();

    if (player.hp <= 0) {
        gameOver();
        return;
    }
    if (enemies.length === 0) {
        nextFloor();
    }
}

function nextFloor() {
    floorNum += 1;
    if (floorNum - 1 > best) {
        best = floorNum - 1;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    regenerateFloor();
    updateHud();
}

function gameOver() {
    state = "gameover";
    if (floorNum > best) {
        best = floorNum;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay("You Fell", `Reached floor ${floorNum} with ${kills} kills. Press to try again.`, "Try Again");
}

function handleTap(col, row) {
    if (state !== "playing") return;
    if (!inBounds(col, row)) return;

    if (col === player.col && row === player.row) {
        player.shielded = true;
        enemyPhase();
        return;
    }

    const dcol = col - player.col;
    const drow = row - player.row;
    const isAdjacent = Math.abs(dcol) + Math.abs(drow) === 1;
    const isPullRange = (dcol === 0 && Math.abs(drow) === 2) || (drow === 0 && Math.abs(dcol) === 2);

    if (isAdjacent) {
        const enemy = enemyAt(col, row);
        if (enemy) {
            if (mode === "push") {
                attemptPush(enemy, dcol, drow);
                enemyPhase();
            }
            return;
        }
        if (tileAt(col, row) === "floor") {
            player.col = col;
            player.row = row;
            enemyPhase();
        }
        return;
    }

    if (isPullRange && mode === "pull") {
        const enemy = enemyAt(col, row);
        if (enemy) {
            attemptPull(enemy);
            enemyPhase();
        }
    }
}

function startGame() {
    floorNum = 1;
    kills = 0;
    player.hp = player.maxHp;
    player.shielded = false;
    mode = "push";
    modeBar.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.mode === mode);
    });
    regenerateFloor();
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") startGame();
}

canvasEl.addEventListener("pointerdown", (e) => {
    if (state !== "playing") {
        pressStart();
        return;
    }
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    handleTap(col, row);
});

overlayBtn.addEventListener("click", pressStart);

modeBar.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        modeBar.querySelectorAll(".mode-btn").forEach((b) => {
            b.classList.toggle("is-active", b === btn);
        });
    });
});

onUpdate(() => {
    const t = clamp(dt() * LERP_RATE, 0, 1);
    if (player.obj) {
        const target = gridToPx(player.col, player.row);
        player.obj.pos.x = lerp(player.obj.pos.x, target.x, t);
        player.obj.pos.y = lerp(player.obj.pos.y, target.y, t);
        const targetColor = player.shielded ? SHIELD_COLOR : PLAYER_COLOR;
        player.obj.color = rgb(targetColor[0], targetColor[1], targetColor[2]);
    }
    enemies.forEach((e) => {
        if (!e.obj) return;
        const target = gridToPx(e.col, e.row);
        e.obj.pos.x = lerp(e.obj.pos.x, target.x, t);
        e.obj.pos.y = lerp(e.obj.pos.y, target.y, t);
    });
    tileObjs.forEach((row) => row.forEach((o) => {
        if (!o.isLava) return;
        const pulse = (Math.sin(time() * 4) + 1) / 2;
        const c1 = LAVA_COLOR;
        const c2 = LAVA_COLOR_DIM;
        o.color = rgb(
            Math.round(lerp(c2[0], c1[0], pulse)),
            Math.round(lerp(c2[1], c1[1], pulse)),
            Math.round(lerp(c2[2], c1[2], pulse))
        );
    }));
});

regenerateFloor();
updateHud();

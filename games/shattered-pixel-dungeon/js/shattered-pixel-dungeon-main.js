const GRID = 12;
const TILE = 30;
const GAME_WIDTH = GRID * TILE;
const GAME_HEIGHT = GRID * TILE;
const BEST_SCORE_KEY = "shatteredPixelDungeonBestScore";
const VISION_RADIUS = 3;
const LERP_RATE = 14;

const WALL_COLOR = [24, 22, 34];
const FLOOR_COLOR = [56, 52, 74];
const STAIRS_COLOR = [45, 212, 191];
const HIDDEN_COLOR = [10, 10, 18];
const REMEMBER_DIM = 0.42;

const PLAYER_COLOR = [34, 197, 94];
const MONSTER_AWAKE_COLOR = [239, 68, 68];
const MONSTER_ASLEEP_COLOR = [120, 45, 45];
const POTION_COLOR = [236, 72, 153];
const GOLD_COLOR = [234, 179, 8];
const SCROLL_COLOR = [96, 165, 250];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [10, 10, 18],
    letterbox: true,
    global: true,
});

const hudDepth = document.getElementById("hud-depth");
const hudHp = document.getElementById("hud-hp");
const hudScore = document.getElementById("hud-score");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");
const restBtn = document.getElementById("rest-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let grid = [];
let vis = [];
let tileObjs = [];
let monsters = [];
let items = [];
let depth = 1;
let stairsCol = 0;
let stairsRow = 0;
let stairsGlyphObj = null;

let player = {
    col: 0, row: 0, hp: 20, maxHp: 20,
    atkMin: 3, atkMax: 6, def: 1,
    level: 1, xp: 0, xpNext: 10, gold: 0,
    obj: null,
};

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function inBounds(col, row) {
    return col >= 0 && col < GRID && row >= 0 && row < GRID;
}

function tileAt(col, row) {
    return grid[row][col];
}

function monsterAt(col, row) {
    return monsters.find((m) => m.col === col && m.row === row);
}

function itemAt(col, row) {
    return items.find((it) => it.col === col && it.row === row);
}

function gridToPx(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function currentScore() {
    return depth * 100 + player.level * 20 + player.gold;
}

function updateHud() {
    hudDepth.textContent = depth;
    hudHp.textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
    hudScore.textContent = currentScore();
    hudBest.textContent = best;
}

function showOverlay(title, desc, btnLabel) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnLabel;
    overlay.hidden = false;
}

function floatText(px, py, str, col) {
    add([
        pos(px, py),
        anchor("center"),
        text(str, { size: 13 }),
        color(col[0], col[1], col[2]),
        opacity(1),
        move(UP, 40),
        lifespan(0.6, { fade: 0.5 }),
        z(10),
    ]);
}

function roomsOverlap(a, b) {
    return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}

function carveRoom(room) {
    for (let r = room.y; r < room.y + room.h; r++) {
        for (let c = room.x; c < room.x + room.w; c++) {
            grid[r][c] = "floor";
        }
    }
}

function carveCorridor(a, b) {
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);
    if (rand(0, 1) < 0.5) {
        for (let c = Math.min(ax, bx); c <= Math.max(ax, bx); c++) grid[ay][c] = "floor";
        for (let r = Math.min(ay, by); r <= Math.max(ay, by); r++) grid[r][bx] = "floor";
    } else {
        for (let r = Math.min(ay, by); r <= Math.max(ay, by); r++) grid[r][ax] = "floor";
        for (let c = Math.min(ax, bx); c <= Math.max(ax, bx); c++) grid[by][c] = "floor";
    }
}

function generateDungeon() {
    grid = [];
    for (let r = 0; r < GRID; r++) grid.push(new Array(GRID).fill("wall"));

    const rooms = [];
    const targetRooms = randInt(4, 6);
    let guard = 0;
    while (rooms.length < targetRooms && guard < 200) {
        guard++;
        const w = randInt(3, 5);
        const h = randInt(3, 4);
        const x = randInt(1, GRID - w - 1);
        const y = randInt(1, GRID - h - 1);
        const room = { x, y, w, h };
        if (rooms.some((r2) => roomsOverlap(room, r2))) continue;
        rooms.push(room);
    }
    if (rooms.length === 0) {
        rooms.push({ x: 2, y: 2, w: 4, h: 4 });
    }

    rooms.forEach(carveRoom);
    for (let i = 0; i < rooms.length - 1; i++) {
        carveCorridor(rooms[i], rooms[i + 1]);
    }

    const startRoom = rooms[0];
    const playerCol = Math.floor(startRoom.x + startRoom.w / 2);
    const playerRow = Math.floor(startRoom.y + startRoom.h / 2);

    const stairRoom = rooms[rooms.length - 1];
    let stairCol = Math.floor(stairRoom.x + stairRoom.w / 2);
    let stairRow = Math.floor(stairRoom.y + stairRoom.h / 2);
    if (stairCol === playerCol && stairRow === playerRow) {
        stairCol = stairRoom.x;
        stairRow = stairRoom.y;
    }
    grid[stairRow][stairCol] = "stairs";

    return { rooms, playerCol, playerRow, stairCol, stairRow };
}

function freeFloorTile(rooms, excludeSet) {
    let guard = 0;
    while (guard < 300) {
        guard++;
        const room = rooms[randInt(0, rooms.length - 1)];
        const c = randInt(room.x, room.x + room.w - 1);
        const r = randInt(room.y, room.y + room.h - 1);
        const key = `${c},${r}`;
        if (excludeSet.has(key)) continue;
        if (grid[r][c] !== "floor") continue;
        excludeSet.add(key);
        return { col: c, row: r };
    }
    return null;
}

function clearBoardObjs() {
    tileObjs.forEach((row) => row.forEach((o) => destroy(o)));
    tileObjs = [];
    monsters.forEach((m) => destroy(m.obj));
    monsters = [];
    items.forEach((it) => destroy(it.obj));
    items = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
    if (stairsGlyphObj) {
        destroy(stairsGlyphObj);
        stairsGlyphObj = null;
    }
}

function regenerateFloor() {
    clearBoardObjs();

    const { rooms, playerCol, playerRow, stairCol, stairRow } = generateDungeon();
    player.col = playerCol;
    player.row = playerRow;

    const occupied = new Set([`${playerCol},${playerRow}`, `${stairCol},${stairRow}`]);

    const monsterCount = Math.min(2 + depth, 10);
    for (let i = 0; i < monsterCount; i++) {
        const spot = freeFloorTile(rooms, occupied);
        if (!spot) break;
        monsters.push({
            col: spot.col,
            row: spot.row,
            hp: 4 + depth * 2,
            maxHp: 4 + depth * 2,
            atkMin: 1 + Math.floor(depth / 2),
            atkMax: 2 + depth,
            def: Math.floor(depth / 3),
            xpValue: 3 + depth,
            awake: false,
            obj: null,
        });
    }

    const potionCount = randInt(1, 2);
    for (let i = 0; i < potionCount; i++) {
        const spot = freeFloorTile(rooms, occupied);
        if (!spot) break;
        items.push({ col: spot.col, row: spot.row, type: "potion", obj: null });
    }

    const goldCount = randInt(2, 4);
    for (let i = 0; i < goldCount; i++) {
        const spot = freeFloorTile(rooms, occupied);
        if (!spot) break;
        items.push({ col: spot.col, row: spot.row, type: "gold", obj: null });
    }

    if (rand(0, 1) < 0.4) {
        const spot = freeFloorTile(rooms, occupied);
        if (spot) items.push({ col: spot.col, row: spot.row, type: "scroll", obj: null });
    }

    vis = [];
    for (let r = 0; r < GRID; r++) vis.push(new Array(GRID).fill(0));

    for (let r = 0; r < GRID; r++) {
        const rowObjs = [];
        for (let c = 0; c < GRID; c++) {
            const p = gridToPx(c, r);
            const obj = add([
                pos(p.x, p.y),
                anchor("center"),
                rect(TILE - 2, TILE - 2),
                color(HIDDEN_COLOR[0], HIDDEN_COLOR[1], HIDDEN_COLOR[2]),
                z(0),
            ]);
            rowObjs.push(obj);
        }
        tileObjs.push(rowObjs);
    }

    stairsCol = stairCol;
    stairsRow = stairRow;
    const stairsP = gridToPx(stairCol, stairRow);
    stairsGlyphObj = add([
        pos(stairsP.x, stairsP.y),
        anchor("center"),
        text(">", { size: 20 }),
        color(STAIRS_COLOR[0], STAIRS_COLOR[1], STAIRS_COLOR[2]),
        z(2),
    ]);

    const pp = gridToPx(player.col, player.row);
    player.obj = add([
        pos(pp.x, pp.y),
        anchor("center"),
        circle(TILE * 0.32),
        color(PLAYER_COLOR[0], PLAYER_COLOR[1], PLAYER_COLOR[2]),
        outline(2, rgb(10, 60, 30)),
        z(5),
    ]);

    monsters.forEach((m) => {
        const mp = gridToPx(m.col, m.row);
        m.obj = add([
            pos(mp.x, mp.y),
            anchor("center"),
            rect(TILE * 0.55, TILE * 0.55),
            color(MONSTER_ASLEEP_COLOR[0], MONSTER_ASLEEP_COLOR[1], MONSTER_ASLEEP_COLOR[2]),
            outline(2, rgb(50, 10, 10)),
            z(4),
        ]);
    });

    items.forEach((it) => {
        const ip = gridToPx(it.col, it.row);
        const col2 = it.type === "potion" ? POTION_COLOR : it.type === "gold" ? GOLD_COLOR : SCROLL_COLOR;
        it.obj = add([
            pos(ip.x, ip.y),
            anchor("center"),
            circle(TILE * 0.16),
            color(col2[0], col2[1], col2[2]),
            z(3),
        ]);
    });

    recomputeVisibility();
    syncVisuals();
}

function recomputeVisibility() {
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            if (vis[r][c] === 2) vis[r][c] = 1;
        }
    }
    for (let r = -VISION_RADIUS; r <= VISION_RADIUS; r++) {
        for (let c = -VISION_RADIUS; c <= VISION_RADIUS; c++) {
            const rr = player.row + r;
            const cc = player.col + c;
            if (!inBounds(cc, rr)) continue;
            if (Math.max(Math.abs(r), Math.abs(c)) <= VISION_RADIUS) {
                vis[rr][cc] = 2;
            }
        }
    }
}

function lerpColor(c1, c2, t) {
    return [
        Math.round(lerp(c1[0], c2[0], t)),
        Math.round(lerp(c1[1], c2[1], t)),
        Math.round(lerp(c1[2], c2[2], t)),
    ];
}

function syncVisuals() {
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            const state2 = vis[r][c];
            const obj = tileObjs[r][c];
            const base = tileAt(c, r) === "wall" ? WALL_COLOR : tileAt(c, r) === "stairs" ? STAIRS_COLOR : FLOOR_COLOR;
            let col2;
            if (state2 === 0) col2 = HIDDEN_COLOR;
            else if (state2 === 1) col2 = lerpColor(HIDDEN_COLOR, base, REMEMBER_DIM);
            else col2 = base;
            obj.color = rgb(col2[0], col2[1], col2[2]);
        }
    }
    monsters.forEach((m) => {
        const visible = vis[m.row][m.col] === 2;
        m.obj.hidden = !visible;
        const col2 = m.awake ? MONSTER_AWAKE_COLOR : MONSTER_ASLEEP_COLOR;
        m.obj.color = rgb(col2[0], col2[1], col2[2]);
    });
    items.forEach((it) => {
        it.obj.hidden = vis[it.row][it.col] !== 2;
    });
    if (stairsGlyphObj) {
        stairsGlyphObj.hidden = vis[stairsRow][stairsCol] === 0;
    }
}

function killMonster(monster) {
    destroy(monster.obj);
    monsters = monsters.filter((m) => m !== monster);
    player.xp += monster.xpValue;
    const p = gridToPx(monster.col, monster.row);
    floatText(p.x, p.y - 10, `+${monster.xpValue}xp`, GOLD_COLOR);
    checkLevelUp();
}

function checkLevelUp() {
    while (player.xp >= player.xpNext) {
        player.xp -= player.xpNext;
        player.level += 1;
        player.maxHp += 5;
        player.hp = player.maxHp;
        player.atkMax += 1;
        if (player.level % 2 === 0) player.atkMin += 1;
        player.xpNext = Math.floor(player.xpNext * 1.5);
        shake(3);
        floatText(player.obj.pos.x, player.obj.pos.y - 16, "LEVEL UP", PLAYER_COLOR);
    }
}

function playerAttack(monster) {
    monster.awake = true;
    const dmg = Math.max(1, randInt(player.atkMin, player.atkMax) - monster.def);
    monster.hp -= dmg;
    const p = gridToPx(monster.col, monster.row);
    floatText(p.x, p.y - 10, `-${dmg}`, [255, 255, 255]);
    if (monster.hp <= 0) {
        killMonster(monster);
    }
}

function monsterAttack(monster) {
    const dmg = Math.max(1, randInt(monster.atkMin, monster.atkMax) - player.def);
    player.hp -= dmg;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg}`, MONSTER_AWAKE_COLOR);
    shake(3);
}

function moveMonsterToward(monster) {
    const dc = player.col - monster.col;
    const dr = player.row - monster.row;
    const options = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push([Math.sign(dc), 0]);
        if (dr !== 0) options.push([0, Math.sign(dr)]);
    } else {
        if (dr !== 0) options.push([0, Math.sign(dr)]);
        if (dc !== 0) options.push([Math.sign(dc), 0]);
    }
    for (const [ddc, ddr] of options) {
        const tc = monster.col + ddc;
        const tr = monster.row + ddr;
        if (!inBounds(tc, tr)) continue;
        if (tileAt(tc, tr) === "wall") continue;
        if (monsterAt(tc, tr)) continue;
        if (tc === player.col && tr === player.row) continue;
        monster.col = tc;
        monster.row = tr;
        return;
    }
}

function handlePickup(col, row) {
    const it = itemAt(col, row);
    if (!it) return;
    if (it.type === "potion") {
        const heal = randInt(6, 10);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${heal}hp`, POTION_COLOR);
    } else if (it.type === "gold") {
        const g = randInt(5, 15);
        player.gold += g;
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${g}g`, GOLD_COLOR);
    } else if (it.type === "scroll") {
        player.atkMin += 1;
        player.atkMax += 1;
        floatText(player.obj.pos.x, player.obj.pos.y - 10, "+ATK", SCROLL_COLOR);
    }
    destroy(it.obj);
    items = items.filter((i) => i !== it);
}

function enemyPhase() {
    const snapshot = [...monsters];
    for (const monster of snapshot) {
        if (!monsters.includes(monster)) continue;
        const dist = Math.max(Math.abs(monster.col - player.col), Math.abs(monster.row - player.row));
        if (dist <= VISION_RADIUS) monster.awake = true;
        if (!monster.awake) continue;
        const adjacent = Math.abs(monster.col - player.col) + Math.abs(monster.row - player.row) === 1;
        if (adjacent) {
            monsterAttack(monster);
        } else {
            moveMonsterToward(monster);
        }
    }
}

function afterPlayerAction() {
    enemyPhase();
    recomputeVisibility();
    syncVisuals();
    updateHud();
    if (player.hp <= 0) {
        gameOver();
    }
}

function restTurn() {
    if (state !== "playing") return;
    if (rand(0, 1) < 0.3) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
    }
    afterPlayerAction();
}

function nextDepth() {
    depth += 1;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `Depth ${depth}`, STAIRS_COLOR);
    regenerateFloor();
    updateHud();
}

function attemptMove(dcol, drow) {
    if (state !== "playing") return;
    const tcol = player.col + dcol;
    const trow = player.row + drow;
    if (!inBounds(tcol, trow)) return;

    const monster = monsterAt(tcol, trow);
    if (monster) {
        playerAttack(monster);
        afterPlayerAction();
        return;
    }

    if (tileAt(tcol, trow) === "wall") return;

    player.col = tcol;
    player.row = trow;
    handlePickup(tcol, trow);

    if (tileAt(tcol, trow) === "stairs") {
        nextDepth();
        return;
    }

    afterPlayerAction();
}

function gameOver() {
    state = "gameover";
    const finalScore = currentScore();
    if (finalScore > best) {
        best = finalScore;
        localStorage.setItem(BEST_SCORE_KEY, String(best));
    }
    updateHud();
    showOverlay("You Died", `Reached depth ${depth}, level ${player.level}, ${player.gold}g. Score: ${finalScore}. Press to try again.`, "Try Again");
}

function startGame() {
    depth = 1;
    player.hp = 20;
    player.maxHp = 20;
    player.atkMin = 3;
    player.atkMax = 6;
    player.def = 1;
    player.level = 1;
    player.xp = 0;
    player.xpNext = 10;
    player.gold = 0;
    regenerateFloor();
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function pressStart() {
    if (state !== "playing") startGame();
}

function handleTap(col, row) {
    if (state !== "playing") return;
    if (!inBounds(col, row)) return;
    if (col === player.col && row === player.row) {
        restTurn();
        return;
    }
    const dcol = col - player.col;
    const drow = row - player.row;
    if (Math.abs(dcol) + Math.abs(drow) === 1) {
        attemptMove(dcol, drow);
    }
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
restBtn.addEventListener("click", () => {
    if (state !== "playing") {
        pressStart();
        return;
    }
    restTurn();
});

window.addEventListener("keydown", (e) => {
    if (state !== "playing") {
        if (e.key === " ") pressStart();
        return;
    }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") attemptMove(0, -1);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") attemptMove(0, 1);
    else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") attemptMove(-1, 0);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") attemptMove(1, 0);
    else if (e.key === " ") {
        e.preventDefault();
        restTurn();
    }
});

onUpdate(() => {
    const t = clamp(dt() * LERP_RATE, 0, 1);
    if (player.obj) {
        const target = gridToPx(player.col, player.row);
        player.obj.pos.x = lerp(player.obj.pos.x, target.x, t);
        player.obj.pos.y = lerp(player.obj.pos.y, target.y, t);
    }
    monsters.forEach((m) => {
        if (!m.obj) return;
        const target = gridToPx(m.col, m.row);
        m.obj.pos.x = lerp(m.obj.pos.x, target.x, t);
        m.obj.pos.y = lerp(m.obj.pos.y, target.y, t);
    });
});

regenerateFloor();
updateHud();

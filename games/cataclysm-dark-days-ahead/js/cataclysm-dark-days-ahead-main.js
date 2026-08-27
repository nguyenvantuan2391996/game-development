const GRID = 12;
const TILE = 30;
const GAME_WIDTH = GRID * TILE;
const GAME_HEIGHT = GRID * TILE;
const BEST_SCORE_KEY = "cataclysmBestScore";
const LERP_RATE = 12;

const TURNS_PER_PHASE = 15;
const HUNGER_DECAY = 0.6;
const THIRST_DECAY = 0.9;
const CHASE_RADIUS = 4;
const LOSE_INTEREST_RADIUS = 6;
const WANDER_CHANCE = 0.35;
const LOOT_RESPAWN_INTERVAL = 8;
const MAX_ITEMS = 10;

const WALL_COLOR = [40, 36, 30];
const FLOOR_COLOR_DAY = [58, 66, 46];
const FLOOR_COLOR_NIGHT = [22, 26, 18];
const BG_COLOR_DAY = [13, 15, 10];
const BG_COLOR_NIGHT = [5, 6, 4];

const PLAYER_COLOR = [132, 204, 22];
const ZOMBIE_CHASE_COLOR = [220, 38, 38];
const ZOMBIE_WANDER_COLOR = [107, 60, 60];
const FOOD_COLOR = [217, 119, 6];
const WATER_COLOR = [56, 189, 248];
const MEDKIT_COLOR = [244, 63, 94];
const SCRAP_COLOR = [161, 161, 170];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: BG_COLOR_DAY,
    letterbox: true,
    global: true,
});

const hudDay = document.getElementById("hud-day");
const hudHp = document.getElementById("hud-hp");
const hudFood = document.getElementById("hud-food");
const hudWater = document.getElementById("hud-water");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");
const waitBtn = document.getElementById("wait-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let grid = [];
let rooms = [];
let tileObjs = [];
let zombies = [];
let items = [];
let bgRect = null;

let turnCount = 0;
let lastPhaseIndex = 0;
let dayCount = 1;
let isNight = false;
let zombiesKilled = 0;
let scrapCollected = 0;

let player = {
    col: 0, row: 0, hp: 20, maxHp: 20,
    hunger: 100, thirst: 100,
    atkMin: 3, atkMax: 6, def: 1,
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

function zombieAt(col, row) {
    return zombies.find((z) => z.col === col && z.row === row);
}

function itemAt(col, row) {
    return items.find((it) => it.col === col && it.row === row);
}

function gridToPx(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function chebyshev(aCol, aRow, bCol, bRow) {
    return Math.max(Math.abs(aCol - bCol), Math.abs(aRow - bRow));
}

function currentScore() {
    return dayCount * 100 + zombiesKilled * 15 + scrapCollected * 5;
}

function updateHud() {
    hudDay.textContent = dayCount;
    hudHp.textContent = `${Math.max(0, Math.round(player.hp))}/${player.maxHp}`;
    hudFood.textContent = Math.max(0, Math.round(player.hunger));
    hudWater.textContent = Math.max(0, Math.round(player.thirst));
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

function generateCity() {
    grid = [];
    for (let r = 0; r < GRID; r++) grid.push(new Array(GRID).fill("wall"));

    const newRooms = [];
    const targetRooms = randInt(5, 7);
    let guard = 0;
    while (newRooms.length < targetRooms && guard < 200) {
        guard++;
        const w = randInt(3, 5);
        const h = randInt(3, 4);
        const x = randInt(1, GRID - w - 1);
        const y = randInt(1, GRID - h - 1);
        const room = { x, y, w, h };
        if (newRooms.some((r2) => roomsOverlap(room, r2))) continue;
        newRooms.push(room);
    }
    if (newRooms.length === 0) {
        newRooms.push({ x: 2, y: 2, w: 4, h: 4 });
    }

    newRooms.forEach(carveRoom);
    for (let i = 0; i < newRooms.length - 1; i++) {
        carveCorridor(newRooms[i], newRooms[i + 1]);
    }

    const startRoom = newRooms[0];
    const playerCol = Math.floor(startRoom.x + startRoom.w / 2);
    const playerRow = Math.floor(startRoom.y + startRoom.h / 2);

    return { newRooms, playerCol, playerRow };
}

function randomFreeFloorTile(minDist) {
    let guard = 0;
    while (guard < 300) {
        guard++;
        const room = rooms[randInt(0, rooms.length - 1)];
        const c = randInt(room.x, room.x + room.w - 1);
        const r = randInt(room.y, room.y + room.h - 1);
        if (grid[r][c] !== "floor") continue;
        if (zombieAt(c, r) || itemAt(c, r)) continue;
        if (c === player.col && r === player.row) continue;
        if (minDist > 0 && chebyshev(c, r, player.col, player.row) < minDist) continue;
        return { col: c, row: r };
    }
    return null;
}

function clearBoardObjs() {
    tileObjs.forEach((row) => row.forEach((o) => destroy(o)));
    tileObjs = [];
    zombies.forEach((z) => destroy(z.obj));
    zombies = [];
    items.forEach((it) => destroy(it.obj));
    items = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
    if (bgRect) {
        destroy(bgRect);
        bgRect = null;
    }
}

function makeZombie(col, row) {
    return {
        col, row,
        hp: 5 + dayCount * 2,
        maxHp: 5 + dayCount * 2,
        atkMin: 1 + Math.floor(dayCount / 3),
        atkMax: 3 + Math.floor(dayCount / 2),
        def: Math.floor(dayCount / 5),
        awake: false,
        obj: null,
    };
}

function addZombieObj(zb) {
    const p = gridToPx(zb.col, zb.row);
    zb.obj = add([
        pos(p.x, p.y),
        anchor("center"),
        rect(TILE * 0.55, TILE * 0.55),
        color(ZOMBIE_WANDER_COLOR[0], ZOMBIE_WANDER_COLOR[1], ZOMBIE_WANDER_COLOR[2]),
        outline(2, rgb(40, 15, 15)),
        z(4),
    ]);
}

function spawnZombiesBatch(count, minDist) {
    for (let i = 0; i < count; i++) {
        const spot = randomFreeFloorTile(minDist);
        if (!spot) break;
        const zb = makeZombie(spot.col, spot.row);
        addZombieObj(zb);
        zombies.push(zb);
    }
}

function itemColor(type) {
    if (type === "food") return FOOD_COLOR;
    if (type === "water") return WATER_COLOR;
    if (type === "medkit") return MEDKIT_COLOR;
    return SCRAP_COLOR;
}

function addLootItem(type, col, row) {
    const p = gridToPx(col, row);
    const col2 = itemColor(type);
    const it = {
        col, row, type,
        obj: add([
            pos(p.x, p.y),
            anchor("center"),
            circle(TILE * 0.16),
            color(col2[0], col2[1], col2[2]),
            z(3),
        ]),
    };
    items.push(it);
}

function spawnRandomLoot() {
    if (items.length >= MAX_ITEMS) return;
    const spot = randomFreeFloorTile(0);
    if (!spot) return;
    const roll = rand(0, 1);
    let type;
    if (roll < 0.35) type = "food";
    else if (roll < 0.65) type = "water";
    else if (roll < 0.8) type = "medkit";
    else type = "scrap";
    addLootItem(type, spot.col, spot.row);
}

function generateWorld() {
    clearBoardObjs();

    const { newRooms, playerCol, playerRow } = generateCity();
    rooms = newRooms;
    player.col = playerCol;
    player.row = playerRow;

    bgRect = add([
        pos(0, 0),
        anchor("topleft"),
        rect(GAME_WIDTH, GAME_HEIGHT),
        color(BG_COLOR_DAY[0], BG_COLOR_DAY[1], BG_COLOR_DAY[2]),
        z(-1),
    ]);

    for (let r = 0; r < GRID; r++) {
        const rowObjs = [];
        for (let c = 0; c < GRID; c++) {
            const p = gridToPx(c, r);
            const base = tileAt(c, r) === "wall" ? WALL_COLOR : FLOOR_COLOR_DAY;
            const obj = add([
                pos(p.x, p.y),
                anchor("center"),
                rect(TILE - 2, TILE - 2),
                color(base[0], base[1], base[2]),
                z(0),
            ]);
            rowObjs.push(obj);
        }
        tileObjs.push(rowObjs);
    }

    const pp = gridToPx(player.col, player.row);
    player.obj = add([
        pos(pp.x, pp.y),
        anchor("center"),
        circle(TILE * 0.32),
        color(PLAYER_COLOR[0], PLAYER_COLOR[1], PLAYER_COLOR[2]),
        outline(2, rgb(30, 55, 10)),
        z(5),
    ]);

    spawnZombiesBatch(3, 4);

    ["food", "food", "water", "water", "medkit", "scrap", "scrap", "scrap"].forEach((type) => {
        const spot = randomFreeFloorTile(0);
        if (spot) addLootItem(type, spot.col, spot.row);
    });
}

function syncVisuals() {
    const bg = isNight ? BG_COLOR_NIGHT : BG_COLOR_DAY;
    if (bgRect) bgRect.color = rgb(bg[0], bg[1], bg[2]);

    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            const obj = tileObjs[r][c];
            const base = tileAt(c, r) === "wall" ? WALL_COLOR : (isNight ? FLOOR_COLOR_NIGHT : FLOOR_COLOR_DAY);
            obj.color = rgb(base[0], base[1], base[2]);
        }
    }

    zombies.forEach((zb) => {
        const col2 = zb.awake ? ZOMBIE_CHASE_COLOR : ZOMBIE_WANDER_COLOR;
        zb.obj.color = rgb(col2[0], col2[1], col2[2]);
    });
}

function killZombie(zb) {
    destroy(zb.obj);
    zombies = zombies.filter((z2) => z2 !== zb);
    zombiesKilled += 1;
    const p = gridToPx(zb.col, zb.row);
    floatText(p.x, p.y - 10, "+kill", ZOMBIE_CHASE_COLOR);
}

function playerAttack(zb) {
    zb.awake = true;
    const dmg = Math.max(1, randInt(player.atkMin, player.atkMax) - zb.def);
    zb.hp -= dmg;
    const p = gridToPx(zb.col, zb.row);
    floatText(p.x, p.y - 10, `-${dmg}`, [255, 255, 255]);
    if (zb.hp <= 0) {
        killZombie(zb);
    }
}

function zombieAttack(zb) {
    const dmg = Math.max(1, randInt(zb.atkMin, zb.atkMax) - player.def);
    player.hp -= dmg;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg}`, ZOMBIE_CHASE_COLOR);
    shake(3);
}

function moveZombieToward(zb) {
    const dc = player.col - zb.col;
    const dr = player.row - zb.row;
    const options = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push([Math.sign(dc), 0]);
        if (dr !== 0) options.push([0, Math.sign(dr)]);
    } else {
        if (dr !== 0) options.push([0, Math.sign(dr)]);
        if (dc !== 0) options.push([Math.sign(dc), 0]);
    }
    for (const [ddc, ddr] of options) {
        const tc = zb.col + ddc;
        const tr = zb.row + ddr;
        if (!inBounds(tc, tr)) continue;
        if (tileAt(tc, tr) === "wall") continue;
        if (zombieAt(tc, tr)) continue;
        if (tc === player.col && tr === player.row) continue;
        zb.col = tc;
        zb.row = tr;
        return;
    }
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function wanderZombie(zb) {
    if (rand(0, 1) >= WANDER_CHANCE) return;
    const order = [...DIRS].sort(() => rand(0, 1) - 0.5);
    for (const [ddc, ddr] of order) {
        const tc = zb.col + ddc;
        const tr = zb.row + ddr;
        if (!inBounds(tc, tr)) continue;
        if (tileAt(tc, tr) === "wall") continue;
        if (zombieAt(tc, tr)) continue;
        if (tc === player.col && tr === player.row) continue;
        zb.col = tc;
        zb.row = tr;
        return;
    }
}

function zombiePhase() {
    const snapshot = [...zombies];
    for (const zb of snapshot) {
        if (!zombies.includes(zb)) continue;
        const dist = chebyshev(zb.col, zb.row, player.col, player.row);
        if (dist <= CHASE_RADIUS) zb.awake = true;
        else if (dist > LOSE_INTEREST_RADIUS) zb.awake = false;

        const adjacent = Math.abs(zb.col - player.col) + Math.abs(zb.row - player.row) === 1;
        if (adjacent) {
            zombieAttack(zb);
        } else if (zb.awake) {
            moveZombieToward(zb);
        } else {
            wanderZombie(zb);
        }
    }
}

function handlePickup(col, row) {
    const it = itemAt(col, row);
    if (!it) return;
    if (it.type === "food") {
        const gain = randInt(20, 35);
        player.hunger = Math.min(100, player.hunger + gain);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${gain} food`, FOOD_COLOR);
    } else if (it.type === "water") {
        const gain = randInt(20, 35);
        player.thirst = Math.min(100, player.thirst + gain);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${gain} water`, WATER_COLOR);
    } else if (it.type === "medkit") {
        const heal = randInt(8, 14);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${heal}hp`, MEDKIT_COLOR);
    } else if (it.type === "scrap") {
        const g = randInt(1, 3);
        scrapCollected += g;
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${g} scrap`, SCRAP_COLOR);
    }
    destroy(it.obj);
    items = items.filter((i) => i !== it);
}

function applyMeters() {
    player.hunger = Math.max(0, player.hunger - HUNGER_DECAY);
    player.thirst = Math.max(0, player.thirst - THIRST_DECAY);
    let dmg = 0;
    if (player.hunger <= 0) dmg += 1;
    if (player.thirst <= 0) dmg += 1;
    if (dmg > 0) {
        player.hp -= dmg;
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg}`, [255, 120, 60]);
    }
}

function checkPhaseChange() {
    const phaseIndex = Math.floor(turnCount / TURNS_PER_PHASE);
    dayCount = Math.floor(phaseIndex / 2) + 1;
    isNight = phaseIndex % 2 === 1;
    if (phaseIndex !== lastPhaseIndex) {
        lastPhaseIndex = phaseIndex;
        if (isNight) {
            const spawnCount = 2 + Math.floor(dayCount / 2);
            spawnZombiesBatch(spawnCount, 3);
            floatText(player.obj.pos.x, player.obj.pos.y - 16, "NIGHTFALL", ZOMBIE_CHASE_COLOR);
            shake(2);
        } else {
            floatText(player.obj.pos.x, player.obj.pos.y - 16, "DAWN", FOOD_COLOR);
        }
    }
}

function afterPlayerAction() {
    turnCount += 1;
    applyMeters();
    checkPhaseChange();
    if (turnCount % LOOT_RESPAWN_INTERVAL === 0) spawnRandomLoot();
    zombiePhase();
    syncVisuals();
    updateHud();
    if (player.hp <= 0) {
        gameOver();
    }
}

function waitTurn() {
    if (state !== "playing") return;
    afterPlayerAction();
}

function attemptMove(dcol, drow) {
    if (state !== "playing") return;
    const tcol = player.col + dcol;
    const trow = player.row + drow;
    if (!inBounds(tcol, trow)) return;

    const zb = zombieAt(tcol, trow);
    if (zb) {
        playerAttack(zb);
        afterPlayerAction();
        return;
    }

    if (tileAt(tcol, trow) === "wall") return;

    player.col = tcol;
    player.row = trow;
    handlePickup(tcol, trow);
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
    showOverlay(
        "You Died",
        `Survived ${dayCount} day${dayCount === 1 ? "" : "s"}, killed ${zombiesKilled} zombies, ${scrapCollected} scrap. Score: ${finalScore}. Press to try again.`,
        "Try Again"
    );
}

function startGame() {
    turnCount = 0;
    lastPhaseIndex = 0;
    dayCount = 1;
    isNight = false;
    zombiesKilled = 0;
    scrapCollected = 0;
    player.hp = 20;
    player.maxHp = 20;
    player.hunger = 100;
    player.thirst = 100;
    player.atkMin = 3;
    player.atkMax = 6;
    player.def = 1;
    generateWorld();
    syncVisuals();
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
        waitTurn();
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
waitBtn.addEventListener("click", () => {
    if (state !== "playing") {
        pressStart();
        return;
    }
    waitTurn();
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
        waitTurn();
    }
});

onUpdate(() => {
    const t = clamp(dt() * LERP_RATE, 0, 1);
    if (player.obj) {
        const target = gridToPx(player.col, player.row);
        player.obj.pos.x = lerp(player.obj.pos.x, target.x, t);
        player.obj.pos.y = lerp(player.obj.pos.y, target.y, t);
    }
    zombies.forEach((zb) => {
        if (!zb.obj) return;
        const target = gridToPx(zb.col, zb.row);
        zb.obj.pos.x = lerp(zb.obj.pos.x, target.x, t);
        zb.obj.pos.y = lerp(zb.obj.pos.y, target.y, t);
    });
});

generateWorld();
syncVisuals();
updateHud();

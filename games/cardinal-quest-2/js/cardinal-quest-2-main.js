const GRID = 12;
const TILE = 30;
const GAME_WIDTH = GRID * TILE;
const GAME_HEIGHT = GRID * TILE;
const BEST_SCORE_KEY = "cardinalQuest2BestScore";
const LERP_RATE = 14;
const ABILITY_COOLDOWN = 5;
const SLEEP_RADIUS = 4;

const WALL_COLOR = [30, 22, 46];
const FLOOR_COLOR = [58, 44, 84];
const STAIRS_COLOR = [56, 189, 248];

const PLAYER_COLOR = [245, 242, 251];
const MONSTER_AWAKE_COLOR = [244, 63, 94];
const MONSTER_ASLEEP_COLOR = [120, 45, 65];
const POTION_COLOR = [244, 114, 182];
const GOLD_COLOR = [250, 204, 21];
const SCROLL_COLOR = [56, 189, 248];

const CLASS_DEFS = {
    fighter: { hp: 22, atkMin: 3, atkMax: 5, def: 2, ability: "whirlwind" },
    rogue: { hp: 16, atkMin: 3, atkMax: 5, def: 1, ability: "backstab" },
    wizard: { hp: 13, atkMin: 2, atkMax: 4, def: 0, ability: "fireball" },
    paladin: { hp: 20, atkMin: 3, atkMax: 5, def: 1, ability: "layonhands" },
};

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [15, 10, 26],
    letterbox: true,
    global: true,
});

const hudFloor = document.getElementById("hud-floor");
const hudHp = document.getElementById("hud-hp");
const hudLevel = document.getElementById("hud-level");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const classRow = document.getElementById("class-row");
const waitBtn = document.getElementById("wait-btn");
const abilityBtn = document.getElementById("ability-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let grid = [];
let rooms = [];
let tileObjs = [];
let monsters = [];
let items = [];
let floorNum = 1;
let killCount = 0;

let player = {
    col: 0, row: 0, hp: 20, maxHp: 20,
    atkMin: 3, atkMax: 6, def: 1,
    level: 1, xp: 0, xpNext: 10, gold: 0,
    cls: "fighter", abilityCooldown: 0,
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

function chebyshev(aCol, aRow, bCol, bRow) {
    return Math.max(Math.abs(aCol - bCol), Math.abs(aRow - bRow));
}

function currentScore() {
    return floorNum * 100 + player.level * 20 + killCount * 5;
}

function updateHud() {
    hudFloor.textContent = floorNum;
    hudHp.textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
    hudLevel.textContent = player.level;
    hudBest.textContent = best;
    const ready = player.abilityCooldown <= 0 && state === "playing";
    abilityBtn.disabled = !ready;
    abilityBtn.textContent = ready ? "✨ Ability" : `✨ ${player.abilityCooldown}`;
}

function showOverlay(title, desc) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlay.hidden = false;
}

function floatText(px, py, str, col) {
    add([
        pos(px, py),
        anchor("center"),
        text(str, { size: 12 }),
        color(col[0], col[1], col[2]),
        opacity(1),
        move(UP, 40),
        lifespan(0.7, { fade: 0.5 }),
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

    const newRooms = [];
    const targetRooms = randInt(4, 6);
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

    const stairRoom = newRooms[newRooms.length - 1];
    let stairCol = Math.floor(stairRoom.x + stairRoom.w / 2);
    let stairRow = Math.floor(stairRoom.y + stairRoom.h / 2);
    if (stairCol === playerCol && stairRow === playerRow) {
        stairCol = stairRoom.x;
        stairRow = stairRoom.y;
    }
    grid[stairRow][stairCol] = "stairs";

    return { newRooms, playerCol, playerRow, stairCol, stairRow };
}

function freeFloorTile(excludeSet) {
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
}

function regenerateLevel() {
    clearBoardObjs();

    const { newRooms, playerCol, playerRow, stairCol, stairRow } = generateDungeon();
    rooms = newRooms;
    player.col = playerCol;
    player.row = playerRow;

    const occupied = new Set([`${playerCol},${playerRow}`, `${stairCol},${stairRow}`]);

    for (let r = 0; r < GRID; r++) {
        const rowObjs = [];
        for (let c = 0; c < GRID; c++) {
            const p = gridToPx(c, r);
            const base = tileAt(c, r) === "wall" ? WALL_COLOR : tileAt(c, r) === "stairs" ? STAIRS_COLOR : FLOOR_COLOR;
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
        outline(2, rgb(60, 40, 90)),
        z(5),
    ]);

    const monsterCount = Math.min(2 + floorNum, 10);
    for (let i = 0; i < monsterCount; i++) {
        const spot = freeFloorTile(occupied);
        if (!spot) break;
        monsters.push({
            col: spot.col,
            row: spot.row,
            hp: 4 + floorNum * 2,
            maxHp: 4 + floorNum * 2,
            atkMin: 1 + Math.floor(floorNum / 2),
            atkMax: 2 + floorNum,
            def: Math.floor(floorNum / 3),
            xpValue: 3 + floorNum,
            awake: false,
            obj: null,
        });
    }
    monsters.forEach((m) => {
        const mp = gridToPx(m.col, m.row);
        m.obj = add([
            pos(mp.x, mp.y),
            anchor("center"),
            rect(TILE * 0.55, TILE * 0.55),
            color(MONSTER_ASLEEP_COLOR[0], MONSTER_ASLEEP_COLOR[1], MONSTER_ASLEEP_COLOR[2]),
            outline(2, rgb(50, 10, 25)),
            z(4),
        ]);
    });

    const potionCount = randInt(1, 2);
    for (let i = 0; i < potionCount; i++) {
        const spot = freeFloorTile(occupied);
        if (spot) items.push({ col: spot.col, row: spot.row, type: "potion", obj: null });
    }
    const goldCount = randInt(2, 4);
    for (let i = 0; i < goldCount; i++) {
        const spot = freeFloorTile(occupied);
        if (spot) items.push({ col: spot.col, row: spot.row, type: "gold", obj: null });
    }
    if (rand(0, 1) < 0.4) {
        const spot = freeFloorTile(occupied);
        if (spot) items.push({ col: spot.col, row: spot.row, type: "scroll", obj: null });
    }
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
}

function syncMonsterColors() {
    monsters.forEach((m) => {
        const col2 = m.awake ? MONSTER_AWAKE_COLOR : MONSTER_ASLEEP_COLOR;
        m.obj.color = rgb(col2[0], col2[1], col2[2]);
    });
}

function killMonster(m) {
    destroy(m.obj);
    monsters = monsters.filter((m2) => m2 !== m);
    killCount += 1;
    player.xp += m.xpValue;
    const p = gridToPx(m.col, m.row);
    floatText(p.x, p.y - 10, `+${m.xpValue}xp`, GOLD_COLOR);
    checkLevelUp();
}

function checkLevelUp() {
    while (player.xp >= player.xpNext) {
        player.xp -= player.xpNext;
        player.level += 1;
        player.maxHp += 4;
        player.hp = player.maxHp;
        player.atkMax += 1;
        if (player.level % 2 === 0) player.atkMin += 1;
        player.xpNext = Math.floor(player.xpNext * 1.5);
        shake(3);
        floatText(player.obj.pos.x, player.obj.pos.y - 16, "LEVEL UP", PLAYER_COLOR);
    }
}

function playerAttack(m) {
    m.awake = true;
    const dmg = Math.max(1, randInt(player.atkMin, player.atkMax) - m.def);
    m.hp -= dmg;
    const p = gridToPx(m.col, m.row);
    floatText(p.x, p.y - 10, `-${dmg}`, [255, 255, 255]);
    if (m.hp <= 0) killMonster(m);
}

function monsterAttack(m) {
    const dmg = Math.max(1, randInt(m.atkMin, m.atkMax) - player.def);
    player.hp -= dmg;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg}`, MONSTER_AWAKE_COLOR);
    shake(3);
}

function moveMonsterToward(m) {
    const dc = player.col - m.col;
    const dr = player.row - m.row;
    const options = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push([Math.sign(dc), 0]);
        if (dr !== 0) options.push([0, Math.sign(dr)]);
    } else {
        if (dr !== 0) options.push([0, Math.sign(dr)]);
        if (dc !== 0) options.push([Math.sign(dc), 0]);
    }
    for (const [ddc, ddr] of options) {
        const tc = m.col + ddc;
        const tr = m.row + ddr;
        if (!inBounds(tc, tr)) continue;
        if (tileAt(tc, tr) === "wall") continue;
        if (monsterAt(tc, tr)) continue;
        if (tc === player.col && tr === player.row) continue;
        m.col = tc;
        m.row = tr;
        return;
    }
}

function monsterPhase() {
    const snapshot = [...monsters];
    for (const m of snapshot) {
        if (!monsters.includes(m)) continue;
        const dist = chebyshev(m.col, m.row, player.col, player.row);
        if (dist <= SLEEP_RADIUS) m.awake = true;
        if (!m.awake) continue;
        const adjacent = Math.abs(m.col - player.col) + Math.abs(m.row - player.row) === 1;
        if (adjacent) {
            monsterAttack(m);
        } else {
            moveMonsterToward(m);
        }
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

function afterPlayerAction() {
    player.abilityCooldown = Math.max(0, player.abilityCooldown - 1);
    monsterPhase();
    syncMonsterColors();
    updateHud();
    if (player.hp <= 0) {
        gameOver();
    }
}

function waitTurn() {
    if (state !== "playing") return;
    afterPlayerAction();
}

function useAbility() {
    if (state !== "playing") return;
    if (player.abilityCooldown > 0) return;
    const ability = CLASS_DEFS[player.cls].ability;
    let consumed = false;

    if (ability === "whirlwind") {
        const adj = monsters.filter((m) => Math.abs(m.col - player.col) + Math.abs(m.row - player.row) === 1);
        if (adj.length === 0) {
            floatText(player.obj.pos.x, player.obj.pos.y - 10, "no target", [180, 180, 180]);
            return;
        }
        adj.forEach((m) => {
            const dmg = Math.max(1, randInt(player.atkMin, player.atkMax) - m.def);
            m.hp -= dmg;
            const p = gridToPx(m.col, m.row);
            floatText(p.x, p.y - 10, `-${dmg}`, [255, 255, 255]);
            if (m.hp <= 0) killMonster(m);
        });
        consumed = true;
    } else if (ability === "backstab") {
        const target = monsters.find((m) => Math.abs(m.col - player.col) + Math.abs(m.row - player.row) === 1);
        if (!target) {
            floatText(player.obj.pos.x, player.obj.pos.y - 10, "no target", [180, 180, 180]);
            return;
        }
        const dmg = Math.max(1, randInt(player.atkMin, player.atkMax) * 3 - target.def);
        target.hp -= dmg;
        const p = gridToPx(target.col, target.row);
        floatText(p.x, p.y - 10, `-${dmg} BACKSTAB`, [255, 255, 255]);
        if (target.hp <= 0) killMonster(target);
        consumed = true;
    } else if (ability === "fireball") {
        let target = null;
        let bestDist = Infinity;
        monsters.forEach((m) => {
            const d = chebyshev(m.col, m.row, player.col, player.row);
            if (d <= 4 && d < bestDist) {
                bestDist = d;
                target = m;
            }
        });
        if (!target) {
            floatText(player.obj.pos.x, player.obj.pos.y - 10, "no target", [180, 180, 180]);
            return;
        }
        const dmg = randInt(6, 10) + floorNum;
        target.hp -= dmg;
        target.awake = true;
        const p = gridToPx(target.col, target.row);
        floatText(p.x, p.y - 10, `-${dmg} FIREBALL`, SCROLL_COLOR);
        if (target.hp <= 0) killMonster(target);
        consumed = true;
    } else if (ability === "layonhands") {
        const heal = randInt(12, 18);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${heal}hp LAY ON HANDS`, POTION_COLOR);
        consumed = true;
    }

    if (consumed) {
        player.abilityCooldown = ABILITY_COOLDOWN;
        afterPlayerAction();
    }
}

function nextFloor() {
    floorNum += 1;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `Floor ${floorNum}`, STAIRS_COLOR);
    regenerateLevel();
    updateHud();
}

function attemptMove(dcol, drow) {
    if (state !== "playing") return;
    const tcol = player.col + dcol;
    const trow = player.row + drow;
    if (!inBounds(tcol, trow)) return;

    const m = monsterAt(tcol, trow);
    if (m) {
        playerAttack(m);
        afterPlayerAction();
        return;
    }

    if (tileAt(tcol, trow) === "wall") return;

    player.col = tcol;
    player.row = trow;
    handlePickup(tcol, trow);

    if (tileAt(tcol, trow) === "stairs") {
        nextFloor();
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
    showOverlay(
        "You Died",
        `Reached floor ${floorNum}, level ${player.level}, ${killCount} kills. Score: ${finalScore}. Pick a class to try again.`
    );
    classRow.hidden = false;
}

function startGame(className) {
    const stats = CLASS_DEFS[className];
    floorNum = 1;
    killCount = 0;
    player.cls = className;
    player.hp = stats.hp;
    player.maxHp = stats.hp;
    player.atkMin = stats.atkMin;
    player.atkMax = stats.atkMax;
    player.def = stats.def;
    player.level = 1;
    player.xp = 0;
    player.xpNext = 10;
    player.gold = 0;
    player.abilityCooldown = 0;
    regenerateLevel();
    syncMonsterColors();
    state = "playing";
    overlay.hidden = true;
    updateHud();
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
    if (state !== "playing") return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    handleTap(col, row);
});

classRow.querySelectorAll(".class-btn").forEach((btn) => {
    btn.addEventListener("click", () => startGame(btn.dataset.class));
});

waitBtn.addEventListener("click", () => {
    if (state !== "playing") return;
    waitTurn();
});

abilityBtn.addEventListener("click", useAbility);

window.addEventListener("keydown", (e) => {
    if (state !== "playing") return;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") attemptMove(0, -1);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") attemptMove(0, 1);
    else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") attemptMove(-1, 0);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") attemptMove(1, 0);
    else if (e.key === "e" || e.key === "E") useAbility();
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
    monsters.forEach((m) => {
        if (!m.obj) return;
        const target = gridToPx(m.col, m.row);
        m.obj.pos.x = lerp(m.obj.pos.x, target.x, t);
        m.obj.pos.y = lerp(m.obj.pos.y, target.y, t);
    });
});

regenerateLevel();
updateHud();

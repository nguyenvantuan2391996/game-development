const GRID = 12;
const TILE = 30;
const GAME_WIDTH = GRID * TILE;
const GAME_HEIGHT = GRID * TILE;
const BEST_SCORE_KEY = "pathosBestScore";
const LERP_RATE = 12;
const SATIATION_MAX = 1000;
const SATIATION_DECAY = 1;
const MAX_ITEMS = 10;

const WALL_LIT = [70, 80, 65];
const WALL_DIM = [26, 30, 24];
const FLOOR_LIT = [110, 130, 95];
const FLOOR_DIM = [40, 48, 36];
const STAIRS_COLOR = [245, 158, 11];
const TRAP_COLOR = [239, 68, 68];
const TRAP_DIM = [70, 30, 30];
const PLAYER_COLOR = [240, 240, 235];
const GOLD_COLOR = [250, 204, 21];
const POTION_COLOR = [236, 72, 153];
const SCROLL_COLOR = [96, 165, 250];
const FOOD_COLOR = [217, 119, 6];
const WEAPON_COLOR = [210, 210, 218];
const ARMOR_COLOR = [148, 163, 184];

const MONSTER_KINDS = {
    rat: { glyph: "r", hp: 3, atkMin: 1, atkMax: 2, color: [175, 175, 175], stationary: false },
    jackal: { glyph: "d", hp: 4, atkMin: 1, atkMax: 3, color: [217, 119, 6], stationary: false },
    zombie: { glyph: "z", hp: 7, atkMin: 2, atkMax: 4, color: [74, 222, 128], stationary: false },
    lichen: { glyph: "f", hp: 5, atkMin: 1, atkMax: 2, color: [34, 197, 94], stationary: true },
};

const CLASS_STATS = {
    valkyrie: { hp: 24, atkMin: 3, atkMax: 5, def: 2 },
    ranger: { hp: 18, atkMin: 4, atkMax: 6, def: 1 },
    wizard: { hp: 13, atkMin: 3, atkMax: 7, def: 0 },
};

const POTION_KINDS = ["healing", "poison", "strength"];
const SCROLL_KINDS = ["enchant", "teleport"];
const POTION_APPEARANCE_POOL = ["murky", "fizzy", "smoky", "clear", "swirling", "muddy"];
const SCROLL_APPEARANCE_POOL = ["XYZZY", "ELBERETH", "NR 9", "HACKEM MUCHE", "PRATYAVAYAH"];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [5, 8, 10],
    letterbox: true,
    global: true,
});

const hudDepth = document.getElementById("hud-depth");
const hudHp = document.getElementById("hud-hp");
const hudHunger = document.getElementById("hud-hunger");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const classRow = document.getElementById("class-row");
const waitBtn = document.getElementById("wait-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let grid = [];
let rooms = [];
let discovered = [];
let lit = [];
let tileObjs = [];
let monsters = [];
let items = [];
let traps = [];
let depth = 1;

let potionAppearance = {};
let scrollAppearance = {};
let identified = {};

let player = {
    col: 0, row: 0, hp: 20, maxHp: 20,
    atkMin: 3, atkMax: 6, def: 1,
    gold: 0, satiation: SATIATION_MAX,
    obj: null,
};

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
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

function trapAt(col, row) {
    return traps.find((t) => t.col === col && t.row === row);
}

function gridToPx(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function lerpColor(c1, c2, t) {
    return [
        Math.round(lerp(c1[0], c2[0], t)),
        Math.round(lerp(c1[1], c2[1], t)),
        Math.round(lerp(c1[2], c2[2], t)),
    ];
}

function currentScore() {
    return depth * 100 + player.gold * 5;
}

function statusLabel() {
    if (player.satiation <= 0) return "Fainting";
    if (player.satiation <= 100) return "Weak";
    if (player.satiation <= 300) return "Hungry";
    return "Fine";
}

function updateHud() {
    hudDepth.textContent = depth;
    hudHp.textContent = `${Math.max(0, Math.round(player.hp))}/${player.maxHp}`;
    hudHunger.textContent = statusLabel();
    hudBest.textContent = best;
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

function makeGlyph(char, px, py, col, zIndex) {
    return add([
        pos(px, py),
        anchor("center"),
        text(char, { size: 20 }),
        color(col[0], col[1], col[2]),
        z(zIndex),
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

function roomContaining(col, row) {
    return rooms.find((rm) => col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h) || null;
}

function randomFreeFloorTile() {
    let guard = 0;
    while (guard < 300) {
        guard++;
        const room = rooms[randInt(0, rooms.length - 1)];
        const c = randInt(room.x, room.x + room.w - 1);
        const r = randInt(room.y, room.y + room.h - 1);
        if (grid[r][c] !== "floor") continue;
        if (monsterAt(c, r) || itemAt(c, r) || trapAt(c, r)) continue;
        if (c === player.col && r === player.row) continue;
        return { col: c, row: r };
    }
    return null;
}

function clearBoardObjs() {
    tileObjs.forEach((row) => row.forEach((o) => { if (o) destroy(o); }));
    tileObjs = [];
    monsters.forEach((m) => destroy(m.obj));
    monsters = [];
    items.forEach((it) => destroy(it.obj));
    items = [];
    traps = [];
    if (player.obj) {
        destroy(player.obj);
        player.obj = null;
    }
}

function makeMonster(col, row, kindKey) {
    const def = MONSTER_KINDS[kindKey];
    return {
        col, row, kindKey,
        hp: def.hp + depth * 2,
        maxHp: def.hp + depth * 2,
        atkMin: def.atkMin + Math.floor(depth / 3),
        atkMax: def.atkMax + Math.floor(depth / 2),
        def: Math.floor(depth / 5),
        awake: false,
        obj: null,
    };
}

function addMonsterObj(m) {
    const kind = MONSTER_KINDS[m.kindKey];
    const p = gridToPx(m.col, m.row);
    m.obj = makeGlyph(kind.glyph, p.x, p.y, kind.color, 4);
}

function itemGlyphAndColor(it) {
    if (it.type === "potion") return { glyph: "!", col: POTION_COLOR };
    if (it.type === "scroll") return { glyph: "?", col: SCROLL_COLOR };
    if (it.type === "food") return { glyph: "%", col: FOOD_COLOR };
    if (it.type === "gold") return { glyph: "$", col: GOLD_COLOR };
    if (it.type === "weapon") return { glyph: ")", col: WEAPON_COLOR };
    return { glyph: "[", col: ARMOR_COLOR };
}

function addLootItem(type, col, row, kind) {
    const p = gridToPx(col, row);
    const it = { col, row, type, kind, obj: null };
    const g = itemGlyphAndColor(it);
    it.obj = makeGlyph(g.glyph, p.x, p.y, g.col, 3);
    items.push(it);
}

function spawnItems() {
    const potionCount = randInt(1, 2);
    for (let i = 0; i < potionCount; i++) {
        const spot = randomFreeFloorTile();
        if (spot) addLootItem("potion", spot.col, spot.row, POTION_KINDS[randInt(0, POTION_KINDS.length - 1)]);
    }
    if (rand(0, 1) < 0.55) {
        const spot = randomFreeFloorTile();
        if (spot) addLootItem("scroll", spot.col, spot.row, SCROLL_KINDS[randInt(0, SCROLL_KINDS.length - 1)]);
    }
    const foodCount = randInt(1, 2);
    for (let i = 0; i < foodCount; i++) {
        const spot = randomFreeFloorTile();
        if (spot) addLootItem("food", spot.col, spot.row);
    }
    const goldCount = randInt(2, 4);
    for (let i = 0; i < goldCount; i++) {
        const spot = randomFreeFloorTile();
        if (spot) addLootItem("gold", spot.col, spot.row);
    }
    if (rand(0, 1) < 0.35) {
        const spot = randomFreeFloorTile();
        if (spot) addLootItem("weapon", spot.col, spot.row);
    }
    if (rand(0, 1) < 0.3) {
        const spot = randomFreeFloorTile();
        if (spot) addLootItem("armor", spot.col, spot.row);
    }
}

function spawnTraps() {
    const trapCount = depth >= 2 ? randInt(1, 2) : randInt(0, 1);
    for (let i = 0; i < trapCount; i++) {
        const spot = randomFreeFloorTile();
        if (!spot) continue;
        traps.push({
            col: spot.col, row: spot.row,
            kind: rand(0, 1) < 0.5 ? "spike" : "teleport",
            revealed: false,
        });
    }
}

function spawnMonsters() {
    const count = Math.min(2 + depth, 10);
    const weighted = ["rat", "rat", "jackal", "jackal", "zombie", "lichen"];
    for (let i = 0; i < count; i++) {
        const spot = randomFreeFloorTile();
        if (!spot) break;
        const kindKey = weighted[randInt(0, weighted.length - 1)];
        const m = makeMonster(spot.col, spot.row, kindKey);
        addMonsterObj(m);
        monsters.push(m);
    }
}

function regenerateFloor() {
    clearBoardObjs();

    const { newRooms, playerCol, playerRow, stairCol, stairRow } = generateDungeon();
    rooms = newRooms;
    player.col = playerCol;
    player.row = playerRow;

    discovered = [];
    lit = [];
    for (let r = 0; r < GRID; r++) {
        discovered.push(new Array(GRID).fill(false));
        lit.push(new Array(GRID).fill(false));
    }

    tileObjs = [];
    for (let r = 0; r < GRID; r++) {
        const rowObjs = [];
        for (let c = 0; c < GRID; c++) {
            const p = gridToPx(c, r);
            const char = tileAt(c, r) === "wall" ? "#" : tileAt(c, r) === "stairs" ? ">" : ".";
            const obj = makeGlyph(char, p.x, p.y, FLOOR_DIM, 1);
            obj.hidden = true;
            rowObjs.push(obj);
        }
        tileObjs.push(rowObjs);
    }

    const pp = gridToPx(player.col, player.row);
    player.obj = makeGlyph("@", pp.x, pp.y, PLAYER_COLOR, 5);

    spawnMonsters();
    spawnItems();
    spawnTraps();

    recomputeVisibility();
    syncVisuals();
}

function recomputeVisibility() {
    lit = [];
    for (let r = 0; r < GRID; r++) lit.push(new Array(GRID).fill(false));

    const room = roomContaining(player.col, player.row);
    if (room) {
        for (let r = room.y; r < room.y + room.h; r++) {
            for (let c = room.x; c < room.x + room.w; c++) {
                lit[r][c] = true;
                discovered[r][c] = true;
            }
        }
    } else {
        lit[player.row][player.col] = true;
        discovered[player.row][player.col] = true;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
            const nc = player.col + dc, nr = player.row + dr;
            if (inBounds(nc, nr) && tileAt(nc, nr) !== "wall") {
                lit[nr][nc] = true;
                discovered[nr][nc] = true;
            }
        });
    }
}

function tileBaseColor(tt) {
    if (tt === "wall") return WALL_LIT;
    if (tt === "stairs") return STAIRS_COLOR;
    if (tt === "trap") return TRAP_COLOR;
    return FLOOR_LIT;
}

function tileDimColor(tt) {
    if (tt === "wall") return WALL_DIM;
    if (tt === "stairs") return lerpColor(WALL_DIM, STAIRS_COLOR, 0.4);
    if (tt === "trap") return TRAP_DIM;
    return FLOOR_DIM;
}

function syncVisuals() {
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            const obj = tileObjs[r][c];
            if (!discovered[r][c]) {
                obj.hidden = true;
                continue;
            }
            obj.hidden = false;
            const trap = trapAt(c, r);
            const tt = (trap && trap.revealed) ? "trap" : tileAt(c, r);
            const base = lit[r][c] ? tileBaseColor(tt) : tileDimColor(tt);
            obj.color = rgb(base[0], base[1], base[2]);
        }
    }
    monsters.forEach((m) => {
        m.obj.hidden = !lit[m.row][m.col];
    });
    items.forEach((it) => {
        it.obj.hidden = !lit[it.row][it.col];
    });
}

function revealTrap(trap) {
    trap.revealed = true;
    const p = gridToPx(trap.col, trap.row);
    destroy(tileObjs[trap.row][trap.col]);
    tileObjs[trap.row][trap.col] = makeGlyph("^", p.x, p.y, TRAP_COLOR, 1);
}

function triggerTrap(trap) {
    if (trap.kind === "spike") {
        const dmg = randInt(3, 7);
        player.hp -= dmg;
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg} (spike trap!)`, TRAP_COLOR);
        shake(4);
    } else {
        const spot = randomFreeFloorTile();
        if (spot) {
            player.col = spot.col;
            player.row = spot.row;
            player.obj.pos.x = gridToPx(spot.col, spot.row).x;
            player.obj.pos.y = gridToPx(spot.col, spot.row).y;
        }
        floatText(player.obj.pos.x, player.obj.pos.y - 10, "TRAP! teleported", TRAP_COLOR);
    }
    revealTrap(trap);
}

function killMonster(m) {
    destroy(m.obj);
    monsters = monsters.filter((m2) => m2 !== m);
    const p = gridToPx(m.col, m.row);
    floatText(p.x, p.y - 10, "slain", [255, 255, 255]);
}

function playerAttack(m) {
    m.awake = true;
    const dmg = Math.max(1, randInt(player.atkMin, player.atkMax) - m.def);
    m.hp -= dmg;
    const p = gridToPx(m.col, m.row);
    floatText(p.x, p.y - 10, `-${dmg}`, [255, 255, 255]);
    if (m.hp <= 0) {
        killMonster(m);
    }
}

function monsterAttack(m) {
    const dmg = Math.max(1, randInt(m.atkMin, m.atkMax) - player.def);
    player.hp -= dmg;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg}`, [220, 38, 38]);
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
        if (lit[m.row][m.col]) m.awake = true;
        const adjacent = Math.abs(m.col - player.col) + Math.abs(m.row - player.row) === 1;
        if (adjacent) {
            monsterAttack(m);
        } else if (m.awake && !MONSTER_KINDS[m.kindKey].stationary) {
            moveMonsterToward(m);
        }
    }
}

function potionRealName(kind) {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function applyPotionEffect(kind) {
    if (kind === "healing") {
        const heal = randInt(10, 16);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        return `+${heal}hp`;
    }
    if (kind === "poison") {
        const dmg = randInt(4, 8);
        player.hp -= dmg;
        return `-${dmg}hp`;
    }
    player.atkMin += 1;
    player.atkMax += 1;
    return "+STR";
}

function applyScrollEffect(kind) {
    if (kind === "enchant") {
        player.atkMin += 1;
        return "+ENCHANT";
    }
    const spot = randomFreeFloorTile();
    if (spot) {
        player.col = spot.col;
        player.row = spot.row;
        player.obj.pos.x = gridToPx(spot.col, spot.row).x;
        player.obj.pos.y = gridToPx(spot.col, spot.row).y;
    }
    return "TELEPORT";
}

function handlePickup(col, row) {
    const it = itemAt(col, row);
    if (!it) return;
    const px = player.obj.pos.x;
    const py = player.obj.pos.y - 10;

    if (it.type === "potion") {
        const key = `potion_${it.kind}`;
        const wasIdentified = identified[key];
        const suffix = applyPotionEffect(it.kind);
        identified[key] = true;
        const label = wasIdentified ? `${potionRealName(it.kind)} potion` : `${potionAppearance[it.kind]} potion (${potionRealName(it.kind)}!)`;
        floatText(px, py, `${label} ${suffix}`, POTION_COLOR);
    } else if (it.type === "scroll") {
        const key = `scroll_${it.kind}`;
        const wasIdentified = identified[key];
        const suffix = applyScrollEffect(it.kind);
        identified[key] = true;
        const label = wasIdentified ? `scroll of ${it.kind}` : `scroll "${scrollAppearance[it.kind]}" (${it.kind}!)`;
        floatText(px, py, `${label} ${suffix}`, SCROLL_COLOR);
    } else if (it.type === "food") {
        const gain = randInt(300, 500);
        player.satiation = Math.min(SATIATION_MAX, player.satiation + gain);
        floatText(px, py, "+food", FOOD_COLOR);
    } else if (it.type === "gold") {
        const g = randInt(5, 15);
        player.gold += g;
        floatText(px, py, `+${g}g`, GOLD_COLOR);
    } else if (it.type === "weapon") {
        player.atkMin += 1;
        player.atkMax += 1;
        floatText(px, py, "+1 ATK (blade)", WEAPON_COLOR);
    } else if (it.type === "armor") {
        player.def += 1;
        floatText(px, py, "+1 DEF (armor)", ARMOR_COLOR);
    }
    destroy(it.obj);
    items = items.filter((i) => i !== it);
}

function applyHunger() {
    player.satiation = Math.max(0, player.satiation - SATIATION_DECAY);
    let dmg = 0;
    if (player.satiation <= 0) dmg = 2;
    else if (player.satiation <= 100) dmg = 1;
    if (dmg > 0) {
        player.hp -= dmg;
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `-${dmg} (${statusLabel().toLowerCase()})`, [255, 120, 60]);
    }
}

function nextDepth() {
    depth += 1;
    floatText(player.obj.pos.x, player.obj.pos.y - 10, `Depth ${depth}`, STAIRS_COLOR);
    regenerateFloor();
    updateHud();
}

function afterPlayerAction() {
    applyHunger();
    monsterPhase();
    recomputeVisibility();
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

    const trap = trapAt(tcol, trow);
    if (trap && !trap.revealed) {
        triggerTrap(trap);
        if (player.hp <= 0) {
            afterPlayerAction();
            return;
        }
    }

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
    showOverlay(
        "You Died",
        `Reached depth ${depth} with ${player.gold} gold. Score: ${finalScore}. Choose a class to try again.`
    );
    classRow.hidden = false;
}

function startGame(className) {
    const stats = CLASS_STATS[className];
    depth = 1;
    player.hp = stats.hp;
    player.maxHp = stats.hp;
    player.atkMin = stats.atkMin;
    player.atkMax = stats.atkMax;
    player.def = stats.def;
    player.gold = 0;
    player.satiation = SATIATION_MAX;

    const potionNames = shuffle(POTION_APPEARANCE_POOL);
    potionAppearance = {};
    POTION_KINDS.forEach((k, i) => { potionAppearance[k] = potionNames[i]; });

    const scrollNames = shuffle(SCROLL_APPEARANCE_POOL);
    scrollAppearance = {};
    SCROLL_KINDS.forEach((k, i) => { scrollAppearance[k] = scrollNames[i]; });

    identified = {};

    regenerateFloor();
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

window.addEventListener("keydown", (e) => {
    if (state !== "playing") return;
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
    monsters.forEach((m) => {
        if (!m.obj) return;
        const target = gridToPx(m.col, m.row);
        m.obj.pos.x = lerp(m.obj.pos.x, target.x, t);
        m.obj.pos.y = lerp(m.obj.pos.y, target.y, t);
    });
});

regenerateFloor();
updateHud();

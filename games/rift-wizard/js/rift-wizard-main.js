const GRID = 12;
const TILE = 30;
const GAME_WIDTH = GRID * TILE;
const GAME_HEIGHT = GRID * TILE;
const BEST_SCORE_KEY = "riftWizardBestScore";
const LERP_RATE = 14;
const SLEEP_RADIUS = 4;
const MAX_SPELLS = 4;
const MANA_REGEN = 2;
const STARTING_SPELLS = ["magicmissile", "heal"];

const WALL_COLOR = [26, 18, 46];
const FLOOR_COLOR = [52, 38, 84];
const STAIRS_COLOR = [34, 211, 238];
const PLAYER_COLOR = [243, 240, 251];
const MONSTER_AWAKE_COLOR = [248, 113, 113];
const MONSTER_ASLEEP_COLOR = [110, 55, 55];
const FROZEN_TINT = [125, 211, 252];
const POISON_TINT = [74, 222, 128];
const MANA_POTION_COLOR = [34, 211, 238];
const HEALTH_POTION_COLOR = [244, 63, 94];

const MAGIC_MISSILE_COLOR = [243, 240, 251];
const FIREBALL_COLOR = [251, 146, 60];
const ICE_COLOR = [125, 211, 252];
const LIGHTNING_COLOR = [250, 204, 21];
const HEAL_COLOR = [74, 222, 128];
const POISON_COLOR = [74, 222, 128];
const BLINK_COLOR = [168, 85, 247];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [10, 6, 32],
    letterbox: true,
    global: true,
});

const hudFloor = document.getElementById("hud-floor");
const hudHp = document.getElementById("hud-hp");
const hudMana = document.getElementById("hud-mana");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");
const spellOverlay = document.getElementById("spell-overlay");
const spellChoiceRow = document.getElementById("spell-choice-row");
const spellBar = document.getElementById("spell-bar");

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
let spellbook = [...STARTING_SPELLS];

let player = {
    col: 0, row: 0, hp: 14, maxHp: 14,
    mana: 10, maxMana: 10,
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

function gridToPx(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function chebyshev(aCol, aRow, bCol, bRow) {
    return Math.max(Math.abs(aCol - bCol), Math.abs(aRow - bRow));
}

function currentScore() {
    return floorNum * 100 + killCount * 10 + spellbook.length * 15;
}

function updateHud() {
    hudFloor.textContent = floorNum;
    hudHp.textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
    hudMana.textContent = `${Math.max(0, player.mana)}/${player.maxMana}`;
    hudBest.textContent = best;
    spellbook.forEach((key, idx) => {
        const btn = document.getElementById(`spell-btn-${idx}`);
        if (!btn) return;
        btn.disabled = state !== "playing" || player.mana < SPELL_DEFS[key].manaCost;
    });
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

function randomFreeFloorTile() {
    let guard = 0;
    while (guard < 300) {
        guard++;
        const room = rooms[randInt(0, rooms.length - 1)];
        const c = randInt(room.x, room.x + room.w - 1);
        const r = randInt(room.y, room.y + room.h - 1);
        if (grid[r][c] !== "floor") continue;
        if (monsterAt(c, r) || itemAt(c, r)) continue;
        if (c === player.col && r === player.row) continue;
        return { col: c, row: r };
    }
    return null;
}

function findNearestEnemyInRange(range) {
    let best = null;
    let bestDist = Infinity;
    monsters.forEach((m) => {
        const d = chebyshev(m.col, m.row, player.col, player.row);
        if (d <= range && d < bestDist) {
            bestDist = d;
            best = m;
        }
    });
    return best;
}

function findAlignedEnemyInRange(range) {
    let best = null;
    let bestDist = Infinity;
    monsters.forEach((m) => {
        let d = null;
        if (m.row === player.row) d = Math.abs(m.col - player.col);
        else if (m.col === player.col) d = Math.abs(m.row - player.row);
        if (d !== null && d <= range && d < bestDist) {
            bestDist = d;
            best = m;
        }
    });
    return best;
}

function damageMonster(m, dmg, colorArr) {
    m.hp -= dmg;
    const p = gridToPx(m.col, m.row);
    floatText(p.x, p.y - 10, `-${dmg}`, colorArr);
    if (m.hp <= 0) killMonster(m);
}

const SPELL_DEFS = {
    magicmissile: {
        name: "Magic Missile", short: "MM", manaCost: 2,
        cast: () => {
            const t = findNearestEnemyInRange(5);
            if (!t) return false;
            damageMonster(t, randInt(3, 6), MAGIC_MISSILE_COLOR);
            return true;
        },
    },
    fireball: {
        name: "Fireball", short: "FB", manaCost: 4,
        cast: () => {
            const t = findNearestEnemyInRange(4);
            if (!t) return false;
            const targets = [t, ...monsters.filter((m) => m !== t && Math.abs(m.col - t.col) + Math.abs(m.row - t.row) <= 1)];
            targets.forEach((m) => damageMonster(m, randInt(4, 7), FIREBALL_COLOR));
            shake(3);
            return true;
        },
    },
    icelance: {
        name: "Ice Lance", short: "IL", manaCost: 3,
        cast: () => {
            const t = findNearestEnemyInRange(4);
            if (!t) return false;
            t.frozenTurns = (t.frozenTurns || 0) + 2;
            damageMonster(t, randInt(3, 5), ICE_COLOR);
            return true;
        },
    },
    lightning: {
        name: "Lightning", short: "LB", manaCost: 3,
        cast: () => {
            const t = findAlignedEnemyInRange(6);
            if (!t) return false;
            const line = t.row === player.row
                ? monsters.filter((m) => m.row === player.row && Math.abs(m.col - player.col) <= 6)
                : monsters.filter((m) => m.col === player.col && Math.abs(m.row - player.row) <= 6);
            line.forEach((m) => damageMonster(m, randInt(3, 5), LIGHTNING_COLOR));
            return true;
        },
    },
    heal: {
        name: "Heal", short: "HL", manaCost: 4,
        cast: () => {
            const amt = randInt(6, 10);
            player.hp = Math.min(player.maxHp, player.hp + amt);
            floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${amt}hp`, HEAL_COLOR);
            return true;
        },
    },
    poison: {
        name: "Poison Cloud", short: "PC", manaCost: 3,
        cast: () => {
            const t = findNearestEnemyInRange(4);
            if (!t) return false;
            t.poisonTurns = 3;
            t.poisonDmg = 2;
            const p = gridToPx(t.col, t.row);
            floatText(p.x, p.y - 10, "poisoned", POISON_COLOR);
            return true;
        },
    },
    blink: {
        name: "Blink", short: "BL", manaCost: 2,
        cast: () => {
            const spot = randomFreeFloorTile();
            if (!spot) return false;
            player.col = spot.col;
            player.row = spot.row;
            player.obj.pos.x = gridToPx(spot.col, spot.row).x;
            player.obj.pos.y = gridToPx(spot.col, spot.row).y;
            floatText(player.obj.pos.x, player.obj.pos.y - 10, "blink!", BLINK_COLOR);
            return true;
        },
    },
};
const SPELL_POOL = Object.keys(SPELL_DEFS);

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
        outline(2, rgb(90, 60, 140)),
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
            awake: false,
            frozenTurns: 0,
            poisonTurns: 0,
            poisonDmg: 0,
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
            outline(2, rgb(50, 10, 10)),
            z(4),
        ]);
    });

    const manaPotionCount = randInt(1, 2);
    for (let i = 0; i < manaPotionCount; i++) {
        const spot = freeFloorTile(occupied);
        if (spot) items.push({ col: spot.col, row: spot.row, type: "manapotion", obj: null });
    }
    const healthPotionCount = randInt(1, 2);
    for (let i = 0; i < healthPotionCount; i++) {
        const spot = freeFloorTile(occupied);
        if (spot) items.push({ col: spot.col, row: spot.row, type: "healthpotion", obj: null });
    }
    items.forEach((it) => {
        const ip = gridToPx(it.col, it.row);
        const col2 = it.type === "manapotion" ? MANA_POTION_COLOR : HEALTH_POTION_COLOR;
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
        let col2;
        if (m.frozenTurns > 0) col2 = FROZEN_TINT;
        else if (m.poisonTurns > 0) col2 = POISON_TINT;
        else col2 = m.awake ? MONSTER_AWAKE_COLOR : MONSTER_ASLEEP_COLOR;
        m.obj.color = rgb(col2[0], col2[1], col2[2]);
    });
}

function killMonster(m) {
    destroy(m.obj);
    monsters = monsters.filter((m2) => m2 !== m);
    killCount += 1;
}

function monsterAttack(m) {
    const dmg = Math.max(1, randInt(m.atkMin, m.atkMax));
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
        if (m.poisonTurns > 0) {
            m.hp -= m.poisonDmg;
            m.poisonTurns -= 1;
            const p = gridToPx(m.col, m.row);
            floatText(p.x, p.y - 10, `-${m.poisonDmg}`, POISON_TINT);
            if (m.hp <= 0) {
                killMonster(m);
                continue;
            }
        }
        if (m.frozenTurns > 0) {
            m.frozenTurns -= 1;
            continue;
        }
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
    if (it.type === "manapotion") {
        const gain = randInt(4, 7);
        player.mana = Math.min(player.maxMana, player.mana + gain);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${gain} mana`, MANA_POTION_COLOR);
    } else if (it.type === "healthpotion") {
        const heal = randInt(6, 10);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        floatText(player.obj.pos.x, player.obj.pos.y - 10, `+${heal}hp`, HEALTH_POTION_COLOR);
    }
    destroy(it.obj);
    items = items.filter((i) => i !== it);
}

function afterPlayerAction() {
    player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN);
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

function castSpell(key) {
    if (state !== "playing") return;
    if (!spellbook.includes(key)) return;
    const def = SPELL_DEFS[key];
    if (player.mana < def.manaCost) {
        floatText(player.obj.pos.x, player.obj.pos.y - 10, "no mana", [160, 160, 160]);
        return;
    }
    const ok = def.cast();
    if (!ok) {
        floatText(player.obj.pos.x, player.obj.pos.y - 10, "no target", [160, 160, 160]);
        return;
    }
    player.mana -= def.manaCost;
    afterPlayerAction();
}

function renderSpellBar() {
    spellBar.innerHTML = "";
    spellbook.forEach((key, idx) => {
        const def = SPELL_DEFS[key];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mode-btn";
        btn.id = `spell-btn-${idx}`;
        btn.innerHTML = `${def.name}<span>${def.manaCost} mana</span>`;
        btn.addEventListener("click", () => castSpell(key));
        spellBar.appendChild(btn);
    });
}

function showSpellChoice(offers) {
    spellChoiceRow.innerHTML = "";
    offers.forEach((key) => {
        const def = SPELL_DEFS[key];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "class-btn";
        btn.innerHTML = `${def.name}<span>${def.manaCost} mana</span>`;
        btn.addEventListener("click", () => {
            spellbook.push(key);
            renderSpellBar();
            spellOverlay.hidden = true;
            state = "playing";
            nextFloor();
        });
        spellChoiceRow.appendChild(btn);
    });
    spellOverlay.hidden = false;
}

function arriveAtStairs() {
    const unclaimed = SPELL_POOL.filter((k) => !spellbook.includes(k));
    if (spellbook.length < MAX_SPELLS && unclaimed.length > 0) {
        state = "choosing";
        showSpellChoice(shuffle(unclaimed).slice(0, 2));
    } else {
        nextFloor();
    }
}

function nextFloor() {
    floorNum += 1;
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
        const dmg = Math.max(1, randInt(1, 3) - m.def);
        m.hp -= dmg;
        const p = gridToPx(m.col, m.row);
        floatText(p.x, p.y - 10, `-${dmg}`, [255, 255, 255]);
        if (m.hp <= 0) killMonster(m);
        afterPlayerAction();
        return;
    }

    if (tileAt(tcol, trow) === "wall") return;

    player.col = tcol;
    player.row = trow;
    handlePickup(tcol, trow);

    if (tileAt(tcol, trow) === "stairs") {
        arriveAtStairs();
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
        `Reached floor ${floorNum} with ${spellbook.length} spells, ${killCount} kills. Score: ${finalScore}. Press to try again.`,
        "Try Again"
    );
}

function startGame() {
    floorNum = 1;
    killCount = 0;
    spellbook = [...STARTING_SPELLS];
    player.hp = 14;
    player.maxHp = 14;
    player.mana = 10;
    player.maxMana = 10;
    regenerateLevel();
    renderSpellBar();
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
    } else if (e.key >= "1" && e.key <= "4") {
        const idx = Number(e.key) - 1;
        if (spellbook[idx]) castSpell(spellbook[idx]);
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
renderSpellBar();
updateHud();

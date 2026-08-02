const COLS = 9;
const ROWS = 14;
const TILE = 40;
const GAME_WIDTH = COLS * TILE;
const GAME_HEIGHT = ROWS * TILE;
const BEST_SCORE_KEY = "openttdBestCash";

const START_CASH = 300;
const TRACK_COST = 10;
const TRAIN_COST = 180;
const DELIVERY_INCOME = 35;
const TRAIN_SPEED = 110;

const ROUTES = [
    { producer: { col: 1, row: 2 }, consumer: { col: 7, row: 2 } },
    { producer: { col: 1, row: 7 }, consumer: { col: 7, row: 9 } },
    { producer: { col: 1, row: 12 }, consumer: { col: 7, row: 12 } },
];

const canvasEl = document.getElementById("game-canvas");

kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: canvasEl,
    background: [16, 22, 18],
    letterbox: true,
    global: true,
});

const hudScore = document.getElementById("hud-score");
const hudBest = document.getElementById("hud-best");
const overlay = document.getElementById("overlay");
const overlayBtn = document.getElementById("overlay-btn");

let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
hudBest.textContent = best;

let state = "ready";
let cash = START_CASH;

const grid = [];
for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push({ type: "empty" });
    grid.push(row);
}

const routes = ROUTES.map((def, i) => ({
    id: i,
    producer: def.producer,
    consumer: def.consumer,
    connected: false,
    hasTrain: false,
}));

routes.forEach((r) => {
    grid[r.producer.row][r.producer.col] = { type: "producer", routeId: r.id };
    grid[r.consumer.row][r.consumer.col] = { type: "consumer", routeId: r.id };
});

function tileCenter(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function updateHud() {
    hudScore.textContent = Math.floor(cash);
    hudBest.textContent = best;
}

const tileObjs = {};

function drawTile(col, row, col1, col2, col3) {
    const key = `${col},${row}`;
    if (tileObjs[key]) destroy(tileObjs[key]);
    tileObjs[key] = add([
        pos(col * TILE + 2, row * TILE + 2),
        rect(TILE - 4, TILE - 4),
        color(col1, col2, col3),
        z(1),
    ]);
}

routes.forEach((r) => {
    drawTile(r.producer.col, r.producer.row, 74, 222, 128);
    drawTile(r.consumer.col, r.consumer.row, 96, 165, 250);
});

const buyPrompts = {};

function refreshBuyPrompt(route) {
    const key = route.id;
    if (buyPrompts[key]) {
        destroy(buyPrompts[key]);
        delete buyPrompts[key];
    }
    if (route.connected && !route.hasTrain) {
        const c = tileCenter(route.consumer.col, route.consumer.row);
        buyPrompts[key] = add([
            pos(c.x, c.y - TILE / 2 - 8),
            anchor("center"),
            text("BUY", { size: 12 }),
            color(251, 191, 36),
            z(6),
        ]);
    }
}

function neighbors(col, row) {
    return [
        { col: col + 1, row },
        { col: col - 1, row },
        { col, row: row + 1 },
        { col, row: row - 1 },
    ].filter((p) => p.col >= 0 && p.col < COLS && p.row >= 0 && p.row < ROWS);
}

function passable(col, row, routeId) {
    const cell = grid[row][col];
    if (cell.type === "track") return true;
    if (cell.type === "producer" && cell.routeId === routeId) return true;
    if (cell.type === "consumer" && cell.routeId === routeId) return true;
    return false;
}

function findPath(route) {
    const start = route.producer;
    const goal = route.consumer;
    const key = (p) => `${p.col},${p.row}`;
    const visited = new Set([key(start)]);
    const cameFrom = {};
    const queue = [start];
    while (queue.length) {
        const cur = queue.shift();
        if (cur.col === goal.col && cur.row === goal.row) {
            const path = [cur];
            let k = key(cur);
            while (cameFrom[k]) {
                path.unshift(cameFrom[k]);
                k = key(cameFrom[k]);
            }
            return path;
        }
        for (const n of neighbors(cur.col, cur.row)) {
            const k = key(n);
            if (visited.has(k)) continue;
            if (!passable(n.col, n.row, route.id)) continue;
            visited.add(k);
            cameFrom[k] = cur;
            queue.push(n);
        }
    }
    return null;
}

function checkConnections() {
    routes.forEach((route) => {
        if (route.connected) return;
        const path = findPath(route);
        if (path) {
            route.connected = true;
            route.path = path.map((p) => tileCenter(p.col, p.row));
            refreshBuyPrompt(route);
        }
    });
}

function buildTrack(col, row) {
    if (state !== "playing") return;
    const cell = grid[row][col];
    if (cell.type !== "empty") return;
    if (cash < TRACK_COST) return;
    cash -= TRACK_COST;
    grid[row][col] = { type: "track" };
    drawTile(col, row, 120, 113, 98);
    checkConnections();
    updateHud();
}

let trains = [];

function buyTrain(route) {
    if (cash < TRAIN_COST) return;
    cash -= TRAIN_COST;
    route.hasTrain = true;
    refreshBuyPrompt(route);
    const start = route.path[0];
    const obj = add([
        pos(start.x, start.y),
        anchor("center"),
        rect(TILE * 0.5, TILE * 0.5),
        color(251, 191, 36),
        outline(2, rgb(120, 80, 10)),
        z(8),
    ]);
    trains.push({ obj, path: route.path, segment: 0, forward: true });
    updateHud();
}

function tryBuy(col, row) {
    const cell = grid[row][col];
    if (cell.type !== "consumer") return;
    const route = routes[cell.routeId];
    if (route.connected && !route.hasTrain) buyTrain(route);
}

canvasEl.addEventListener("pointerdown", (e) => {
    if (state !== "playing") {
        startGame();
        return;
    }
    const rect = canvasEl.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
    const py = ((e.clientY - rect.top) / rect.height) * GAME_HEIGHT;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    const cellType = grid[row][col].type;
    if (cellType === "consumer") tryBuy(col, row);
    else if (cellType === "empty") buildTrack(col, row);
});

overlayBtn.addEventListener("click", startGame);

function startGame() {
    if (state === "playing") return;
    state = "playing";
    overlay.hidden = true;
    updateHud();
}

function moveTrain(train, dtv) {
    const target = train.path[train.segment];
    const dx = target.x - train.obj.pos.x;
    const dy = target.y - train.obj.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = TRAIN_SPEED * dtv;
    if (dist <= step) {
        train.obj.pos.x = target.x;
        train.obj.pos.y = target.y;
        if (train.forward) {
            train.segment++;
            if (train.segment >= train.path.length) {
                train.segment = train.path.length - 1;
                train.forward = false;
                cash += DELIVERY_INCOME;
                if (cash > best) {
                    best = cash;
                    localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(best)));
                }
            }
        } else {
            train.segment--;
            if (train.segment < 0) {
                train.segment = 0;
                train.forward = true;
            }
        }
    } else {
        train.obj.pos.x += (dx / dist) * step;
        train.obj.pos.y += (dy / dist) * step;
    }
}

onUpdate(() => {
    if (state !== "playing") return;
    const dtv = dt();
    trains.forEach((t) => moveTrain(t, dtv));
    updateHud();
});

updateHud();

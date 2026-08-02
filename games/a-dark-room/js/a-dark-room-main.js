const SAVE_KEY = "aDarkRoomSave";
const TICK_MS = 1000;
const FIRE_STAGES = ["dead", "smoldering", "flickering", "burning", "roaring"];
const FIRE_DECAY_TICKS = 12;
const STOKE_WOOD_COST = 1;

const WOOD_GATHER_MIN = 1;
const WOOD_GATHER_MAX = 3;
const WOOD_PER_GATHERER = 2;
const MEAT_PER_HUNTER = 1;
const HUNTER_FUR_CHANCE = 0.15;
const TRAP_FUR_CHANCE = 0.6;

const HUT_CAPACITY = 4;
const ARRIVAL_CHANCE = 0.04;
const BASE_CAP = 20;
const CART_CAP_BONUS = 30;
const SMOKEHOUSE_CAP_BONUS = 50;

const BUILD_UNLOCK_WOOD = 5;
const TRAP_UNLOCK_WOOD = 20;
const CART_UNLOCK_WOOD = 50;
const WORKSHOP_UNLOCK_WOOD = 30;
const WORKSHOP_UNLOCK_FUR = 5;
const SMOKEHOUSE_UNLOCK_MEAT = 20;

const AMBIENT_LINES = [
    "The fire crackles.",
    "Wind rattles the walls outside.",
    "Something shifts in the dark beyond the light.",
    "The room settles into quiet.",
    "A log shifts and sparks.",
];

function defaultState() {
    return {
        fire: 1,
        fireDecay: 0,
        wood: 0,
        fur: 0,
        meat: 0,
        carts: 0,
        smokehouses: 0,
        population: 0,
        jobs: { gatherer: 0, hunter: 0 },
        huts: 0,
        traps: 0,
        workshops: 0,
        sharpenedTools: false,
        insulated: false,
        unlocked: { gatherWood: false, build: false, trap: false, cart: false, workshop: false, smokehouse: false, craft: false },
        log: ["A fire, almost dead, flickers in the dark room."],
    };
}

let state = loadState();
let stokeCooldown = false;

function loadState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return defaultState();
        const saved = JSON.parse(raw);
        const fresh = defaultState();
        return Object.assign(fresh, saved, {
            jobs: Object.assign(fresh.jobs, saved.jobs),
            unlocked: Object.assign(fresh.unlocked, saved.unlocked),
            log: Array.isArray(saved.log) && saved.log.length ? saved.log : fresh.log,
        });
    } catch (e) {
        return defaultState();
    }
}

function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function addLog(message) {
    state.log.push(message);
    if (state.log.length > 60) state.log.shift();
}

function idlePopulation() {
    return state.population - state.jobs.gatherer - state.jobs.hunter;
}

function populationCap() {
    return state.huts * HUT_CAPACITY;
}

function storageCap() {
    return BASE_CAP + state.carts * CART_CAP_BONUS + state.smokehouses * SMOKEHOUSE_CAP_BONUS;
}

function clampResources() {
    const cap = storageCap();
    state.wood = Math.min(state.wood, cap);
    state.fur = Math.min(state.fur, cap);
    state.meat = Math.min(state.meat, cap);
}

function buildingCost(base, growth, owned) {
    return Math.round(base * Math.pow(growth, owned));
}

const BUILDINGS = [
    {
        key: "huts",
        name: "Hut",
        desc: "Shelter for one more family. +4 population capacity.",
        cost: () => ({ wood: buildingCost(8, 1.6, state.huts) }),
        visible: () => state.unlocked.build,
        onBuild: () => {
            state.huts++;
            if (state.huts === 1) {
                addLog("A shivering stranger slips in from the night and settles by the fire.");
                state.population++;
            } else {
                addLog("Villagers raise another hut against the cold.");
            }
        },
    },
    {
        key: "traps",
        name: "Trap",
        desc: "A snare line at the treeline. Passively catches fur.",
        cost: () => ({ wood: buildingCost(12, 1.5, state.traps) }),
        visible: () => state.unlocked.trap,
        onBuild: () => {
            state.traps++;
            addLog("A new trap is staked out along the treeline.");
        },
    },
    {
        key: "carts",
        name: "Cart",
        desc: "More room to haul and store supplies. +30 to all storage.",
        cost: () => ({ wood: buildingCost(25, 1.6, state.carts) }),
        visible: () => state.unlocked.cart,
        onBuild: () => {
            state.carts++;
            addLog("A sturdy cart widens what the room can hold.");
        },
    },
    {
        key: "workshops",
        name: "Workshop",
        desc: "Unlocks crafting. Villagers can improve their tools.",
        cost: () => ({ wood: 40, fur: 10 }),
        visible: () => state.unlocked.workshop,
        max: 1,
        onBuild: () => {
            state.workshops++;
            state.unlocked.craft = true;
            addLog("With steady hands, the villagers raise a workshop from timber and rope.");
        },
    },
    {
        key: "smokehouses",
        name: "Smokehouse",
        desc: "Cures meat for the lean days. +50 meat storage, steady food.",
        cost: () => ({ wood: 30, meat: 15 }),
        visible: () => state.unlocked.smokehouse,
        max: 1,
        onBuild: () => {
            state.smokehouses++;
            addLog("Smoke curls from the new smokehouse, thick with the smell of cured meat.");
        },
    },
];

const CRAFTS = [
    {
        key: "sharpenedTools",
        name: "Sharpen Tools",
        desc: "Gatherers bring back more wood each trip.",
        cost: () => ({ wood: 20, fur: 10 }),
        onCraft: () => {
            state.sharpenedTools = true;
            addLog("The gatherers' tools are honed sharp and true.");
        },
    },
    {
        key: "insulated",
        name: "Insulate Room",
        desc: "Packed earth and hide slow the fire's decay.",
        cost: () => ({ wood: 20, fur: 10 }),
        onCraft: () => {
            state.insulated = true;
            addLog("Hide and packed earth line the walls, holding the warmth in.");
        },
    },
];

function canAfford(cost) {
    return Object.keys(cost).every((res) => (state[res] || 0) >= cost[res]);
}

function pay(cost) {
    Object.keys(cost).forEach((res) => {
        state[res] -= cost[res];
    });
}

function formatCost(cost) {
    return Object.keys(cost)
        .map((res) => `${cost[res]} ${res}`)
        .join(", ");
}

function stokeFire() {
    if (state.fire >= FIRE_STAGES.length - 1) return;
    const costsWood = state.unlocked.gatherWood;
    if (costsWood) {
        if (state.wood < STOKE_WOOD_COST) {
            addLog("There's no wood left to feed the fire.");
            render();
            return;
        }
        state.wood -= STOKE_WOOD_COST;
    }
    state.fire = Math.min(FIRE_STAGES.length - 1, state.fire + 1);
    state.fireDecay = 0;
    if (state.fire === 3 && !state.unlocked.gatherWood) {
        state.unlocked.gatherWood = true;
        addLog("The room is bare, but warm firelight reaches into its corners. Wood, gathered from outside, could keep it burning.");
    }
    render();
}

function gatherWood() {
    const bonus = state.sharpenedTools ? 1 : 0;
    const gained = Math.floor(Math.random() * (WOOD_GATHER_MAX - WOOD_GATHER_MIN + 1)) + WOOD_GATHER_MIN + bonus;
    state.wood = Math.min(storageCap(), state.wood + gained);
    checkMilestones();
    render();
}

function assignJob(job, delta) {
    if (delta > 0 && idlePopulation() <= 0) return;
    if (delta < 0 && state.jobs[job] <= 0) return;
    state.jobs[job] += delta;
    render();
}

function buildItem(building) {
    const cost = building.cost();
    if (building.max && state[building.key] >= building.max) return;
    if (!canAfford(cost)) return;
    pay(cost);
    building.onBuild();
    checkMilestones();
    render();
}

function craftItem(craft) {
    if (state[craft.key]) return;
    const cost = craft.cost();
    if (!canAfford(cost)) return;
    pay(cost);
    craft.onCraft();
    render();
}

function checkMilestones() {
    if (!state.unlocked.build && state.wood >= BUILD_UNLOCK_WOOD) {
        state.unlocked.build = true;
        addLog("There's enough wood to build something more than a memory of shelter.");
    }
    if (!state.unlocked.trap && state.wood >= TRAP_UNLOCK_WOOD) {
        state.unlocked.trap = true;
        addLog("Fur from the woods could be worth snaring, if there were traps for it.");
    }
    if (!state.unlocked.cart && state.wood >= CART_UNLOCK_WOOD) {
        state.unlocked.cart = true;
        addLog("The wood pile strains against the room's limits. A cart would help.");
    }
    if (!state.unlocked.workshop && state.wood >= WORKSHOP_UNLOCK_WOOD && state.fur >= WORKSHOP_UNLOCK_FUR) {
        state.unlocked.workshop = true;
        addLog("There's enough material now to raise a proper workshop.");
    }
    if (!state.unlocked.smokehouse && state.meat >= SMOKEHOUSE_UNLOCK_MEAT) {
        state.unlocked.smokehouse = true;
        addLog("So much meat, some of it should be smoked before it spoils.");
    }
}

function tick() {
    state.fireDecay++;
    const decayLimit = state.insulated ? Math.round(FIRE_DECAY_TICKS * 1.5) : FIRE_DECAY_TICKS;
    if (state.fireDecay >= decayLimit && state.fire > 0) {
        state.fire--;
        state.fireDecay = 0;
        if (state.fire === 0) addLog("The fire has gone out. The room is cold and dark.");
    }

    const woodGain = state.jobs.gatherer * WOOD_PER_GATHERER * (state.sharpenedTools ? 1.5 : 1);
    state.wood = Math.min(storageCap(), state.wood + woodGain);

    let meatGain = state.jobs.hunter * MEAT_PER_HUNTER;
    if (state.smokehouses > 0) meatGain += state.smokehouses;
    state.meat = Math.min(storageCap(), state.meat + meatGain);

    for (let i = 0; i < state.jobs.hunter; i++) {
        if (Math.random() < HUNTER_FUR_CHANCE) state.fur = Math.min(storageCap(), state.fur + 1);
    }
    for (let i = 0; i < state.traps; i++) {
        if (Math.random() < TRAP_FUR_CHANCE) state.fur = Math.min(storageCap(), state.fur + 1);
    }

    const upkeep = Math.floor(state.population / 2);
    state.meat = Math.max(0, state.meat - upkeep);

    if (state.population < populationCap() && Math.random() < ARRIVAL_CHANCE) {
        state.population++;
        addLog("A weary traveler joins your fire.");
    }

    if (Math.random() < 0.05) {
        addLog(AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)]);
    }

    checkMilestones();
    saveState();
    render();
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function render() {
    const fireLabelEl = document.getElementById("fire-label");
    fireLabelEl.textContent = `the fire is ${FIRE_STAGES[state.fire]}`;

    const stokeBtn = document.getElementById("stoke-btn");
    stokeBtn.disabled = state.fire >= FIRE_STAGES.length - 1;

    const cap = storageCap();
    const resourceBar = document.getElementById("resource-bar");
    resourceBar.innerHTML = "";
    const resources = [
        ["Wood", Math.floor(state.wood), cap],
        ["Fur", Math.floor(state.fur), cap],
        ["Meat", Math.floor(state.meat), cap],
    ];
    resources.forEach(([label, value, max]) => {
        const span = el("span");
        const full = value >= max;
        span.innerHTML = `${label}: <strong class="${full ? "full" : ""}">${value}${full ? " (full)" : ""}</strong>`;
        resourceBar.appendChild(span);
    });
    const popSpan = el("span");
    popSpan.innerHTML = `Population: <strong>${state.population}</strong> / ${populationCap()} (${idlePopulation()} idle)`;
    resourceBar.appendChild(popSpan);

    const logBox = document.getElementById("log-box");
    const wasScrolledDown = logBox.scrollTop + logBox.clientHeight >= logBox.scrollHeight - 10;
    logBox.innerHTML = "";
    state.log.slice(-30).forEach((line) => {
        logBox.appendChild(el("p", null, line));
    });
    if (wasScrolledDown || state.log.length <= 30) logBox.scrollTop = logBox.scrollHeight;

    const gatherPanel = document.getElementById("gather-panel");
    gatherPanel.hidden = !state.unlocked.gatherWood;

    const jobsPanel = document.getElementById("jobs-panel");
    jobsPanel.hidden = state.population <= 0;
    if (state.population > 0) {
        const jobsList = document.getElementById("jobs-list");
        jobsList.innerHTML = "";
        [
            ["gatherer", "Gatherer", "Brings back wood from the treeline"],
            ["hunter", "Hunter", "Brings back meat, sometimes fur"],
        ].forEach(([key, label, sub]) => {
            const row = el("div", "row");
            const left = el("div");
            left.appendChild(el("span", "row-label", label));
            left.appendChild(el("span", "row-sub", sub));
            const controls = el("div", "row-controls");
            const minusBtn = el("button", "step-btn", "-");
            minusBtn.type = "button";
            minusBtn.disabled = state.jobs[key] <= 0;
            minusBtn.addEventListener("click", () => assignJob(key, -1));
            const count = el("span", "row-count", String(state.jobs[key]));
            const plusBtn = el("button", "step-btn", "+");
            plusBtn.type = "button";
            plusBtn.disabled = idlePopulation() <= 0;
            plusBtn.addEventListener("click", () => assignJob(key, 1));
            controls.appendChild(minusBtn);
            controls.appendChild(count);
            controls.appendChild(plusBtn);
            row.appendChild(left);
            row.appendChild(controls);
            jobsList.appendChild(row);
        });
    }

    const buildPanel = document.getElementById("build-panel");
    const visibleBuildings = BUILDINGS.filter((b) => b.visible());
    buildPanel.hidden = visibleBuildings.length === 0;
    if (visibleBuildings.length > 0) {
        const buildList = document.getElementById("build-list");
        buildList.innerHTML = "";
        visibleBuildings.forEach((building) => {
            const cost = building.cost();
            const maxedOut = building.max && state[building.key] >= building.max;
            const btn = el("button", "action-btn");
            btn.type = "button";
            const owned = state[building.key];
            btn.textContent = maxedOut
                ? `${building.name} — built`
                : `${building.name} (${owned}) — ${formatCost(cost)}`;
            btn.title = building.desc;
            btn.disabled = maxedOut || !canAfford(cost);
            btn.addEventListener("click", () => buildItem(building));
            buildList.appendChild(btn);
        });
    }

    const craftPanel = document.getElementById("craft-panel");
    const visibleCrafts = state.unlocked.craft ? CRAFTS.filter((c) => !state[c.key]) : [];
    craftPanel.hidden = visibleCrafts.length === 0;
    if (visibleCrafts.length > 0) {
        const craftList = document.getElementById("craft-list");
        craftList.innerHTML = "";
        visibleCrafts.forEach((craft) => {
            const cost = craft.cost();
            const btn = el("button", "action-btn");
            btn.type = "button";
            btn.textContent = `${craft.name} — ${formatCost(cost)}`;
            btn.title = craft.desc;
            btn.disabled = !canAfford(cost);
            btn.addEventListener("click", () => craftItem(craft));
            craftList.appendChild(btn);
        });
    }
}

document.getElementById("stoke-btn").addEventListener("click", stokeFire);
document.getElementById("gather-btn").addEventListener("click", gatherWood);
document.getElementById("reset-btn").addEventListener("click", () => {
    const btn = document.getElementById("reset-btn");
    if (!btn.classList.contains("confirming")) {
        btn.classList.add("confirming");
        btn.textContent = "Really reset?";
        setTimeout(() => {
            btn.classList.remove("confirming");
            btn.textContent = "Reset";
        }, 3000);
        return;
    }
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    btn.classList.remove("confirming");
    btn.textContent = "Reset";
    render();
});

setInterval(tick, TICK_MS);
clampResources();
render();

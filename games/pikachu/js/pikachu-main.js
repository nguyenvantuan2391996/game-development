let matrixGame = [];
let selected = [];
let lockBoard = false;
let moveCount = 0;
let pairsTotal = 0;
let pairsMatched = 0;
let cellSizePx = 64;
let boardKey = "";

let startTime = 0;
let penaltySeconds = 0;
let timerInterval = null;
let lastMatchTime = 0;
let comboCount = 0;

const pairsLeftEl = document.getElementById("pairs-left");
const moveCountEl = document.getElementById("move-count");
const boardSizeEl = document.getElementById("board-size");
const elapsedTimeEl = document.getElementById("elapsed-time");
const bestTimeEl = document.getElementById("best-time");
const btnHint = document.getElementById("btn-hint");
const btnShuffle = document.getElementById("btn-shuffle");

document.getElementById("btn-restart").addEventListener("click", () => {
  location.reload();
});
btnHint.addEventListener("click", useHint);
btnShuffle.addEventListener("click", () => shuffleBoard(true));

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function computeCellSize(maxDimension) {
  if (maxDimension <= 10) return 64;
  if (maxDimension <= 20) return 50;
  if (maxDimension <= 30) return 40;
  if (maxDimension <= 40) return 34;
  if (maxDimension <= 50) return 30;
  return 26;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function updateHUD() {
  pairsLeftEl.textContent = String(pairsTotal - pairsMatched);
  moveCountEl.textContent = String(moveCount);
}

function currentElapsedSeconds() {
  return Math.floor((Date.now() - startTime) / 1000) + penaltySeconds;
}

function updateTimerDisplay() {
  elapsedTimeEl.textContent = formatTime(currentElapsedSeconds());
}

function startTimer() {
  startTime = Date.now();
  penaltySeconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function loadBestTime() {
  const raw = localStorage.getItem(BEST_SCORE_PREFIX + boardKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function renderBestTime() {
  const best = loadBestTime();
  bestTimeEl.textContent = best ? formatTime(best.timeSec) : "--:--";
}

function saveBestTimeIfBetter(timeSec, moves) {
  const best = loadBestTime();
  if (!best || timeSec < best.timeSec) {
    localStorage.setItem(BEST_SCORE_PREFIX + boardKey, JSON.stringify({ timeSec, moves }));
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Connect-path check: two tiles can be matched if a line connecting them
// (going through empty cells and at most 2 turns, same rule as the classic
// Pikachu/Onet game) exists. The grid is treated as bordered by an extra
// walkable ring one cell outside the real board on every side. Returns the
// list of waypoints for the path (used both for validation and for drawing
// the connecting line), or null when no path exists.
// ---------------------------------------------------------------------------
function isCellEmpty(r, c) {
  if (r < 0 || r >= matrixGame.length || c < 0 || c >= matrixGame[0].length) {
    return true;
  }
  return matrixGame[r][c] === "";
}

function isPathClear(r1, c1, r2, c2) {
  if (r1 === r2) {
    const cMin = Math.min(c1, c2);
    const cMax = Math.max(c1, c2);
    for (let c = cMin + 1; c < cMax; c++) {
      if (!isCellEmpty(r1, c)) return false;
    }
    return true;
  }
  if (c1 === c2) {
    const rMin = Math.min(r1, r2);
    const rMax = Math.max(r1, r2);
    for (let r = rMin + 1; r < rMax; r++) {
      if (!isCellEmpty(r, c1)) return false;
    }
    return true;
  }
  return false;
}

function getConnectPath(a, b) {
  const [r1, c1] = a;
  const [r2, c2] = b;
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;

  if (isPathClear(r1, c1, r2, c2)) return [[r1, c1], [r2, c2]];

  if (isCellEmpty(r1, c2) && isPathClear(r1, c1, r1, c2) && isPathClear(r1, c2, r2, c2)) {
    return [[r1, c1], [r1, c2], [r2, c2]];
  }
  if (isCellEmpty(r2, c1) && isPathClear(r1, c1, r2, c1) && isPathClear(r2, c1, r2, c2)) {
    return [[r1, c1], [r2, c1], [r2, c2]];
  }

  for (let k = -1; k <= columns; k++) {
    if (!isCellEmpty(r1, k) || !isCellEmpty(r2, k)) continue;
    if (!isPathClear(r1, c1, r1, k)) continue;
    if (!isPathClear(r1, k, r2, k)) continue;
    if (!isPathClear(r2, k, r2, c2)) continue;
    return [[r1, c1], [r1, k], [r2, k], [r2, c2]];
  }

  for (let k = -1; k <= rows; k++) {
    if (!isCellEmpty(k, c1) || !isCellEmpty(k, c2)) continue;
    if (!isPathClear(r1, c1, k, c1)) continue;
    if (!isPathClear(k, c1, k, c2)) continue;
    if (!isPathClear(k, c2, r2, c2)) continue;
    return [[r1, c1], [k, c1], [k, c2], [r2, c2]];
  }

  return null;
}

function canConnect(a, b) {
  return getConnectPath(a, b) !== null;
}

function findHintPair() {
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;
  for (let r1 = 0; r1 < rows; r1++) {
    for (let c1 = 0; c1 < columns; c1++) {
      if (matrixGame[r1][c1] === "") continue;
      for (let r2 = r1; r2 < rows; r2++) {
        for (let c2 = r2 === r1 ? c1 + 1 : 0; c2 < columns; c2++) {
          if (matrixGame[r2][c2] === "") continue;
          if (matrixGame[r1][c1] !== matrixGame[r2][c2]) continue;
          const path = getConnectPath([r1, c1], [r2, c2]);
          if (path) return { a: { r: r1, c: c1 }, b: { r: r2, c: c2 }, path };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Connecting-line drawing (classic Onet-style visual feedback on a match)
// ---------------------------------------------------------------------------
function pxX(c) {
  return (c + 1) * cellSizePx + cellSizePx / 2;
}

function pxY(r) {
  return (r + 1) * cellSizePx + cellSizePx / 2;
}

function drawPathLine(path, className) {
  const svg = document.getElementById("path-line-svg");
  const points = path.map(([r, c]) => `${pxX(c)},${pxY(r)}`).join(" ");
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", points);
  polyline.setAttribute("class", className || "path-line");
  svg.appendChild(polyline);
  setTimeout(() => polyline.remove(), 700);
}

function showComboPopup(count, path) {
  const mid = path[Math.floor(path.length / 2)];
  const boardInner = document.getElementById("board-inner");
  const popup = document.createElement("div");
  popup.className = "combo-popup";
  popup.textContent = `Combo x${count}!`;
  popup.style.left = pxX(mid[1]) + "px";
  popup.style.top = pxY(mid[0]) + "px";
  boardInner.appendChild(popup);
  setTimeout(() => popup.remove(), 900);
}

function showToast(message, actionLabel, onAction) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = "toast";
  toast.innerHTML =
    `<span>${message}</span>` +
    (actionLabel ? `<button type="button" class="toast-btn">${actionLabel}</button>` : "");
  document.body.appendChild(toast);

  if (actionLabel && onAction) {
    toast.querySelector(".toast-btn").addEventListener("click", () => {
      toast.remove();
      onAction();
    });
  }
  setTimeout(() => {
    if (toast.isConnected) toast.remove();
  }, 5000);
}

function checkStuck() {
  if (pairsMatched >= pairsTotal) return;
  if (findHintPair()) return;
  showToast("No more matches available!", "Shuffle", () => shuffleBoard(false));
}

// ---------------------------------------------------------------------------
// Hint / shuffle actions
// ---------------------------------------------------------------------------
function useHint() {
  if (lockBoard || pairsMatched >= pairsTotal) return;

  const hint = findHintPair();
  if (!hint) {
    showToast("No more matches available!", "Shuffle", () => shuffleBoard(false));
    return;
  }

  penaltySeconds += HINT_PENALTY_SEC;
  updateTimerDisplay();

  const idA = hint.a.r + "-" + hint.a.c;
  const idB = hint.b.r + "-" + hint.b.c;
  document.getElementById("img-" + idA).classList.add("is-hint");
  document.getElementById("img-" + idB).classList.add("is-hint");
  drawPathLine(hint.path, "path-line path-line--hint");

  setTimeout(() => {
    document.getElementById("img-" + idA).classList.remove("is-hint");
    document.getElementById("img-" + idB).classList.remove("is-hint");
  }, 1100);
}

function shuffleBoard(manual) {
  if (lockBoard || pairsMatched >= pairsTotal) return;

  const positions = [];
  const values = [];
  for (let r = 0; r < matrixGame.length; r++) {
    for (let c = 0; c < matrixGame[0].length; c++) {
      if (matrixGame[r][c] !== "") {
        positions.push([r, c]);
        values.push(matrixGame[r][c]);
      }
    }
  }

  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  positions.forEach(([r, c], i) => {
    matrixGame[r][c] = values[i];
    document.getElementById("img-" + r + "-" + c).src = values[i];
  });

  selected.forEach((tile) => document.getElementById("img-" + tile.id).classList.remove("is-selected"));
  selected = [];

  if (manual) {
    penaltySeconds += SHUFFLE_PENALTY_SEC;
    updateTimerDisplay();
  }
}

function showWinModal() {
  const finalTime = currentElapsedSeconds();
  const isNewRecord = saveBestTimeIfBetter(finalTime, moveCount);
  renderBestTime();

  showModal({
    icon: "success",
    title: "Congratulations, you matched them all!",
    html:
      `Completed in <strong>${formatTime(finalTime)}</strong> with ${moveCount} moves.` +
      (isNewRecord ? "<br><span style=\"color:var(--accent-a)\">🏆 New record!</span>" : ""),
    actions: [
      { label: "Play Again", onClick: () => location.reload() },
      {
        label: "Back to Home",
        ghost: true,
        onClick: () => {
          window.location.href = "/game-development/games/pikachu/home.html";
        },
      },
    ],
  });
}

function handleClick(id) {
  if (lockBoard) return;

  const [r, c] = id.split("-").map(Number);
  if (matrixGame[r][c] === "") return; // already matched
  if (selected.some((tile) => tile.id === id)) return; // same tile already picked

  const imgEl = document.getElementById("img-" + id);
  imgEl.classList.add("is-selected");
  selected.push({ id, r, c });

  if (selected.length < 2) return;

  lockBoard = true;
  moveCount++;
  updateHUD();

  const [a, b] = selected;
  const sameImage = matrixGame[a.r][a.c] === matrixGame[b.r][b.c];
  const path = sameImage ? getConnectPath([a.r, a.c], [b.r, b.c]) : null;

  if (path) {
    drawPathLine(path);

    const now = Date.now();
    comboCount = now - lastMatchTime <= COMBO_WINDOW_MS ? comboCount + 1 : 1;
    lastMatchTime = now;
    if (comboCount >= 2) showComboPopup(comboCount, path);

    setTimeout(() => {
      document.getElementById("img-" + a.id).classList.add("is-cleared");
      document.getElementById("img-" + b.id).classList.add("is-cleared");
      matrixGame[a.r][a.c] = "";
      matrixGame[b.r][b.c] = "";
      pairsMatched++;
      updateHUD();
      selected = [];
      lockBoard = false;

      if (pairsMatched === pairsTotal) {
        stopTimer();
        setTimeout(showWinModal, 200);
      } else {
        checkStuck();
      }
    }, 250);
  } else {
    setTimeout(() => {
      document.getElementById("img-" + a.id).classList.remove("is-selected");
      document.getElementById("img-" + b.id).classList.remove("is-selected");
      selected = [];
      lockBoard = false;
    }, 500);
  }
}

function buildMatrix(rows, columns) {
  const totalCells = rows * columns;
  const available = [];
  for (let i = 0; i < totalCells; i++) available.push(i);

  const flat = new Array(totalCells).fill("");
  while (available.length > 0) {
    const imageId = getRandomInt(1, NUM_IMAGES + 1);
    for (let i = 0; i < 2 && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      const cell = available[idx];
      flat[cell] = "images/" + imageId + ".png";
      available.splice(idx, 1);
    }
  }

  const matrix = [];
  let k = 0;
  for (let row = 0; row < rows; row++) {
    const rowValues = [];
    for (let col = 0; col < columns; col++) {
      rowValues.push(flat[k]);
      k++;
    }
    matrix.push(rowValues);
  }
  return matrix;
}

function init() {
  matrixGame = [];
  selected = [];
  lockBoard = false;
  moveCount = 0;
  pairsMatched = 0;
  comboCount = 0;
  lastMatchTime = 0;

  const urlParams = new URLSearchParams(window.location.search);
  const rows = Number(urlParams.get("rows"));
  const columns = Number(urlParams.get("columns"));

  if (!rows || !columns) {
    window.location.href = "/game-development/games/pikachu/home.html";
    return;
  }

  pairsTotal = Math.floor((rows * columns) / 2);
  boardSizeEl.textContent = rows + " x " + columns;
  boardKey = rows + "x" + columns;
  renderBestTime();

  cellSizePx = computeCellSize(Math.max(rows, columns));
  document.documentElement.style.setProperty("--cell-size", cellSizePx + "px");

  matrixGame = buildMatrix(rows, columns);

  let tableContent = "";
  for (let row = 0; row < rows; row++) {
    tableContent += "<tr>";
    for (let col = 0; col < columns; col++) {
      const id = row + "-" + col;
      tableContent +=
        `<td class="td_game"><div id="${id}" onclick="handleClick(this.id)" class="fixed">` +
        `<img id="img-${id}" src="${matrixGame[row][col]}" alt=""></div></td>`;
    }
    tableContent += "</tr>";
  }

  document.getElementById("table_game_pikachu").innerHTML = tableContent;

  const svg = document.getElementById("path-line-svg");
  svg.setAttribute("width", (columns + 2) * cellSizePx);
  svg.setAttribute("height", (rows + 2) * cellSizePx);
  svg.style.width = (columns + 2) * cellSizePx + "px";
  svg.style.height = (rows + 2) * cellSizePx + "px";
  svg.style.top = -cellSizePx + "px";
  svg.style.left = -cellSizePx + "px";

  updateHUD();
  startTimer();
}

window.addEventListener("load", () => {
  init();
});

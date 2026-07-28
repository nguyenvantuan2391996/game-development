let matrixGame = [];
let selected = [];
let lockBoard = false;
let moveCount = 0;
let pairsTotal = 0;
let pairsMatched = 0;

const pairsLeftEl = document.getElementById("pairs-left");
const moveCountEl = document.getElementById("move-count");
const boardSizeEl = document.getElementById("board-size");

document.getElementById("btn-restart").addEventListener("click", () => {
  location.reload();
});

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

function updateHUD() {
  pairsLeftEl.textContent = String(pairsTotal - pairsMatched);
  moveCountEl.textContent = String(moveCount);
}

// ---------------------------------------------------------------------------
// Connect-path check: two tiles can be matched if a line connecting them
// (going through empty cells and at most 2 turns, same rule as the classic
// Pikachu/Onet game) exists. The grid is treated as bordered by an extra
// walkable ring one cell outside the real board on every side.
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

function canConnect(a, b) {
  const [r1, c1] = a;
  const [r2, c2] = b;
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;

  // straight line
  if (isPathClear(r1, c1, r2, c2)) return true;

  // one turn
  if (isCellEmpty(r1, c2) && isPathClear(r1, c1, r1, c2) && isPathClear(r1, c2, r2, c2)) {
    return true;
  }
  if (isCellEmpty(r2, c1) && isPathClear(r1, c1, r2, c1) && isPathClear(r2, c1, r2, c2)) {
    return true;
  }

  // two turns: horizontal from a, vertical through column k, horizontal into b
  for (let k = -1; k <= columns; k++) {
    if (!isCellEmpty(r1, k) || !isCellEmpty(r2, k)) continue;
    if (!isPathClear(r1, c1, r1, k)) continue;
    if (!isPathClear(r1, k, r2, k)) continue;
    if (!isPathClear(r2, k, r2, c2)) continue;
    return true;
  }

  // two turns: vertical from a, horizontal through row k, vertical into b
  for (let k = -1; k <= rows; k++) {
    if (!isCellEmpty(k, c1) || !isCellEmpty(k, c2)) continue;
    if (!isPathClear(r1, c1, k, c1)) continue;
    if (!isPathClear(k, c1, k, c2)) continue;
    if (!isPathClear(k, c2, r2, c2)) continue;
    return true;
  }

  return false;
}

function showWinModal() {
  showModal({
    icon: "success",
    title: "Chúc mừng, bạn đã ghép hết!",
    html: "Hoàn thành trong " + moveCount + " lượt chọn.",
    actions: [
      { label: "Chơi lại", onClick: () => location.reload() },
      {
        label: "Về trang chủ",
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
  const matched = sameImage && canConnect([a.r, a.c], [b.r, b.c]);

  if (matched) {
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
        setTimeout(showWinModal, 200);
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

  const urlParams = new URLSearchParams(window.location.search);
  const rows = Number(urlParams.get("rows"));
  const columns = Number(urlParams.get("columns"));

  if (!rows || !columns) {
    window.location.href = "/game-development/games/pikachu/home.html";
    return;
  }

  pairsTotal = Math.floor((rows * columns) / 2);
  boardSizeEl.textContent = rows + " x " + columns;

  document.documentElement.style.setProperty(
    "--cell-size",
    computeCellSize(Math.max(rows, columns)) + "px"
  );

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
  updateHUD();
}

window.addEventListener("load", () => {
  init();
});

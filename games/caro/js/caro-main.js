let player = X;
let matrixGame = [];
let typeGame = TWO_PLAYER;
let isFirst = true;
let moveCount = 0;

const turnIndicator = document.getElementById("turn-indicator");
const moveCountEl = document.getElementById("move-count");
const boardSizeEl = document.getElementById("board-size");
const boardWrap = document.getElementById("board-wrap");

document.getElementById("btn-restart").addEventListener("click", () => {
  location.reload();
});

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function computeCellSize(maxDimension) {
  if (maxDimension <= 10) return 56;
  if (maxDimension <= 20) return 46;
  if (maxDimension <= 30) return 38;
  if (maxDimension <= 40) return 32;
  if (maxDimension <= 50) return 28;
  return 24;
}

function updateHUD() {
  turnIndicator.textContent = player.toUpperCase();
  turnIndicator.classList.toggle("x", player === X);
  turnIndicator.classList.toggle("o", player === O);
  moveCountEl.textContent = String(moveCount);
}

function markCell(row, col, mark) {
  const cell = document.getElementById(row + "-" + col);
  cell.textContent = mark.toUpperCase();
  cell.classList.add(mark);
  matrixGame[row][col] = mark;
  moveCount++;
}

function collectLine(x, y, mark, dx, dy) {
  const cells = [[x, y]];

  for (let i = 1; i < 5; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (
      nx >= 0 &&
      nx < matrixGame.length &&
      ny >= 0 &&
      ny < matrixGame[0].length &&
      matrixGame[nx][ny] === mark
    ) {
      cells.push([nx, ny]);
    } else {
      break;
    }
  }

  for (let i = 1; i < 5; i++) {
    const nx = x - dx * i;
    const ny = y - dy * i;
    if (
      nx >= 0 &&
      nx < matrixGame.length &&
      ny >= 0 &&
      ny < matrixGame[0].length &&
      matrixGame[nx][ny] === mark
    ) {
      cells.unshift([nx, ny]);
    } else {
      break;
    }
  }

  return cells;
}

function findWinningLine(points, mark) {
  const x = Number(points[0]);
  const y = Number(points[1]);
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    const line = collectLine(x, y, mark, dx, dy);
    if (line.length >= 5) {
      return line;
    }
  }

  return null;
}

function highlightWinningLine(points, mark) {
  const line = findWinningLine(points, mark);
  if (!line) return;

  for (const [x, y] of line) {
    document.getElementById(x + "-" + y).classList.add("win-cell");
  }
}

function showGameOverModal(title, icon) {
  showModal({
    icon,
    title,
    actions: [
      { label: "Play Again", onClick: () => location.reload() },
      {
        label: "Home",
        ghost: true,
        onClick: () => {
          window.location.href = "/game-development/games/caro/home.html";
        },
      },
    ],
  });
}

function handleClick(id) {
  switch (processClick(id)) {
    case WIN:
      updateHUD();
      setTimeout(function () {
        showGameOverModal("Player " + player.toUpperCase() + " wins!", "success");
      }, 100);
      break;
    case DRAW:
      updateHUD();
      setTimeout(function () {
        showGameOverModal("Draw!", "draw");
      }, 100);
      break;
    default:
      updateHUD();
  }
}

function processClick(id) {
  let points = id.split("-");

  switch (typeGame) {
    case TWO_PLAYER:
      if (
        matrixGame[Number(points[0])][Number(points[1])] === X ||
        matrixGame[Number(points[0])][Number(points[1])] === O
      ) {
        return;
      }

      markCell(Number(points[0]), Number(points[1]), player);

      if (checkWin(points)) {
        highlightWinningLine(points, player);
        return WIN;
      }

      // check draw
      if (checkDraw()) {
        return DRAW;
      }

      player = player === X ? O : X;
      break;
    case COMPUTER:
      if (
        matrixGame[Number(points[0])][Number(points[1])] === X ||
        matrixGame[Number(points[0])][Number(points[1])] === O
      ) {
        return;
      }

      markCell(Number(points[0]), Number(points[1]), X);

      // check win
      if (checkWin(points)) {
        highlightWinningLine(points, X);
        return WIN;
      }

      // check draw
      if (checkDraw()) {
        return DRAW;
      }

      player = O;

      // computer
      let pointsComputer = getPointsComputer();
      markCell(pointsComputer[0], pointsComputer[1], O);

      // check win
      if (checkWin(pointsComputer)) {
        highlightWinningLine(pointsComputer, O);
        return WIN;
      }

      // check draw
      if (checkDraw()) {
        return DRAW;
      }

      player = X;

      break;
  }
}

function getHorizontal(x, y, player) {
  let count = 1;
  for (let i = 1; i < 5; i++) {
    if (y + i < matrixGame[0].length && matrixGame[x][y + i] === player) {
      count++;
    } else {
      break;
    }
  }

  for (let i = 1; i < 5; i++) {
    if (
      y - i >= 0 &&
      y - i < matrixGame[0].length &&
      matrixGame[x][y - i] === player
    ) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function getVertical(x, y, player) {
  let count = 1;
  for (let i = 1; i < 5; i++) {
    if (x + i < matrixGame.length && matrixGame[x + i][y] === player) {
      count++;
    } else {
      break;
    }
  }

  for (let i = 1; i < 5; i++) {
    if (
      x - i >= 0 &&
      x - i < matrixGame.length &&
      matrixGame[x - i][y] === player
    ) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function getRightDiagonal(x, y, player) {
  let count = 1;
  for (let i = 1; i < 5; i++) {
    if (
      x - i >= 0 &&
      x - i < matrixGame.length &&
      y + i < matrixGame[0].length &&
      matrixGame[x - i][y + i] === player
    ) {
      count++;
    } else {
      break;
    }
  }

  for (let i = 1; i < 5; i++) {
    if (
      x + i < matrixGame.length &&
      y - i >= 0 &&
      y - i < matrixGame[0].length &&
      matrixGame[x + i][y - i] === player
    ) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function getLeftDiagonal(x, y, player) {
  let count = 1;
  for (let i = 1; i < 5; i++) {
    if (
      x - i >= 0 &&
      x - i < matrixGame.length &&
      y - i >= 0 &&
      y - i < matrixGame[0].length &&
      matrixGame[x - i][y - i] === player
    ) {
      count++;
    } else {
      break;
    }
  }

  for (let i = 1; i < 5; i++) {
    if (
      x + i < matrixGame.length &&
      y + i < matrixGame[0].length &&
      matrixGame[x + i][y + i] === player
    ) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function checkWin(points) {
  return (
    getHorizontal(Number(points[0]), Number(points[1]), player) >= 5 ||
    getVertical(Number(points[0]), Number(points[1]), player) >= 5 ||
    getRightDiagonal(Number(points[0]), Number(points[1]), player) >= 5 ||
    getLeftDiagonal(Number(points[0]), Number(points[1]), player) >= 5
  );
}

function checkDraw() {
  for (let i = 0; i < matrixGame.length; i++) {
    for (let j = 0; j < matrixGame[0].length; j++) {
      if (matrixGame[i][j] === "") {
        return false;
      }
    }
  }

  return true;
}

function getPointsComputer() {
  let maxScore = -Infinity;
  let pointsComputer = [];
  let listScorePoint = [];
  for (let i = 0; i < matrixGame.length; i++) {
    for (let j = 0; j < matrixGame[0].length; j++) {
      if (matrixGame[i][j] === "") {
        let computerRun = Math.max(
          getHorizontal(i, j, O),
          getVertical(i, j, O),
          getRightDiagonal(i, j, O),
          getLeftDiagonal(i, j, O)
        );
        let humanRun = Math.max(
          getHorizontal(i, j, X),
          getVertical(i, j, X),
          getRightDiagonal(i, j, X),
          getLeftDiagonal(i, j, X)
        );
        let score =
          MAP_SCORE_COMPUTER.get(Math.min(6, computerRun)) +
          MAP_POINT_HUMAN.get(Math.min(5, humanRun - 1));
        if (maxScore <= score) {
          maxScore = score;
          listScorePoint.push({
            score: score,
            point: [i, j],
          });
        }
      }
    }
  }

  // get list max score
  for (const element of listScorePoint) {
    if (element.score === maxScore) {
      pointsComputer.push(element.point);
    }
  }
  return pointsComputer[Math.floor(Math.random() * pointsComputer.length)];
}

function init() {
  player = X;
  matrixGame = [];
  typeGame = TWO_PLAYER;
  moveCount = 0;
  const urlParams = new URLSearchParams(window.location.search);
  let rows = urlParams.get("rows");
  let columns = urlParams.get("columns");

  if (
    rows === "" ||
    columns === "" ||
    (urlParams.get("type") !== TWO_PLAYER &&
      urlParams.get("type") !== COMPUTER &&
      urlParams.get("type") !== COMPUTER_COMPUTER)
  ) {
    window.location.href = "/game-development/games/caro/home.html";
  }

  typeGame = urlParams.get("type");

  boardWrap.classList.toggle("is-locked", typeGame === COMPUTER_COMPUTER);
  boardSizeEl.textContent = rows + " x " + columns;

  document.documentElement.style.setProperty(
    "--cell-size",
    computeCellSize(Math.max(Number(rows), Number(columns))) + "px"
  );

  // Data table
  let tableXO = document.getElementById("table_game");
  let tableContent = "";

  for (let row = 0; row < rows; row++) {
    let arr = [];
    let rowHTML = "<tr>";
    for (let col = 0; col < columns; col++) {
      arr.push("");
      rowHTML +=
        `<td class="td_game"><div id="` +
        row.toString() +
        "-" +
        col.toString() +
        `" onclick="handleClick(this.id)" class="fixed"></div></td>`;
    }
    rowHTML += "</tr>";

    tableContent += rowHTML;
    matrixGame.push(arr);
  }

  tableXO.innerHTML = tableContent;
  updateHUD();
}

window.addEventListener("load", (event) => {
  init();

  if (typeGame === COMPUTER_COMPUTER) {
    isFirst = true;
    let sumPoints = matrixGame.length * matrixGame[0].length;
    ComputerAndComputer(sumPoints).then((state) => {
      switch (state) {
        case WIN:
          setTimeout(function () {
            showGameOverModal("Player " + player.toUpperCase() + " wins!", "success");
          }, 100);
          break;
        case DRAW:
          setTimeout(function () {
            showGameOverModal("Draw!", "draw");
          }, 100);
          break;
      }
    });
  }
});

async function ComputerAndComputer(sumPoints) {
  for (let i = 0; i < sumPoints; i++) {
    await delay(1000);
    // computer A
    let pointsComputerA = getPointsComputer();
    if (isFirst) {
      isFirst = false;
      pointsComputerA = [
        Math.floor(matrixGame.length / 2),
        Math.floor(matrixGame[0].length / 2),
      ];
    }
    markCell(pointsComputerA[0], pointsComputerA[1], X);
    updateHUD();

    // check win
    if (checkWin(pointsComputerA)) {
      highlightWinningLine(pointsComputerA, X);
      return WIN;
    }

    // check draw
    if (checkDraw()) {
      return DRAW;
    }

    player = O;
    updateHUD();

    await delay(1000);
    // computer B
    let pointsComputerB = getPointsComputer();
    markCell(pointsComputerB[0], pointsComputerB[1], O);
    updateHUD();

    // check win
    if (checkWin(pointsComputerB)) {
      highlightWinningLine(pointsComputerB, O);
      return WIN;
    }

    // check draw
    if (checkDraw()) {
      return DRAW;
    }

    player = X;
    updateHUD();
  }
}

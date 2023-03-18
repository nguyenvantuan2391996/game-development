let player = X;
let matrixGame = [];
let typeGame = TWO_PLAYER;
let isFirst = true;

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function handleClick(id) {
  switch (processClick(id)) {
    case WIN:
      setTimeout(function () {
        alert("Player: " + player + " is winner");

        // reset game
        init();
      }, 100);
      break;
    case DRAW:
      setTimeout(function () {
        alert("Draw");

        // reset game
        init();
      }, 100);
      break;
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

      if (player === X) {
        matrixGame[Number(points[0])][Number(points[1])] = X;
        document.getElementById(id).innerHTML = XText;
      }

      if (player === O) {
        matrixGame[Number(points[0])][Number(points[1])] = O;
        document.getElementById(id).innerHTML = OText;
      }

      if (checkWin(points)) {
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

      if (player === X) {
        matrixGame[Number(points[0])][Number(points[1])] = X;
        document.getElementById(id).innerHTML = XText;
      }

      // check win
      if (checkWin(points)) {
        return WIN;
      }

      // check draw
      if (checkDraw()) {
        return DRAW;
      }

      player = player === X ? O : X;

      // computer
      let pointsComputer = getPointsComputer();
      matrixGame[pointsComputer[0]][pointsComputer[1]] = O;
      document.getElementById(
        pointsComputer[0].toString() + "-" + pointsComputer[1].toString()
      ).innerHTML = OText;

      // check win
      if (checkWin(pointsComputer)) {
        return WIN;
      }

      // check draw
      if (checkDraw()) {
        return DRAW;
      }

      player = player === X ? O : X;

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
        let score =
          MAP_SCORE_COMPUTER.get(
            Math.max(
              getHorizontal(i, j, O),
              getVertical(i, j, O),
              getRightDiagonal(i, j, O),
              getLeftDiagonal(i, j, O)
            )
          ) +
          MAP_POINT_HUMAN.get(
            Math.max(
              getHorizontal(i, j, X),
              getVertical(i, j, X),
              getRightDiagonal(i, j, X),
              getLeftDiagonal(i, j, X)
            ) - 1
          );
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
}

window.addEventListener("load", (event) => {
  console.log(event);
  init();

  if (typeGame === COMPUTER_COMPUTER) {
    isFirst = true;
    let sumPoints = matrixGame.length * matrixGame[0].length;
    ComputerAndComputer(sumPoints).then((state) => {
      switch (state) {
        case WIN:
          setTimeout(function () {
            alert("Player: " + player + " is winner");

            // reset game
            init();
            location.reload();
          }, 100);
          break;
        case DRAW:
          setTimeout(function () {
            alert("Draw");

            // reset game
            init();
            location.reload();
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
      pointsComputerA = [matrixGame.length / 2, matrixGame[0].length / 2];
    }
    matrixGame[pointsComputerA[0]][pointsComputerA[1]] = X;
    document.getElementById(
      pointsComputerA[0].toString() + "-" + pointsComputerA[1].toString()
    ).innerHTML = XText;

    // check win
    if (checkWin(pointsComputerA)) {
      return WIN;
    }

    // check draw
    if (checkDraw()) {
      return DRAW;
    }

    player = player === X ? O : X;

    await delay(1000);
    // computer B
    let pointsComputerB = getPointsComputer();
    matrixGame[pointsComputerB[0]][pointsComputerB[1]] = O;
    document.getElementById(
      pointsComputerB[0].toString() + "-" + pointsComputerB[1].toString()
    ).innerHTML = OText;

    // check win
    if (checkWin(pointsComputerB)) {
      return WIN;
    }

    // check draw
    if (checkDraw()) {
      return DRAW;
    }

    player = player === X ? O : X;
  }
}

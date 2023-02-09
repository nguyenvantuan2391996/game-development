let player = "x";
let matrixGame = [];

function handleClick(id) {

    if (processClick(id)) {
        setTimeout(function () {
            alert("Player: " + player + " is winner");

            // reset game
            init();
        }, 100);
    }
}

function processClick(id) {
    let points = id.split("-");

    if (matrixGame[Number(points[0])][Number(points[1])] === "x" || matrixGame[Number(points[0])][Number(points[1])] === "o") {
        return
    }

    if (player === "x") {
        matrixGame[Number(points[0])][Number(points[1])] = "x";
        document.getElementById(id).innerHTML = XText;
    }

    if (player === "o") {
        matrixGame[Number(points[0])][Number(points[1])] = "o";
        document.getElementById(id).innerHTML = OText;
    }

    let isWin = checkWinHorizontal(Number(points[0]), Number(points[1]), player)
        || checkWinVertical(Number(points[0]), Number(points[1]), player)
        || checkWinRightDiagonal(Number(points[0]), Number(points[1]), player)
        || checkWinLeftDiagonal(Number(points[0]), Number(points[1]), player)

    if (isWin) {
        return true;
    }

    player = player === "x" ? "o" : "x";
}

function checkWinHorizontal(x, y, player) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
        if (y + i < matrixGame[0].length && matrixGame[x][y + i] === player) {
            count++;
        } else {
            break
        }
    }

    for (let i = 1; i < 5; i++) {
        if (y - i >= 0 && y - i < matrixGame[0].length && matrixGame[x][y - i] === player) {
            count++;
        } else {
            break
        }
    }

    return count === 5;
}

function checkWinVertical(x, y, player) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
        if (x + i < matrixGame.length && matrixGame[x + i][y] === player) {
            count++;
        } else {
            break
        }
    }

    for (let i = 1; i < 5; i++) {
        if (x - i >= 0 && x - i < matrixGame.length && matrixGame[x - i][y] === player) {
            count++;
        } else {
            break
        }
    }

    return count === 5;
}

function checkWinRightDiagonal(x, y, player) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
        if (x - i >= 0 && x - i < matrixGame.length && y + i < matrixGame[0].length && matrixGame[x - i][y + i] === player) {
            count++;
        } else {
            break
        }
    }

    for (let i = 1; i < 5; i++) {
        if (x + i < matrixGame.length && y - i >= 0 && y - i < matrixGame[0].length && matrixGame[x + i][y - i] === player) {
            count++;
        } else {
            break
        }
    }

    return count === 5;
}

function checkWinLeftDiagonal(x, y, player) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
        if (x - i >= 0 && x - i < matrixGame.length && y - i >= 0 && y - i < matrixGame[0].length && matrixGame[x - i][y - i] === player) {
            count++;
        } else {
            break
        }
    }

    for (let i = 1; i < 5; i++) {
        if (x + i < matrixGame.length && y + i < matrixGame[0].length && matrixGame[x + i][y + i] === player) {
            count++;
        } else {
            break
        }
    }

    return count === 5;
}

function init() {
    player = "x";
    matrixGame = [];
    const urlParams = new URLSearchParams(window.location.search);
    let rows = urlParams.get("rows");
    let columns = urlParams.get("columns");

    if (rows === "" || columns === "") {
        window.location.href = "/home.html";
    }

    // Data table
    let tableXO = document.getElementById("table_game");
    let tableContent = "";

    for (let row = 0; row < rows; row++) {
        let arr = [];
        let rowHTML = "<tr>";
        for (let col = 0; col < columns; col++) {
            arr.push("");
            rowHTML += `<td class="td_game"><div id="` + row.toString() + "-" + col.toString() + `" onclick="handleClick(this.id)" class="fixed"></div></td>`
        }
        rowHTML += "</tr>";

        tableContent += rowHTML;
        matrixGame.push(arr);
    }

    tableXO.innerHTML = tableContent
}

window.addEventListener("load", (event) => {
    init();
});
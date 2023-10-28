let dataGame = [];
let selected = [];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function isMatch(pointX, pointY, rows, columns) {
  if (pointX[0] === pointY[0]) {
    if (pointX[0] === 0 || pointX[0] === rows - 1) {
      return true;
    }
  }

  if (pointX[1] === pointY[1]) {
    if (pointX[1] === 0 || pointX[1] === rows - 1) {
      return true;
    }
  }

  return false;
}

function handleClick(id, rows, columns) {
  selected.push(id);
  document.getElementById("img-" + id).style.filter = "blur(2px)";
  if (selected.length >= 2) {
    if (
      document.getElementById("img-" + selected[0]).src ===
        document.getElementById("img-" + selected[1]).src &&
      selected[0] !== selected[1]
    ) {
      let pointX = selected[0].split("-");
      let pointY = selected[1].split("-");

      // if match
      console.log(
        isMatch(
          [Number(pointX[0]), Number(pointX[1])],
          [Number(pointY[0]), Number(pointY[1])],
          rows,
          columns
        )
      );
      if (
        isMatch(
          [Number(pointX[0]), Number(pointX[1])],
          [Number(pointY[0]), Number(pointY[1])],
          rows,
          columns
        )
      ) {
        document.getElementById(selected[0]).innerHTML = "";
        document.getElementById(selected[1]).innerHTML = "";
      } else {
        document.getElementById("img-" + selected[0]).style.filter = "";
        document.getElementById("img-" + selected[1]).style.filter = "";
      }
    } else {
      document.getElementById("img-" + selected[0]).style.filter = "";
      document.getElementById("img-" + selected[1]).style.filter = "";
    }

    selected = [];
  }
}

function initDataGame(rows, columns) {
  let data = [];
  let available = [];
  for (let i = 0; i < rows * columns; i++) {
    data.push("");
    available.push(i);
  }

  while (available.length > 0) {
    let idImg = getRandomInt(1, 20);
    // the pair images
    for (let i = 0; i < 2; i++) {
      let idAvailable = Math.floor(Math.random() * available.length);
      data[available[idAvailable]] = "images/" + idImg + ".png";

      // remove element
      let index = available.indexOf(available[idAvailable]);
      if (index !== -1) {
        available.splice(index, 1);
      }
    }
  }
  return data;
}

function init() {
  dataGame = [];
  const urlParams = new URLSearchParams(window.location.search);
  let rows = urlParams.get("rows");
  let columns = urlParams.get("columns");

  if (rows === "" || columns === "") {
    window.location.href = "/game-development/games/pikachu/home.html";
  }

  // init data game
  dataGame = initDataGame(rows, columns);

  // Data table
  let tablePikachu = document.getElementById("table_game_pikachu");
  let tableContentPikachu = "";

  let index = 0;
  for (let row = 0; row < rows; row++) {
    let rowHTML = "<tr>";
    for (let col = 0; col < columns; col++) {
      let idValue = row.toString() + "-" + col.toString();
      let idImgValue = "img-" + idValue;
      rowHTML += `<td class="td_game"><div id=${idValue} onclick="handleClick(this.id, Number(${rows}), Number(${columns}))" class="fixed"><img id=${idImgValue} src=${dataGame[
        index
      ].toString()} width="90" height="90" alt=""></div></td>`;
      index++;
    }
    rowHTML += "</tr>";

    tableContentPikachu += rowHTML;
  }

  tablePikachu.innerHTML = tableContentPikachu;
}

window.addEventListener("load", (event) => {
  console.log(event);
  init();
});

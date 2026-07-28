const btnLetsGo = document.getElementById("button");
const squareToggle = document.getElementById("square-toggle");
const columnsBlock = document.getElementById("columns-block");
const rowsGrid = document.getElementById("rows-grid");
const columnsGrid = document.getElementById("columns-grid");

let selectedRows = null;
let selectedColumns = null;
let squareMode = true;

function buildSizeCard(size) {
  const card = document.createElement("div");
  card.className = "size-card";
  card.dataset.value = String(size);
  card.textContent = size;
  return card;
}

BOARD_SIZES.forEach((size) => {
  const rowCard = buildSizeCard(size);
  rowCard.addEventListener("click", () => selectSizeCard(rowCard, "rows"));
  rowsGrid.appendChild(rowCard);

  const columnCard = buildSizeCard(size);
  columnCard.addEventListener("click", () => selectSizeCard(columnCard, "columns"));
  columnsGrid.appendChild(columnCard);
});

function updateLetsGoState() {
  const ready = selectedRows !== null && (squareMode || selectedColumns !== null);
  btnLetsGo.classList.toggle("is-ready", ready);
}

function selectSizeCard(card, dimension) {
  const grid = dimension === "rows" ? rowsGrid : columnsGrid;
  grid
    .querySelectorAll(".size-card")
    .forEach((c) => c.classList.remove("is-selected"));
  card.classList.add("is-selected");

  const value = Number(card.dataset.value);
  if (dimension === "rows") {
    selectedRows = value;
    if (squareMode) {
      selectedColumns = value;
      columnsGrid
        .querySelectorAll(".size-card")
        .forEach((c) => c.classList.toggle("is-selected", Number(c.dataset.value) === value));
    }
  } else {
    selectedColumns = value;
  }
  updateLetsGoState();
}

squareToggle.addEventListener("change", () => {
  squareMode = squareToggle.checked;
  columnsBlock.hidden = squareMode;
  if (squareMode && selectedRows !== null) {
    selectedColumns = selectedRows;
    columnsGrid
      .querySelectorAll(".size-card")
      .forEach((c) => c.classList.toggle("is-selected", Number(c.dataset.value) === selectedRows));
  }
  updateLetsGoState();
});

function handleLetGo() {
  if (selectedRows === null || (!squareMode && selectedColumns === null)) {
    AlertError("Vui lòng chọn kích thước bàn chơi");
    return;
  }

  const columns = squareMode ? selectedRows : selectedColumns;
  window.location.href =
    "/game-development/games/pikachu/pikachu.html?rows=" +
    selectedRows +
    "&columns=" +
    columns;
}

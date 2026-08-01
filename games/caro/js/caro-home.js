const btnLetsGo = document.getElementById("button");
const squareToggle = document.getElementById("square-toggle");
const columnsBlock = document.getElementById("columns-block");
const rowsGrid = document.getElementById("rows-grid");
const columnsGrid = document.getElementById("columns-grid");

let selectedType = "";
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
  const ready =
    selectedType !== "" &&
    selectedRows !== null &&
    (squareMode || selectedColumns !== null);
  btnLetsGo.classList.toggle("is-ready", ready);
}

function selectTypeCard(card) {
  document
    .querySelectorAll(".type-card")
    .forEach((c) => c.classList.remove("is-selected"));
  card.classList.add("is-selected");
  selectedType = card.dataset.value;
  updateLetsGoState();
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

document.querySelectorAll(".type-card").forEach((card) => {
  card.addEventListener("click", () => selectTypeCard(card));
});

function handleLetGo() {
  if (selectedType === "" || selectedRows === null || (!squareMode && selectedColumns === null)) {
    AlertError("Please choose a game mode and board size");
    return;
  }

  const columns = squareMode ? selectedRows : selectedColumns;
  window.location.href =
    "/game-development/games/caro/caro.html?type=" +
    selectedType +
    "&rows=" +
    selectedRows +
    "&columns=" +
    columns;
}

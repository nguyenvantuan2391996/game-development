function handleLetGo() {
  let rows = document.getElementById("list-row").value;
  let columns = document.getElementById("list-column").value;

  if (rows === "" || columns === "") {
    alert("Vui lòng chọn kích thước trò chơi");
    return;
  }
  window.location.href =
    "/game-development/games/pikachu/pikachu.html?rows=" +
    rows +
    "&columns=" +
    columns;
}

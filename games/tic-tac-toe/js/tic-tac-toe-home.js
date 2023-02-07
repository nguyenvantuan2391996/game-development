function handleLetGo() {
    let typePlay = document.getElementById("list-type-play").value;
    let rows = document.getElementById("list-row").value;
    let columns = document.getElementById("list-column").value;

    if (typePlay === "" || rows === "" || columns === "") {
        alert("Vui lòng chọn kiểu chơi");
        return
    }
    window.location.href = "/game-development/games/tic-tac-toe/tic-tac-toe.html?type=" + typePlay + "&rows=" + rows + "&columns=" + columns;
}
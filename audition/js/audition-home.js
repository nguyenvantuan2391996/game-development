function handleLetGo() {
    let music = document.getElementById("list-music").value;
    let typeDance = document.getElementById("list-type-dance").value;

    if (music === "" || typeDance === "") {
        alert("Vui lòng chọn nhạc và kiểu nhảy")
        return
    }
    window.location.href = "/game-development/audition/audition.html?music="+ music + "&type=" + typeDance;
}

window.addEventListener("load", (event) => {
    let music = LIST_MUSIC[Math.floor(Math.random()*LIST_MUSIC.length)];
    let audio = new Audio(music);
    audio.play().catch(function (error) {
        console.log("Chrome cannot play sound without user interaction first" + error)
    });
});
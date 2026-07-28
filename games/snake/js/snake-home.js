document.addEventListener("DOMContentLoaded", () => {
    const modeCards = document.querySelectorAll(".mode-card");
    const btnPlay = document.getElementById("btn-play");
    let selectedMode = "normal";

    modeCards.forEach((card) => {
        card.addEventListener("click", () => {
            modeCards.forEach((c) => c.classList.remove("mode-card--active"));
            card.classList.add("mode-card--active");
            selectedMode = card.dataset.mode;
        });
    });

    btnPlay.addEventListener("click", () => {
        window.location.href = `snake.html?mode=${selectedMode}`;
    });
});

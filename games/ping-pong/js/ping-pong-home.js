const BEST_SCORE_KEY = "pingPongBestScore";

document.addEventListener("DOMContentLoaded", () => {
    const bestScoreValue = document.getElementById("best-score-value");
    const bestScoreBlock = document.getElementById("best-score-block");
    const modeCards = document.querySelectorAll(".mode-card");
    const btnPlay = document.getElementById("btn-play");
    let selectedMode = "cpu";

    function updateBestScoreVisibility() {
        if (selectedMode === "2p") {
            bestScoreBlock.style.display = "none";
        } else {
            bestScoreBlock.style.display = "";
            bestScoreValue.textContent = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
        }
    }

    modeCards.forEach((card) => {
        card.addEventListener("click", () => {
            modeCards.forEach((c) => c.classList.remove("mode-card--active"));
            card.classList.add("mode-card--active");
            selectedMode = card.dataset.mode;
            updateBestScoreVisibility();
        });
    });

    btnPlay.addEventListener("click", () => {
        window.location.href = `ping-pong.html?mode=${selectedMode}`;
    });

    updateBestScoreVisibility();
});

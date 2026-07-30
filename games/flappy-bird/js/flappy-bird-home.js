const BEST_SCORE_KEY = "flappyBirdBestScore";
const BEST_SCORE_AI_KEY = "flappyBirdBestScoreAI";

document.addEventListener("DOMContentLoaded", () => {
    const bestScoreValue = document.getElementById("best-score-value");
    const modeCards = document.querySelectorAll(".mode-card");
    const btnPlay = document.getElementById("btn-play");
    let selectedMode = "normal";

    function updateBestScore() {
        const key = selectedMode === "ai" ? BEST_SCORE_AI_KEY : BEST_SCORE_KEY;
        bestScoreValue.textContent = Number(localStorage.getItem(key)) || 0;
    }

    modeCards.forEach((card) => {
        card.addEventListener("click", () => {
            modeCards.forEach((c) => c.classList.remove("mode-card--active"));
            card.classList.add("mode-card--active");
            selectedMode = card.dataset.mode;
            updateBestScore();
        });
    });

    btnPlay.addEventListener("click", () => {
        window.location.href = `flappy-bird.html?mode=${selectedMode}`;
    });

    updateBestScore();
});

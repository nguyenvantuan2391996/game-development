const BEST_SCORE_KEY = "canabaltBestScore";

document.addEventListener("DOMContentLoaded", () => {
    const bestScoreValue = document.getElementById("best-score-value");
    const best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    bestScoreValue.textContent = best;
});

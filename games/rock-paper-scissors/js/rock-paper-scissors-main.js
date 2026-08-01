(function () {
    const hudPlayerScore = document.getElementById("hud-player-score");
    const hudAiScore = document.getElementById("hud-ai-score");
    const hudTieScore = document.getElementById("hud-tie-score");
    const hudStreak = document.getElementById("hud-streak");
    const hudBest = document.getElementById("hud-best");
    const aiHandEl = document.getElementById("ai-hand");
    const playerHandEl = document.getElementById("player-hand");
    const aiConfidenceEl = document.getElementById("ai-confidence");
    const resultBanner = document.getElementById("result-banner");
    const choiceButtons = document.querySelectorAll(".choice-btn");
    const resetBtn = document.getElementById("btn-reset-ai");

    const ai = new RpsAI();

    let playerScore = 0;
    let aiScore = 0;
    let tieScore = 0;
    let streak = 0;
    let best = Number(localStorage.getItem(BEST_STREAK_KEY)) || 0;
    let roundInProgress = false;

    hudBest.textContent = best;

    function orderLabel(order) {
        if (order === 0) return "not enough data yet, guessing randomly";
        if (order === 1) return "based on your previous move";
        return "based on your last " + order + " moves";
    }

    function judge(playerMove, aiMove) {
        if (playerMove === aiMove) return "tie";
        return COUNTERS[aiMove] === playerMove ? "player" : "ai";
    }

    function setChoicesEnabled(enabled) {
        choiceButtons.forEach((btn) => {
            btn.disabled = !enabled;
        });
    }

    function showResult(outcome, playerMove, aiMove) {
        resultBanner.hidden = false;
        resultBanner.classList.remove("result-banner--win", "result-banner--lose", "result-banner--tie");

        if (outcome === "tie") {
            resultBanner.textContent = "Tie! Both played " + MOVE_LABELS[playerMove];
            resultBanner.classList.add("result-banner--tie");
        } else if (outcome === "player") {
            resultBanner.textContent = MOVE_LABELS[playerMove] + " beats " + MOVE_LABELS[aiMove] + "! You win this round.";
            resultBanner.classList.add("result-banner--win");
        } else {
            resultBanner.textContent = MOVE_LABELS[aiMove] + " beats " + MOVE_LABELS[playerMove] + "! CPU wins this round.";
            resultBanner.classList.add("result-banner--lose");
        }
    }

    function updateHud() {
        hudPlayerScore.textContent = playerScore;
        hudAiScore.textContent = aiScore;
        hudTieScore.textContent = tieScore;
        hudStreak.textContent = streak;
        hudBest.textContent = best;
    }

    function playRound(playerMove) {
        if (roundInProgress) return;
        roundInProgress = true;
        setChoicesEnabled(false);

        // Predict & choose using history *before* this round's move is recorded.
        const aiMove = ai.chooseMove();
        const predictedOrder = ai.lastOrderUsed;
        const predictedConfidence = ai.lastConfidence;

        playerHandEl.textContent = "🤔";
        aiHandEl.textContent = "🤖";
        resultBanner.hidden = true;

        setTimeout(() => {
            playerHandEl.textContent = MOVE_EMOJI[playerMove];
            aiHandEl.textContent = MOVE_EMOJI[aiMove];

            const outcome = judge(playerMove, aiMove);
            if (outcome === "tie") {
                tieScore += 1;
                streak = 0;
            } else if (outcome === "player") {
                playerScore += 1;
                streak += 1;
                if (streak > best) {
                    best = streak;
                    localStorage.setItem(BEST_STREAK_KEY, String(best));
                }
            } else {
                aiScore += 1;
                streak = 0;
            }

            aiConfidenceEl.textContent =
                "AI predicted you'd play " + MOVE_LABELS[COUNTERS[aiMove]] +
                " (" + Math.round(predictedConfidence * 100) + "%, " + orderLabel(predictedOrder) + ")";

            showResult(outcome, playerMove, aiMove);
            updateHud();

            ai.recordPlayerMove(playerMove);
            ai.save();

            roundInProgress = false;
            setChoicesEnabled(true);
        }, 500);
    }

    choiceButtons.forEach((btn) => {
        btn.addEventListener("click", () => playRound(btn.dataset.move));
    });

    resetBtn.addEventListener("click", () => {
        ai.reset();
        playerScore = 0;
        aiScore = 0;
        tieScore = 0;
        streak = 0;
        playerHandEl.textContent = "❓";
        aiHandEl.textContent = "🤖";
        aiConfidenceEl.textContent = "";
        resultBanner.hidden = true;
        updateHud();
    });

    updateHud();
})();

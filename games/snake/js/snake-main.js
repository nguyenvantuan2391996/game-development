(function () {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "ai" ? "ai" : "normal";

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const hudScore = document.getElementById("hud-score");
    const hudBest = document.getElementById("hud-best");
    const hudEpisode = document.getElementById("hud-episode");
    const hudEpsilon = document.getElementById("hud-epsilon");
    const episodeChip = document.getElementById("hud-episode-chip");
    const epsilonChip = document.getElementById("hud-epsilon-chip");
    const aiControls = document.getElementById("ai-controls");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");

    const engine = new SnakeEngine(GRID_SIZE);
    const bestScoreKey = mode === "ai" ? BEST_SCORE_AI_KEY : BEST_SCORE_NORMAL_KEY;
    let bestScore = Number(localStorage.getItem(bestScoreKey)) || 0;
    hudBest.textContent = bestScore;

    let timer = null;
    let running = false;

    function render() {
        ctx.fillStyle = "#0b0a1f";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.fillRect(i * CELL_SIZE, 0, 1, CANVAS_SIZE);
            ctx.fillRect(0, i * CELL_SIZE, CANVAS_SIZE, 1);
        }

        ctx.fillStyle = "#ff3d9a";
        ctx.beginPath();
        ctx.roundRect(
            engine.food.x * CELL_SIZE + 4,
            engine.food.y * CELL_SIZE + 4,
            CELL_SIZE - 8,
            CELL_SIZE - 8,
            6
        );
        ctx.fill();

        engine.snake.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? "#ffcf4d" : "#7c5cff";
            ctx.beginPath();
            ctx.roundRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
            ctx.fill();
        });
    }

    function updateHud() {
        hudScore.textContent = engine.score;
        hudBest.textContent = bestScore;
    }

    function saveBestIfNeeded() {
        if (engine.score > bestScore) {
            bestScore = engine.score;
            localStorage.setItem(bestScoreKey, String(bestScore));
        }
    }

    // ---------- Normal mode ----------
    function startNormal() {
        engine.reset();
        overlay.hidden = true;
        running = true;
        clearInterval(timer);
        timer = setInterval(normalTick, 110);
        render();
        updateHud();
    }

    function normalTick() {
        const result = engine.step();
        if (result.died) {
            running = false;
            clearInterval(timer);
            saveBestIfNeeded();
            updateHud();
            showOverlay("Game Over", `Điểm của bạn: ${engine.score}. Nhấn để chơi lại.`, "Chơi lại");
            return;
        }
        render();
        updateHud();
    }

    function setupNormalControls() {
        const keyMap = {
            ArrowUp: DIRS.UP,
            ArrowDown: DIRS.DOWN,
            ArrowLeft: DIRS.LEFT,
            ArrowRight: DIRS.RIGHT,
            w: DIRS.UP,
            s: DIRS.DOWN,
            a: DIRS.LEFT,
            d: DIRS.RIGHT,
            W: DIRS.UP,
            S: DIRS.DOWN,
            A: DIRS.LEFT,
            D: DIRS.RIGHT,
        };

        window.addEventListener("keydown", (e) => {
            const dir = keyMap[e.key];
            if (!dir) return;
            e.preventDefault();
            if (!running) {
                startNormal();
                return;
            }
            engine.setDirection(dir);
        });
    }

    // ---------- AI mode ----------
    let agent = null;
    let aiDelay = 60;

    function startAi() {
        agent = new QLearningAgent();
        overlay.hidden = true;
        running = true;
        engine.reset();
        clearInterval(timer);
        timer = setInterval(aiTick, aiDelay);
        render();
        updateHud();
        updateAiHud();
    }

    function updateAiHud() {
        hudEpisode.textContent = agent.episode;
        hudEpsilon.textContent = agent.epsilon.toFixed(2);
    }

    function aiTick() {
        const state = getState(engine);
        const actionIndex = agent.chooseAction(state);
        const head = engine.snake[0];
        const prevDist = manhattanDistance(head, engine.food);

        engine.turnRelative(agent.actions[actionIndex]);
        const result = engine.step();

        let reward;
        if (result.died) {
            reward = -10;
        } else if (result.ate) {
            reward = 10;
        } else {
            const newDist = manhattanDistance(engine.snake[0], engine.food);
            reward = newDist < prevDist ? 1 : -1;
        }

        const nextState = getState(engine);
        agent.learn(state, actionIndex, reward, nextState, result.died);

        if (result.died) {
            saveBestIfNeeded();
            agent.episode += 1;
            agent.decayEpsilon();
            if (agent.episode % 20 === 0) agent.save();
            engine.reset();
        }

        render();
        updateHud();
        updateAiHud();
    }

    function setupAiControls() {
        aiControls.style.display = "flex";
        episodeChip.style.display = "inline-flex";
        epsilonChip.style.display = "inline-flex";

        const speedBtns = document.querySelectorAll(".speed-btn");
        speedBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                speedBtns.forEach((b) => b.classList.remove("speed-btn--active"));
                btn.classList.add("speed-btn--active");
                aiDelay = Number(btn.dataset.delay);
                if (running) {
                    clearInterval(timer);
                    timer = setInterval(aiTick, aiDelay);
                }
            });
        });

        document.getElementById("btn-reset-ai").addEventListener("click", () => {
            clearInterval(timer);
            agent.resetLearning();
            startAi();
        });
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    if (mode === "normal") {
        setupNormalControls();
        overlayBtn.addEventListener("click", startNormal);
        render();
    } else {
        setupAiControls();
        showOverlay("AI Q-learning", "AI sẽ tự chơi và tự học qua từng lượt. Nhấn để bắt đầu huấn luyện.", "Bắt đầu");
        overlayBtn.addEventListener("click", startAi);
        render();
    }
})();

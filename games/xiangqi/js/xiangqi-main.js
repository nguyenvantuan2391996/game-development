(function () {
    const CELL = 38;
    const MARGIN = 26;
    const BOARD_W = MARGIN * 2 + CELL * (COLS - 1);
    const BOARD_H = MARGIN * 2 + CELL * (ROWS - 1);
    const AI_DEPTH = 3;

    const PIECE_LABELS = {
        red: {
            general: "帥", advisor: "仕", elephant: "相", horse: "馬",
            chariot: "俥", cannon: "炮", soldier: "兵",
        },
        black: {
            general: "將", advisor: "士", elephant: "象", horse: "馬",
            chariot: "車", cannon: "砲", soldier: "卒",
        },
    };

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "ai" ? "ai" : "human";
    const humanColor = RED;

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = BOARD_W;
    canvas.height = BOARD_H;

    const hudTurn = document.getElementById("hud-turn");
    const thinkingChip = document.getElementById("thinking-chip");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");
    const btnRestart = document.getElementById("btn-restart");

    let board = createInitialBoard();
    let turn = RED;
    let selected = null;
    let legalTargets = [];
    let lastMove = null;
    let gameActive = true;
    let aiThinking = false;

    function colorLabel(color) {
        return color === RED ? "Red" : "Black";
    }

    function toPixel(r, c) {
        return { x: MARGIN + c * CELL, y: MARGIN + r * CELL };
    }

    function toBoardCoord(px, py) {
        const c = Math.round((px - MARGIN) / CELL);
        const r = Math.round((py - MARGIN) / CELL);
        return { r, c };
    }

    function drawBoard() {
        ctx.fillStyle = "#181428";
        ctx.fillRect(0, 0, BOARD_W, BOARD_H);

        ctx.strokeStyle = "rgba(245,244,251,0.55)";
        ctx.lineWidth = 1;

        for (let r = 0; r < ROWS; r++) {
            const p1 = toPixel(r, 0);
            const p2 = toPixel(r, COLS - 1);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        for (let c = 0; c < COLS; c++) {
            if (c === 0 || c === COLS - 1) {
                const p1 = toPixel(0, c);
                const p2 = toPixel(ROWS - 1, c);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            } else {
                const top1 = toPixel(0, c);
                const top2 = toPixel(4, c);
                ctx.beginPath();
                ctx.moveTo(top1.x, top1.y);
                ctx.lineTo(top2.x, top2.y);
                ctx.stroke();

                const bot1 = toPixel(5, c);
                const bot2 = toPixel(ROWS - 1, c);
                ctx.beginPath();
                ctx.moveTo(bot1.x, bot1.y);
                ctx.lineTo(bot2.x, bot2.y);
                ctx.stroke();
            }
        }

        const drawPalaceX = (r0, r1) => {
            const a = toPixel(r0, 3);
            const b = toPixel(r1, 5);
            const c1 = toPixel(r0, 5);
            const d = toPixel(r1, 3);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
        };
        drawPalaceX(0, 2);
        drawPalaceX(7, 9);

        ctx.fillStyle = "rgba(124,92,255,0.18)";
        const riverTop = toPixel(4, 0);
        const riverBottom = toPixel(5, COLS - 1);
        ctx.fillRect(MARGIN - 4, riverTop.y, BOARD_W - (MARGIN - 4) * 2, riverBottom.y - riverTop.y);

        ctx.fillStyle = "rgba(245,244,251,0.5)";
        ctx.font = "600 15px Poppins, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const midY = (riverTop.y + riverBottom.y) / 2;
        ctx.fillText("楚 河", MARGIN + CELL * 1.7, midY);
        ctx.fillText("漢 界", MARGIN + CELL * 6.3, midY);

        if (lastMove) {
            [[lastMove.fromR, lastMove.fromC], [lastMove.toR, lastMove.toC]].forEach(([r, c]) => {
                const p = toPixel(r, c);
                ctx.fillStyle = "rgba(255,207,77,0.25)";
                ctx.beginPath();
                ctx.arc(p.x, p.y, CELL * 0.46, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        if (selected) {
            const p = toPixel(selected.r, selected.c);
            ctx.strokeStyle = "#ff3d9a";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, CELL * 0.46, 0, Math.PI * 2);
            ctx.stroke();
        }

        legalTargets.forEach((m) => {
            const p = toPixel(m.toR, m.toC);
            const hasTarget = board[m.toR][m.toC];
            ctx.fillStyle = hasTarget ? "rgba(255,61,154,0.45)" : "rgba(61,220,132,0.55)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, hasTarget ? CELL * 0.42 : 6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawPieces() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = board[r][c];
                if (!piece) continue;
                const p = toPixel(r, c);

                ctx.beginPath();
                ctx.arc(p.x, p.y, CELL * 0.42, 0, Math.PI * 2);
                ctx.fillStyle = piece.color === RED ? "#3a2036" : "#1f2233";
                ctx.fill();
                ctx.strokeStyle = piece.color === RED ? "#ff3d9a" : "#7c5cff";
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = piece.color === RED ? "#ff9dc7" : "#c9c3ff";
                ctx.font = "700 17px 'Poppins', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(PIECE_LABELS[piece.color][piece.type], p.x, p.y + 1);
            }
        }
    }

    function render() {
        drawBoard();
        drawPieces();
    }

    function updateHud() {
        hudTurn.textContent = colorLabel(turn);
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function checkGameEnd() {
        if (isGameOver(board, turn)) {
            gameActive = false;
            const winner = opponent(turn);
            const inCheck = isInCheck(board, turn);
            const reason = inCheck ? "Checkmate!" : `${colorLabel(turn)} has no legal moves left!`;
            showOverlay("Game Over", `${reason} ${colorLabel(winner)} wins.`, "Play Again");
            return true;
        }
        return false;
    }

    function afterMove() {
        turn = opponent(turn);
        selected = null;
        legalTargets = [];
        updateHud();
        render();

        if (checkGameEnd()) return;

        if (mode === "ai" && turn !== humanColor) {
            aiThinking = true;
            thinkingChip.hidden = false;
            setTimeout(runAiMove, 60);
        }
    }

    function runAiMove() {
        const move = findBestMove(board, turn, AI_DEPTH);
        aiThinking = false;
        thinkingChip.hidden = true;
        if (!move) {
            checkGameEnd();
            return;
        }
        applyMove(board, move);
        lastMove = move;
        afterMove();
    }

    function handleClick(evt) {
        if (!gameActive || aiThinking) return;
        if (mode === "ai" && turn !== humanColor) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const px = (evt.clientX - rect.left) * scaleX;
        const py = (evt.clientY - rect.top) * scaleY;
        const { r, c } = toBoardCoord(px, py);
        if (!inBounds(r, c)) return;

        const piece = board[r][c];

        if (selected) {
            const target = legalTargets.find((m) => m.toR === r && m.toC === c);
            if (target) {
                applyMove(board, target);
                lastMove = target;
                afterMove();
                return;
            }
            if (piece && piece.color === turn) {
                selected = { r, c };
                legalTargets = getLegalMoves(board, turn).filter((m) => m.fromR === r && m.fromC === c);
                render();
                return;
            }
            selected = null;
            legalTargets = [];
            render();
            return;
        }

        if (piece && piece.color === turn) {
            selected = { r, c };
            legalTargets = getLegalMoves(board, turn).filter((m) => m.fromR === r && m.fromC === c);
            render();
        }
    }

    function restart() {
        board = createInitialBoard();
        turn = RED;
        selected = null;
        legalTargets = [];
        lastMove = null;
        gameActive = true;
        aiThinking = false;
        thinkingChip.hidden = true;
        overlay.hidden = true;
        updateHud();
        render();
    }

    canvas.addEventListener("click", handleClick);
    overlayBtn.addEventListener("click", restart);
    btnRestart.addEventListener("click", restart);

    updateHud();
    render();
})();

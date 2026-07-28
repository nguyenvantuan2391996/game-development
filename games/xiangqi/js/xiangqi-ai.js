function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            let value = PIECE_VALUES[piece.type];
            if (piece.type === "soldier" && hasCrossedRiver(r, piece.color)) value += 20;
            if (piece.type === "cannon" || piece.type === "horse") {
                const centerDist = Math.abs(c - 4);
                value += (4 - centerDist) * 3;
            }
            score += piece.color === RED ? value : -value;
        }
    }
    return score;
}

function orderMoves(board, moves) {
    return moves.slice().sort((a, b) => {
        const aCap = board[a.toR][a.toC] ? PIECE_VALUES[board[a.toR][a.toC].type] : 0;
        const bCap = board[b.toR][b.toC] ? PIECE_VALUES[board[b.toR][b.toC].type] : 0;
        return bCap - aCap;
    });
}

function negamax(board, depth, alpha, beta, color) {
    const legalMoves = getLegalMoves(board, color);
    if (legalMoves.length === 0) {
        return -100000 - depth;
    }
    if (depth === 0) {
        const score = evaluateBoard(board);
        return color === RED ? score : -score;
    }

    const ordered = orderMoves(board, legalMoves);
    let best = -Infinity;
    for (const move of ordered) {
        const captured = applyMove(board, move);
        const score = -negamax(board, depth - 1, -beta, -alpha, opponent(color));
        undoMove(board, move, captured);
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}

function findBestMove(board, color, depth) {
    const legalMoves = getLegalMoves(board, color);
    if (legalMoves.length === 0) return null;

    const ordered = orderMoves(board, legalMoves);
    let bestMoves = [];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of ordered) {
        const captured = applyMove(board, move);
        const score = -negamax(board, depth - 1, -beta, -alpha, opponent(color));
        undoMove(board, move, captured);

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }
        if (bestScore > alpha) alpha = bestScore;
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

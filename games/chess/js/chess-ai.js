const CHESS_CENTER_BONUS = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [0, 1, 2, 3, 3, 2, 1, 0],
    [0, 1, 2, 3, 3, 2, 1, 0],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

function evaluateChessBoard(board) {
    let score = 0;
    for (let r = 0; r < CHESS_SIZE; r++) {
        for (let c = 0; c < CHESS_SIZE; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            let value = CHESS_PIECE_VALUES[piece.type];
            if (piece.type !== "king") value += CHESS_CENTER_BONUS[r][c] * 3;
            if (piece.type === "pawn") {
                const advance = piece.color === WHITE ? 6 - r : r - 1;
                value += Math.max(0, advance) * 4;
            }
            score += piece.color === WHITE ? value : -value;
        }
    }
    return score;
}

function orderChessMoves(board, moves) {
    return moves.slice().sort((a, b) => {
        const aCap = board[a.toR][a.toC] ? CHESS_PIECE_VALUES[board[a.toR][a.toC].type] : 0;
        const bCap = board[b.toR][b.toC] ? CHESS_PIECE_VALUES[board[b.toR][b.toC].type] : 0;
        return bCap - aCap;
    });
}

function negamaxChess(board, depth, alpha, beta, color, enPassantTarget) {
    const legalMoves = getLegalChessMoves(board, color, enPassantTarget);
    if (legalMoves.length === 0) {
        if (isChessInCheck(board, color)) return -100000 - depth;
        return 0;
    }
    if (depth === 0) {
        const score = evaluateChessBoard(board);
        return color === WHITE ? score : -score;
    }

    const ordered = orderChessMoves(board, legalMoves);
    let best = -Infinity;
    for (const move of ordered) {
        const undo = applyChessMove(board, move);
        const nextEP = getEnPassantTargetAfterMove(move);
        const score = -negamaxChess(board, depth - 1, -beta, -alpha, opponentColor(color), nextEP);
        undoChessMove(board, undo);
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}

function findBestChessMove(board, color, enPassantTarget, depth) {
    const legalMoves = getLegalChessMoves(board, color, enPassantTarget);
    if (legalMoves.length === 0) return null;

    const ordered = orderChessMoves(board, legalMoves);
    let bestMoves = [];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of ordered) {
        const undo = applyChessMove(board, move);
        const nextEP = getEnPassantTargetAfterMove(move);
        const score = -negamaxChess(board, depth - 1, -beta, -alpha, opponentColor(color), nextEP);
        undoChessMove(board, undo);

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

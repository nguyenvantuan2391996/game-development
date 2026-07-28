const ROWS = 10;
const COLS = 9;

const RED = "red";
const BLACK = "black";

const PIECE_VALUES = {
    general: 10000,
    advisor: 200,
    elephant: 200,
    horse: 400,
    chariot: 900,
    cannon: 450,
    soldier: 100,
};

function createInitialBoard() {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    const backRank = ["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"];
    backRank.forEach((type, col) => {
        board[0][col] = { type, color: BLACK };
        board[9][col] = { type, color: RED };
    });

    [1, 7].forEach((col) => {
        board[2][col] = { type: "cannon", color: BLACK };
        board[7][col] = { type: "cannon", color: RED };
    });

    [0, 2, 4, 6, 8].forEach((col) => {
        board[3][col] = { type: "soldier", color: BLACK };
        board[6][col] = { type: "soldier", color: RED };
    });

    return board;
}

function cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function inPalace(r, c, color) {
    if (c < 3 || c > 5) return false;
    return color === BLACK ? r >= 0 && r <= 2 : r >= 7 && r <= 9;
}

function hasCrossedRiver(r, color) {
    return color === BLACK ? r >= 5 : r <= 4;
}

function opponent(color) {
    return color === RED ? BLACK : RED;
}

function pseudoMovesForPiece(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const { type, color } = piece;
    const moves = [];

    const tryAdd = (nr, nc) => {
        if (!inBounds(nr, nc)) return;
        const target = board[nr][nc];
        if (!target || target.color !== color) moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
    };

    if (type === "general") {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (inPalace(nr, nc, color)) tryAdd(nr, nc);
        });
    } else if (type === "advisor") {
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (inPalace(nr, nc, color)) tryAdd(nr, nc);
        });
    } else if (type === "elephant") {
        [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            const midR = r + dr / 2;
            const midC = c + dc / 2;
            if (!inBounds(nr, nc)) return;
            if (board[midR][midC]) return;
            if (color === BLACK && nr > 4) return;
            if (color === RED && nr < 5) return;
            tryAdd(nr, nc);
        });
    } else if (type === "horse") {
        const deltas = [
            [1, 2], [1, -2], [-1, 2], [-1, -2],
            [2, 1], [2, -1], [-2, 1], [-2, -1],
        ];
        deltas.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) return;
            const legR = Math.abs(dr) === 2 ? r + dr / 2 : r;
            const legC = Math.abs(dc) === 2 ? c + dc / 2 : c;
            if (board[legR][legC]) return;
            tryAdd(nr, nc);
        });
    } else if (type === "chariot") {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
            let nr = r + dr;
            let nc = c + dc;
            while (inBounds(nr, nc)) {
                const target = board[nr][nc];
                if (!target) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                } else {
                    if (target.color !== color) moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                    break;
                }
                nr += dr;
                nc += dc;
            }
        });
    } else if (type === "cannon") {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
            let nr = r + dr;
            let nc = c + dc;
            let screenFound = false;
            while (inBounds(nr, nc)) {
                const target = board[nr][nc];
                if (!screenFound) {
                    if (!target) {
                        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                    } else {
                        screenFound = true;
                    }
                } else if (target) {
                    if (target.color !== color) moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                    break;
                }
                nr += dr;
                nc += dc;
            }
        });
    } else if (type === "soldier") {
        const forwardDir = color === BLACK ? 1 : -1;
        tryAdd(r + forwardDir, c);
        if (hasCrossedRiver(r, color)) {
            tryAdd(r, c + 1);
            tryAdd(r, c - 1);
        }
    }

    return moves;
}

function allPseudoMoves(board, color) {
    const moves = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                moves.push(...pseudoMovesForPiece(board, r, c));
            }
        }
    }
    return moves;
}

function findGeneral(board, color) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.type === "general" && piece.color === color) return { r, c };
        }
    }
    return null;
}

function isSquareAttacked(board, r, c, byColor) {
    for (let sr = 0; sr < ROWS; sr++) {
        for (let sc = 0; sc < COLS; sc++) {
            const piece = board[sr][sc];
            if (!piece || piece.color !== byColor) continue;
            const moves = pseudoMovesForPiece(board, sr, sc);
            if (moves.some((m) => m.toR === r && m.toC === c)) return true;
        }
    }
    return false;
}

function isInCheck(board, color) {
    const general = findGeneral(board, color);
    if (!general) return true;
    return isSquareAttacked(board, general.r, general.c, opponent(color));
}

function applyMove(board, move) {
    const captured = board[move.toR][move.toC];
    board[move.toR][move.toC] = board[move.fromR][move.fromC];
    board[move.fromR][move.fromC] = null;
    return captured;
}

function undoMove(board, move, captured) {
    board[move.fromR][move.fromC] = board[move.toR][move.toC];
    board[move.toR][move.toC] = captured;
}

function getLegalMoves(board, color) {
    const pseudo = allPseudoMoves(board, color);
    const legal = [];
    pseudo.forEach((move) => {
        const captured = applyMove(board, move);
        if (!isInCheck(board, color)) legal.push(move);
        undoMove(board, move, captured);
    });
    return legal;
}

function isGameOver(board, color) {
    return getLegalMoves(board, color).length === 0;
}

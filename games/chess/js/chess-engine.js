const CHESS_SIZE = 8;
const WHITE = "white";
const BLACK = "black";

const CHESS_PIECE_VALUES = {
    king: 20000,
    queen: 900,
    rook: 500,
    bishop: 330,
    knight: 320,
    pawn: 100,
};

function createInitialChessBoard() {
    const board = Array.from({ length: CHESS_SIZE }, () => Array(CHESS_SIZE).fill(null));
    const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
    backRank.forEach((type, c) => {
        board[0][c] = { type, color: BLACK, hasMoved: false };
        board[7][c] = { type, color: WHITE, hasMoved: false };
    });
    for (let c = 0; c < CHESS_SIZE; c++) {
        board[1][c] = { type: "pawn", color: BLACK, hasMoved: false };
        board[6][c] = { type: "pawn", color: WHITE, hasMoved: false };
    }
    return board;
}

function cloneChessBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inChessBoard(r, c) {
    return r >= 0 && r < CHESS_SIZE && c >= 0 && c < CHESS_SIZE;
}

function opponentColor(color) {
    return color === WHITE ? BLACK : WHITE;
}

function pseudoMovesForChessPiece(board, r, c, enPassantTarget) {
    const piece = board[r][c];
    if (!piece) return [];
    const { type, color } = piece;
    const moves = [];

    const addIfValid = (nr, nc, extra) => {
        if (!inChessBoard(nr, nc)) return;
        const target = board[nr][nc];
        if (target && target.color === color) return;
        moves.push(Object.assign({ fromR: r, fromC: c, toR: nr, toC: nc, capture: !!target }, extra || {}));
    };

    if (type === "pawn") {
        const dir = color === WHITE ? -1 : 1;
        const startRow = color === WHITE ? 6 : 1;
        const promoRow = color === WHITE ? 0 : 7;

        if (inChessBoard(r + dir, c) && !board[r + dir][c]) {
            addIfValid(r + dir, c, r + dir === promoRow ? { promotion: "queen" } : null);
            if (r === startRow && !board[r + 2 * dir][c]) {
                addIfValid(r + 2 * dir, c, { doubleStep: true });
            }
        }

        [-1, 1].forEach((dc) => {
            const nr = r + dir;
            const nc = c + dc;
            if (!inChessBoard(nr, nc)) return;
            const target = board[nr][nc];
            if (target && target.color !== color) {
                addIfValid(nr, nc, nr === promoRow ? { promotion: "queen" } : null);
            } else if (!target && enPassantTarget && enPassantTarget.r === nr && enPassantTarget.c === nc) {
                moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, capture: true, enPassant: true });
            }
        });
    } else if (type === "knight") {
        const deltas = [
            [1, 2], [1, -2], [-1, 2], [-1, -2],
            [2, 1], [2, -1], [-2, 1], [-2, -1],
        ];
        deltas.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
    } else if (type === "king") {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr || dc) addIfValid(r + dr, c + dc);
            }
        }
    } else {
        const dirs =
            type === "rook"
                ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
                : type === "bishop"
                ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
                : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

        dirs.forEach(([dr, dc]) => {
            let nr = r + dr;
            let nc = c + dc;
            while (inChessBoard(nr, nc)) {
                const target = board[nr][nc];
                if (!target) {
                    addIfValid(nr, nc);
                } else {
                    if (target.color !== color) addIfValid(nr, nc);
                    break;
                }
                nr += dr;
                nc += dc;
            }
        });
    }

    return moves;
}

function getCastlingMoves(board, color) {
    const moves = [];
    const row = color === WHITE ? 7 : 0;
    const king = board[row][4];
    if (!king || king.type !== "king" || king.hasMoved) return moves;

    const enemy = opponentColor(color);
    if (isChessSquareAttacked(board, row, 4, enemy)) return moves;

    const kingRook = board[row][7];
    if (
        kingRook &&
        kingRook.type === "rook" &&
        !kingRook.hasMoved &&
        !board[row][5] &&
        !board[row][6] &&
        !isChessSquareAttacked(board, row, 5, enemy) &&
        !isChessSquareAttacked(board, row, 6, enemy)
    ) {
        moves.push({ fromR: row, fromC: 4, toR: row, toC: 6, castle: "king" });
    }

    const queenRook = board[row][0];
    if (
        queenRook &&
        queenRook.type === "rook" &&
        !queenRook.hasMoved &&
        !board[row][1] &&
        !board[row][2] &&
        !board[row][3] &&
        !isChessSquareAttacked(board, row, 3, enemy) &&
        !isChessSquareAttacked(board, row, 2, enemy)
    ) {
        moves.push({ fromR: row, fromC: 4, toR: row, toC: 2, castle: "queen" });
    }

    return moves;
}

function allChessPseudoMoves(board, color, enPassantTarget) {
    const moves = [];
    for (let r = 0; r < CHESS_SIZE; r++) {
        for (let c = 0; c < CHESS_SIZE; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                moves.push(...pseudoMovesForChessPiece(board, r, c, enPassantTarget));
            }
        }
    }
    moves.push(...getCastlingMoves(board, color));
    return moves;
}

function findChessKing(board, color) {
    for (let r = 0; r < CHESS_SIZE; r++) {
        for (let c = 0; c < CHESS_SIZE; c++) {
            const p = board[r][c];
            if (p && p.type === "king" && p.color === color) return { r, c };
        }
    }
    return null;
}

function isChessSquareAttacked(board, r, c, byColor) {
    const pawnRow = byColor === WHITE ? r + 1 : r - 1;
    if (inChessBoard(pawnRow, c - 1)) {
        const p = board[pawnRow][c - 1];
        if (p && p.type === "pawn" && p.color === byColor) return true;
    }
    if (inChessBoard(pawnRow, c + 1)) {
        const p = board[pawnRow][c + 1];
        if (p && p.type === "pawn" && p.color === byColor) return true;
    }

    for (let sr = 0; sr < CHESS_SIZE; sr++) {
        for (let sc = 0; sc < CHESS_SIZE; sc++) {
            const p = board[sr][sc];
            if (!p || p.color !== byColor || p.type === "pawn") continue;
            const moves = pseudoMovesForChessPiece(board, sr, sc, null);
            if (moves.some((m) => m.toR === r && m.toC === c)) return true;
        }
    }
    return false;
}

function isChessInCheck(board, color) {
    const king = findChessKing(board, color);
    if (!king) return true;
    return isChessSquareAttacked(board, king.r, king.c, opponentColor(color));
}

function applyChessMove(board, move) {
    const piece = board[move.fromR][move.fromC];
    const captured = board[move.toR][move.toC];
    const undo = {
        move,
        piece: { ...piece },
        captured,
        enPassantCapturedPiece: null,
        enPassantCapturedPos: null,
        rookMove: null,
    };

    board[move.fromR][move.fromC] = null;

    if (move.enPassant) {
        const capturedRow = move.fromR;
        const capturedCol = move.toC;
        undo.enPassantCapturedPiece = board[capturedRow][capturedCol];
        undo.enPassantCapturedPos = { r: capturedRow, c: capturedCol };
        board[capturedRow][capturedCol] = null;
    }

    const movedPiece = { ...piece, hasMoved: true };
    if (move.promotion) movedPiece.type = move.promotion;
    board[move.toR][move.toC] = movedPiece;

    if (move.castle) {
        const row = move.fromR;
        const rookFromCol = move.castle === "king" ? 7 : 0;
        const rookToCol = move.castle === "king" ? 5 : 3;
        const rook = board[row][rookFromCol];
        undo.rookMove = { row, fromCol: rookFromCol, toCol: rookToCol, rook: { ...rook } };
        board[row][rookFromCol] = null;
        board[row][rookToCol] = { ...rook, hasMoved: true };
    }

    return undo;
}

function undoChessMove(board, undo) {
    const { move } = undo;
    board[move.fromR][move.fromC] = undo.piece;
    board[move.toR][move.toC] = undo.captured || null;

    if (move.enPassant) {
        board[undo.enPassantCapturedPos.r][undo.enPassantCapturedPos.c] = undo.enPassantCapturedPiece;
    }

    if (undo.rookMove) {
        const { row, fromCol, toCol, rook } = undo.rookMove;
        board[row][toCol] = null;
        board[row][fromCol] = rook;
    }
}

function getEnPassantTargetAfterMove(move) {
    if (move.doubleStep) {
        return { r: (move.fromR + move.toR) / 2, c: move.toC };
    }
    return null;
}

function getLegalChessMoves(board, color, enPassantTarget) {
    const pseudo = allChessPseudoMoves(board, color, enPassantTarget);
    const legal = [];
    pseudo.forEach((move) => {
        const undo = applyChessMove(board, move);
        if (!isChessInCheck(board, color)) legal.push(move);
        undoChessMove(board, undo);
    });
    return legal;
}

function isChessGameOver(board, color, enPassantTarget) {
    return getLegalChessMoves(board, color, enPassantTarget).length === 0;
}

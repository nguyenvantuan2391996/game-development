# Building a chess AI in plain JavaScript, no libraries, no mercy

One evening I sat down to test the chess AI I'd just finished, confident enough that I'd already thought up a caption to brag about it online. First game, I played white, pushed e4 like a gentleman. The AI played e5. I developed a knight, it developed a bishop. On move 8 I castled kingside — and my king promptly "teleported" straight through a square under attack, like it had just learned how to Apparate. That was the moment it hit me: drawing a chessboard that looks nice is easy. Implementing chess rules correctly — rules humanity spent hundreds of years standardizing — is the actual problem.

This `game-development` repo is a collection of small games, most of which don't have a genuinely smart "opponent" — Caro scores moves with a simple heuristic table, other games just move enemies randomly. I wanted at least one game where the AI actually had to *think*: search a move tree, evaluate positions, make decisions instead of rolling dice or looking things up in a table. There was an easier path — pull in `chess.js` to handle the rules and just write the AI on top — but doing that meant the hardest part, generating legal moves and filtering out ones that leave your own king in check, would never actually be something I understood. This was a side project to learn from, not to ship fast, so I took the hard road: write everything myself, from an empty board, plain JavaScript, no framework, no build tool.

Legal move filtering is where I spent the most time. The idea sounds simple: a move is only legal if, after playing it, your own king isn't in check. The most honest way to implement that — and the way I went with — is to apply each candidate move to the board, check whether the king is under attack, then undo it:

```javascript
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
```

Simple, easy to prove correct — but theoretically slow: for every candidate move, you have to rescan the entire board to check if any enemy piece attacks the king's square. When I wrote it, I already knew this wasn't the fastest approach, but I deliberately didn't optimize early — write the correct version first, measure whether it's actually slow, then decide. That decision would come back to bite me later, once the AI needed to call this function thousands of times per search.

The first memorable bug is the one that opened this post: castling through a square under attack. The `getCastlingMoves` function originally only checked "king hasn't moved, rook hasn't moved, squares in between are empty" — forgetting the actual rule: the king can't castle while in check, can't pass through an attacked square, and can't land on an attacked square. Three conditions, and I only remembered one. The fix was adding `isChessSquareAttacked` checks for the king's current square and for every square it would pass through:

```javascript
if (isChessSquareAttacked(board, row, 4, enemy)) return moves; // in check -> no castling

if (
    kingRook && kingRook.type === "rook" && !kingRook.hasMoved &&
    !board[row][5] && !board[row][6] &&
    !isChessSquareAttacked(board, row, 5, enemy) &&
    !isChessSquareAttacked(board, row, 6, enemy)
) {
    moves.push({ fromR: row, fromC: 4, toR: row, toC: 6, castle: "king" });
}
```

For a rule with multiple clauses, coding from memory is a reliable way to miss one — the castling rule has three "not allowed" clauses that had been sitting somewhere in the back of my head since middle school, and writing a checklist before coding would have saved a lot of debugging time.

The second bug was more interesting, because it wasn't a rules bug — it was an algorithm bug. The first version I wrote was textbook minimax, with two separate `if (maximizingPlayer)` branches that mirrored each other almost exactly. Switching to negamax collapses those two branches into one, using the convention that scores are always computed from the perspective of whoever's moving, and get negated when passed down to the opponent recursively. Right after the switch, the AI suddenly started playing terribly — willing to sacrifice a queen for a pawn, like it was actively trying to lose. Printing the score of each candidate move at depth 1 revealed the problem: a move that captured the enemy queen, which should have scored very high, got a negative score instead. The cause was that I'd forgotten to flip the sign on the recursive call — calling `negamaxChess(...)` plain instead of `-negamaxChess(...)`. Missing exactly one minus sign, and the AI was unknowingly optimizing the score *for the opponent*:

```javascript
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
```

What's worth noting is that it's not just the score that needs flipping — `alpha` and `beta` also need to swap positions and negate (`-beta, -alpha`) on the way down. Fix only one of the two and the bug is still there, just subtler: the AI plays "slightly" worse instead of obviously worse, much harder to catch. Negamax is more compact than classic minimax in line count, but that compactness comes from cramming all the sign semantics into a single line — get a sign wrong in classic minimax's two separate branches and usually only one branch is affected; get it wrong in negamax and the entire search tree is affected, at every depth.

The board evaluation function (`evaluateChessBoard`) I deliberately kept simple — classic piece values, plus a bonus for controlling the center and a bonus for pawns advancing toward promotion, no king safety, no per-piece position tables like real engines have:

```javascript
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
```

The counterintuitive lesson I learned lives in move ordering — sorting candidate moves by the value of the captured piece, descending. Alpha-beta pruning isn't automatically fast; it only cuts branches effectively if you search good moves first. Trying a queen capture before a meaningless pawn push makes alpha and beta converge much faster, meaning more branches get pruned at the same search depth. Same algorithm, different move order, and one version can run several times faster than the other.

The third bug showed up while testing at depth 3: certain midgame positions would freeze the browser tab for 2-3 seconds, and the "AI is thinking..." chip wouldn't even have time to render before everything locked up. My first suspicion was that the algorithm was searching some redundant branch, but counting calls to `negamaxChess` showed a perfectly reasonable number for depth 3. The problem wasn't the number of moves being searched — it was the cost per search: every call to `getLegalChessMoves` inside negamax had to rescan all 64 squares to check for attacks — exactly the "haven't measured it as slow yet" tradeoff from legal-move filtering, now multiplied by tens of thousands of calls across the search tree, and it turned out to actually be slow. A second problem compounded it: the "thinking" chip got set to visible and then immediately followed by a synchronous search call — the browser never got a chance to repaint before the main thread was blocked, so the UI froze with no signal to the player that the machine was computing rather than actually hung. The cheapest fix, no Web Worker required, was just yielding one tick back to the browser to repaint:

```javascript
thinkingChip.hidden = false;
setTimeout(runAiMove, 60);
```

Not an architecturally "correct" fix — the search still blocks the UI while it runs — but enough that the experience no longer felt like the app randomly froze.

The last bug lived in pawn promotion: a pawn reaching the back rank should promote to a queen, but the board kept showing a pawn icon afterward, and the next move with that piece got scored using the pawn's value of 100 instead of the queen's 900. Logging the piece object showed `type` was still `"pawn"` — the `promotion: "queen"` flag was correctly attached when the move was generated, but `applyChessMove` originally just copied the piece straight to the destination square without reading the move's `promotion` field to change its type. The fix was exactly one line:

```javascript
const movedPiece = { ...piece, hasMoved: true };
if (move.promotion) movedPiece.type = move.promotion;
board[move.toR][move.toC] = movedPiece;
```

This is a very repeatable class of bug: when an action has two stages — generating a move proposal, then executing it — it's easy to get the first stage right and forget the second, because the first stage usually gets tested more (the legal-move highlight shows up immediately), while the execution stage only reveals itself when you actually make the move and look carefully at the resulting state.

One decision I considered and dropped: representing the board with bitboards, because "that's what the pros do." After about half an hour sketching bitmasks, it hit me that this technique exists to speed up engines searching millions of nodes per second, while my AI only needed to be fast enough not to make a depth-3 opponent feel sluggish. A 2D array of `{ type, color, hasMoved }` objects is far easier to read and debug with a plain `console.log`, and the speed was fine for the MVP scope — picking a tool for how "cool" it sounds instead of what the requirements actually call for is a classic trap I almost walked into.

Looking back, the part I originally thought would be hardest — the search algorithm, negamax, alpha-beta — ended up being under 90 lines of code, and once I understood the idea correctly, rewriting it took less than one evening. What actually ate the time, what had me staring at bug after bug, were the rules anyone who's ever learned chess knows by heart: a king can't castle through check, a pawn promotion has to change the piece type, en passant is only valid for exactly one move. The things "everyone already knows" turn out to be the easiest to get wrong in code, because humans remember rules intuitively, while a computer needs every single condition spelled out explicitly, no more and no less. The hard part of chess was never "playing well" — it was always "playing correctly" first.

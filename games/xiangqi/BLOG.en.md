# I thought I could reuse the Chess engine for Xiangqi — I ended up rewriting almost all of it

Once the Chess engine was running smoothly — legal enough, and the AI good enough not to give away pieces for free — I went into Xiangqi (Chinese Chess) feeling pretty confident: same square board, same idea of a move, same concept of check, surely I'd just swap out each piece's movement rules and keep the engine/AI/UI architecture intact. A few dozen lines in, reality set in: the only thing that actually carried over was the *file organization* — engine separate from AI separate from UI — the actual rules had to be rewritten from zero. The general and advisor are confined to a 3×3 palace, the elephant can never cross the river, the cannon needs exactly one piece in between as a "screen" before it can capture anything behind it, and the horse and elephant have leg-blocking / eye-blocking rules that behave nothing like how a bishop or knight moves in chess. I'd seriously considered building one general-purpose "board game engine" that both games could share, but that idea collapsed the moment I listed out these piece-specific rules — forcing them into one shared abstraction would have just produced a pile of `if (gameType === "xiangqi")` scattered everywhere.

One small thing that's easy to miss if you just carry over chess habits: Xiangqi pieces sit *on the intersections* of the grid lines, not inside squares the way chess pieces do. Converting pixel coordinates to board coordinates can't use integer division the chess way (which square am I in); it has to round to the nearest intersection instead:

```javascript
function toPixel(r, c) {
    return { x: MARGIN + c * CELL, y: MARGIN + r * CELL };
}

function toBoardCoord(px, py) {
    const c = Math.round((px - MARGIN) / CELL);
    const r = Math.round((py - MARGIN) / CELL);
    return { r, c };
}
```

If I'd used `Math.floor` here instead of `Math.round` — the muscle-memory habit from chess-style grid division — the player would have had to click slightly toward the upper-left of each intersection to register a piece, instead of clicking right on it. A silent UX bug, no crash, just a game that "feels off" for no obvious reason.

The trickiest piece to implement was the cannon, and it's also the only piece in either Chess or Xiangqi with two distinct movement modes depending on whether it's capturing: it slides like a chariot when moving to an empty square, but to actually capture an enemy piece, it needs exactly one piece anywhere in between to act as a "screen," and captures whatever comes right after that screen.

```javascript
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
}
```

Nothing in Chess behaves like this, so this was 100% new code — nothing to borrow from the old engine.

The negamax + alpha-beta + move-ordering scaffolding went the other way — it's almost a direct copy from the Chess engine, since the search algorithm itself doesn't care about the specific rules of the game. But that exact instinct to reuse almost got me into trouble on a branch that looked completely harmless. In Chess, running out of legal moves has to distinguish two cases: in check (checkmate, a loss) versus not in check (stalemate, a draw). Typing out the "no legal moves" branch on reflex, I nearly copied the whole `isInCheck` split for deciding loss versus draw — until I stopped to actually check the rules: Xiangqi **has no concept of a draw by having no legal moves**. Whichever side runs out of legal moves loses immediately, in check or not. The final version ended up simpler than the Chess one at exactly this spot:

```javascript
function negamax(board, depth, alpha, beta, color) {
    const legalMoves = getLegalMoves(board, color);
    if (legalMoves.length === 0) {
        return -100000 - depth;
    }
    // ...
}
```

No branching on `isInCheck` here at all — and there correctly shouldn't be. This was one of the rare moments where carrying over old code almost did harm instead of good: the pull toward reuse was strong enough that I nearly copied a branch that was correct-for-Chess but wrong-for-Xiangqi, purely because the two games look similar on the surface.

The bug that's actually real — and still unfixed — comes from a rule I missed entirely: the "flying generals" rule. In real Xiangqi, the two generals can never stand on the same column with nothing between them, because in theory one general could "fly" straight down the open column to capture the other. In an ordinary two-player game on mine, after about 15 moves, my two generals ended up exactly lined up like that — and the game raised no objection at all, the match just continued as if nothing had happened. Tracing it down, `pseudoMovesForPiece` for the `"general"` type only ever generates 4 one-step moves within the palace, with no "flying" move down the column modeled anywhere — and the check-detection logic (`isInCheck`) only works by scanning each piece's *actual* pseudo-moves, so it can never detect this particular kind of threat. The root issue: the flying-generals rule isn't a *move* the general piece can actually make in a real game, it's an *additional constraint* on the whole-board state, completely separate from how pseudo-moves get generated. Some rules in a game just don't fit the shape of "piece X can move to square Y" — and an architecture built entirely around per-piece moves will have a natural blind spot for that kind of rule, not because it's hard, but because it never showed up on the "7 pieces, 7 rulesets" list I made at the start.

A different, smaller but no less interesting bug showed up while mashing the "Play Again" button to quickly run through several test games. At one point I hit "Play Again" right after making a move — right as the "AI thinking" chip had just appeared — and the board reset to the starting position as expected, but less than a second later, a red piece, mine, moved on its own with nobody touching anything. Rereading `afterMove`, `runAiMove`, and `restart`:

```javascript
function afterMove() {
    turn = opponent(turn);
    // ...
    if (mode === "ai" && turn !== humanColor) {
        aiThinking = true;
        thinkingChip.hidden = false;
        setTimeout(runAiMove, 60);
    }
}

function runAiMove() {
    const move = findBestMove(board, turn, AI_DEPTH);
    // ...
    applyMove(board, move);
    lastMove = move;
    afterMove();
}

function restart() {
    board = createInitialBoard();
    turn = RED;
    // ...
    aiThinking = false;
    thinkingChip.hidden = true;
    overlay.hidden = true;
    updateHud();
    render();
}
```

Nothing in `restart()` cancels a `setTimeout(runAiMove, 60)` that's already been scheduled, and `runAiMove` has no relevance check at all — it reads `board`/`turn` at the moment it *runs*, not the moment it was *scheduled*. The "Play Again" button isn't gated by `aiThinking` the way clicking a piece on the canvas is (that has its own guard), so hitting it within the 60ms window between the timeout being set and firing means `restart()` resets `board` to the starting position and `turn` back to Red — but the old timeout is still alive independently, and when it fires, `runAiMove` computes the best move *for Red* and plays it automatically. A ghost move nobody asked for. I already know the fix — a generation counter, incremented every time `restart()` runs, captured at scheduling time and checked again at the top of `runAiMove` — the exact pattern I'd used to fix this same class of problem in the Audition game's song search screen — I just haven't gotten around to applying it here. A scheduled `setTimeout` doesn't automatically know the world has changed since it was set.

With the same search depth of 3 and the same negamax + alpha-beta structure, the Xiangqi AI noticeably drags more than the Chess AI in piece-dense positions. Two things compound: the Xiangqi board has 90 intersections versus Chess's 64 squares, so every check-detection call — which runs repeatedly at every node of the search tree — has to scan roughly 40% more squares; and the cannon has a noticeably more expensive pseudo-move set than a rook or queen at the same spot, since it has to keep scanning past the screen instead of stopping at the first obstacle it hits. I didn't optimize any further — depth 3 still finishes within a time players tolerate, and the `setTimeout(60ms)` pattern before computing is enough to let the "AI thinking" chip actually render before the main thread gets busy. But the lesson is clear: an architecture that's "fast enough" for problem A doesn't automatically stay fast enough for problem B just because it's the same algorithm — state-space size is an independent variable, and carrying over a config number like search depth from a previous project without remeasuring is a questionable assumption, even though this time it happened to still land within an acceptable range.

The biggest lesson from this project isn't really about Xiangqi or Chess specifically — it's about the confidence that follows right after finishing something similar. The cheapest cost of "I've already done this once" is that it makes you skip the step of stopping to ask whether the rules here are actually the same, or just look the same — and that question, for two games that seem like siblings the way Chess and Xiangqi do, turns out to need asking from scratch every single time, no exceptions. The two generals are still standing in a straight line on my board right now, with nothing stopping them — and maybe leaving a bug like that out in the open, documented plainly instead of hidden, is its own honest way of reminding myself that every product has some part that isn't finished yet.

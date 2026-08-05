# Homemade Tetris: seven pieces in a bag, and a defensive branch that's never fired

Ask anyone who ever owned one of those old handheld Brick Game consoles what games were on it, and one name always tops the list: Tetris. Nothing else in that "9999999 in 1" genre was ever really more famous — most of the other "games" on those consoles were just Tetris variants with a different starting piece or two, counted separately to inflate the number on the box. Writing my own Tetris from scratch, no libraries, turned out to be a more interesting exercise than I expected — not because the rotation logic is hard (it isn't), but because so many small details of "standard" Tetris — the 7-bag randomizer, the scoring system, the rotation matrices — have become unspoken genre conventions that a from-scratch build has to consciously decide whether to follow.

Technically, this is also the first game in the repo where I used a discrete grid as the core of the logic, unlike everything before it, which ran on continuous pixel coordinates. A 10×20 board, 26px per cell, nothing "drifting" freely — every collision check is just comparing integer row/column indices, much simpler than the AABB or circle collision in earlier games.

The whole core of the game fits into a single function, `collides(matrix, row, col)`, called from everywhere else — movement, rotation, soft drop, hard drop, the game-over check — with no separate "collision check" flavor per operation:

```javascript
function collides(matrix, row, col) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (!matrix[r][c]) continue;
            const br = row + r;
            const bc = col + c;
            if (bc < 0 || bc >= COLS || br >= ROWS) return true;
            if (br >= 0 && board[br][bc]) return true;
        }
    }
    return false;
}
```

Routing all of "is this position allowed" through one function means every action in the game reduces to "try a new position or shape, ask `collides`, accept it or bail." No collision logic ever gets written twice in two different ways.

The classic problem every homemade Tetris runs into showed up the moment I had all 7 piece types and a matrix rotation function in place: rotating in place near a wall always gets blocked, even when there's free space right next to it. I didn't reach for a full SRS kick table (different offsets per rotation-state pair, per piece type) — I went with something much simpler:

```javascript
const WALL_KICK_OFFSETS = [0, -1, 1, -2, 2];

function rotate() {
    const rotated = rotateMatrix(current.matrix);
    for (const offset of WALL_KICK_OFFSETS) {
        if (!collides(rotated, current.row, current.col + offset)) {
            current.matrix = rotated;
            current.col += offset;
            return;
        }
    }
}
```

Try shifting horizontally by 0, -1, +1, -2, +2 cells in that order — nearest offset first, further out if still blocked. Not "tournament accurate," but enough to keep wall-adjacent rotations from getting stuck nonsensically, solving the actual problem I ran into without implementing the full SRS spec. Anyone who's played modern Tetris and is used to precise per-piece kick behavior — especially T-spins — will notice right away that this doesn't rotate quite like the real thing in tricky wall situations. That's a conscious tradeoff, not an oversight.

Line clearing is another spot I think is worth showing, because it's shorter than the common approach of manually `splice`-ing or shifting rows down one at a time, which is easy to get wrong when several lines clear at once:

```javascript
const remaining = board.filter((row) => !row.every(Boolean));
const clearedCount = ROWS - remaining.length;
const newRows = [];
for (let i = 0; i < clearedCount; i++) newRows.push(new Array(COLS).fill(null));
board = newRows.concat(remaining);
```

Filter out the rows that *aren't* full, then prepend exactly as many empty rows as were cleared. It doesn't matter which rows got cleared or how they were scattered — the result is always correct because the remaining rows naturally keep their relative order.

The most interesting thing I found wasn't actually a bug, but a defensive branch that has never once fired. Looking back at the condition `if (br >= 0 && board[br][bc]) return true;` inside `collides`, it implicitly lets `br < 0` — a piece partly above the board — pass through without being treated as a collision. That's reasonable in principle; plenty of Tetris implementations spawn pieces partly above the visible playfield. But tracing every place the current piece's `row` can change: `spawnPiece` always sets `row: 0`, horizontal movement never changes `row`, soft/hard drop only increases it, rotation doesn't touch the base `row` either. In other words, `row` never goes below 0 across the entire lifetime of a piece — the branch that allows `br < 0` was written with the right defensive intent, but given how the board is currently designed, it has never had a chance to actually fire.

I decided not to change anything. This isn't a bug — the game behaves correctly, and the branch is harmless, producing no wrong result on any execution path. Leaving it in place is the right call: it still serves as a safety net if `spawnPiece` ever gets changed to spawn pieces at `row < 0`, which is actually the more common approach in other Tetris implementations, so a horizontal I-piece doesn't look "clipped" the instant it appears. Not every piece of code that's "never been reached" is a sign of a bug or dead weight to delete — sometimes it's reasonable defense for a condition that doesn't happen *right now* but *could*, if some other design decision changes down the line.

Writing your own Tetris isn't hard in the "make it run" part — it's hard in the deciding part, since every small detail has become an unspoken genre convention, and you have to pick how faithfully to follow it versus how much to simplify. I kept the scoring table exactly as the modern Tetris Guideline defines it (100/300/500/800 scaled by level, 1 point per cell soft-dropped, 2 points per cell hard-dropped), because that's the thing players *feel* most directly. The absolute precision of wall-kicks, something only veteran players would ever notice, is what I chose to simplify. A reasonable tradeoff for a clone built in an afternoon, not a tournament-grade implementation.

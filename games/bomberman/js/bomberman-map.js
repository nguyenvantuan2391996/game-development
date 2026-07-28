class BombermanMap {
    constructor() {
        this.cols = COLS;
        this.rows = ROWS;
        this.grid = [];
        this.generate();
    }

    generate() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    row.push(TILE_HARD);
                } else if (r % 2 === 0 && c % 2 === 0) {
                    row.push(TILE_HARD);
                } else if (Math.random() < 0.72) {
                    row.push(TILE_SOFT);
                } else {
                    row.push(TILE_EMPTY);
                }
            }
            this.grid.push(row);
        }

        SPAWN_POINTS.forEach((sp) => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const r = sp.row + dr;
                    const c = sp.col + dc;
                    if (r <= 0 || r >= this.rows - 1 || c <= 0 || c >= this.cols - 1) continue;
                    if (this.grid[r][c] === TILE_SOFT) this.grid[r][c] = TILE_EMPTY;
                }
            }
        });
    }

    getTile(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TILE_HARD;
        return this.grid[row][col];
    }

    isHard(col, row) {
        return this.getTile(col, row) === TILE_HARD;
    }

    isSolid(col, row) {
        const t = this.getTile(col, row);
        return t === TILE_HARD || t === TILE_SOFT;
    }

    destroySoft(col, row) {
        if (this.getTile(col, row) === TILE_SOFT) {
            this.grid[row][col] = TILE_EMPTY;
            return true;
        }
        return false;
    }

    rectOverlapsSolid(x, y, w, h) {
        const colStart = Math.floor(x / TILE);
        const colEnd = Math.floor((x + w - 1) / TILE);
        const rowStart = Math.floor(y / TILE);
        const rowEnd = Math.floor((y + h - 1) / TILE);
        for (let r = rowStart; r <= rowEnd; r++) {
            for (let c = colStart; c <= colEnd; c++) {
                if (this.isSolid(c, r)) return true;
            }
        }
        return false;
    }

    render(ctx) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.grid[r][c];
                const x = c * TILE;
                const y = r * TILE;

                ctx.fillStyle = "#151327";
                ctx.fillRect(x, y, TILE, TILE);

                if (t === TILE_HARD) {
                    ctx.fillStyle = "#4a4468";
                    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
                    ctx.fillStyle = "#332f52";
                    ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
                } else if (t === TILE_SOFT) {
                    ctx.fillStyle = "#b5651d";
                    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
                    ctx.strokeStyle = "rgba(0,0,0,0.25)";
                    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
                }
            }
        }
    }
}

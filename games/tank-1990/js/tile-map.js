class TileMap {
    constructor(layout) {
        this.cols = layout[0].length;
        this.rows = layout.length;
        this.grid = layout.map((row) => row.split("").map((ch) => TILE_CHAR_MAP[ch] ?? TILE_EMPTY));
        this.baseAlive = true;
    }

    getTile(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TILE_STEEL;
        return this.grid[row][col];
    }

    isSolidForTank(col, row) {
        const t = this.getTile(col, row);
        return t === TILE_BRICK || t === TILE_STEEL || t === TILE_WATER || t === TILE_BASE;
    }

    isSolidForBullet(col, row) {
        const t = this.getTile(col, row);
        return t === TILE_BRICK || t === TILE_STEEL || t === TILE_BASE;
    }

    damageTile(col, row) {
        const t = this.getTile(col, row);
        if (t === TILE_BRICK) {
            this.grid[row][col] = TILE_EMPTY;
            return "brick";
        }
        if (t === TILE_STEEL) return "steel";
        if (t === TILE_BASE) {
            this.grid[row][col] = TILE_EMPTY;
            this.baseAlive = false;
            return "base";
        }
        return null;
    }

    rectOverlapsSolidForTank(x, y, w, h) {
        const colStart = Math.floor(x / TILE);
        const colEnd = Math.floor((x + w - 1) / TILE);
        const rowStart = Math.floor(y / TILE);
        const rowEnd = Math.floor((y + h - 1) / TILE);
        for (let r = rowStart; r <= rowEnd; r++) {
            for (let c = colStart; c <= colEnd; c++) {
                if (this.isSolidForTank(c, r)) return true;
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
                if (t === TILE_BRICK) {
                    ctx.fillStyle = "#b5651d";
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = "rgba(0,0,0,0.25)";
                    ctx.strokeRect(x + 1, y + 1, TILE / 2 - 1, TILE / 2 - 1);
                    ctx.strokeRect(x + TILE / 2, y + 1, TILE / 2 - 1, TILE / 2 - 1);
                    ctx.strokeRect(x + 1, y + TILE / 2, TILE / 2 - 1, TILE / 2 - 1);
                    ctx.strokeRect(x + TILE / 2, y + TILE / 2, TILE / 2 - 1, TILE / 2 - 1);
                } else if (t === TILE_STEEL) {
                    ctx.fillStyle = "#9aa5b1";
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = "#6b7684";
                    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
                } else if (t === TILE_WATER) {
                    ctx.fillStyle = "#2a6fdb";
                    ctx.fillRect(x, y, TILE, TILE);
                } else if (t === TILE_BASE) {
                    ctx.fillStyle = "#ffcf4d";
                    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
                    ctx.fillStyle = "#ff3d9a";
                    ctx.beginPath();
                    ctx.moveTo(x + TILE / 2, y + 6);
                    ctx.lineTo(x + TILE - 8, y + TILE - 8);
                    ctx.lineTo(x + 8, y + TILE - 8);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    }
}

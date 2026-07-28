class Bomb {
    constructor(col, row, flameRange, placedAt) {
        this.col = col;
        this.row = row;
        this.flameRange = flameRange;
        this.placedAt = placedAt;
        this.exploded = false;
    }

    get x() {
        return this.col * TILE + (TILE - BOMB_SIZE) / 2;
    }

    get y() {
        return this.row * TILE + (TILE - BOMB_SIZE) / 2;
    }

    render(ctx) {
        const pulse = Math.sin(performance.now() / 90) * 2;
        ctx.fillStyle = "#1f1c33";
        ctx.beginPath();
        ctx.arc(
            this.col * TILE + TILE / 2,
            this.row * TILE + TILE / 2,
            BOMB_SIZE / 2 + pulse,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.fillStyle = "#ff8a3d";
        ctx.fillRect(this.col * TILE + TILE / 2 - 2, this.row * TILE + TILE / 2 - BOMB_SIZE / 2 - 6, 4, 6);
    }
}

class PowerUp {
    constructor(col, row, kind) {
        this.col = col;
        this.row = row;
        this.kind = kind;
        this.collected = false;
    }

    render(ctx) {
        const x = this.col * TILE + TILE / 2;
        const y = this.row * TILE + TILE / 2;
        const colors = { bomb: "#ffcf4d", flame: "#ff3d9a", speed: "#4ce6d0" };
        ctx.fillStyle = colors[this.kind] || "#f5f4fb";
        ctx.beginPath();
        ctx.roundRect(x - POWERUP_SIZE / 2, y - POWERUP_SIZE / 2, POWERUP_SIZE, POWERUP_SIZE, 5);
        ctx.fill();
        ctx.fillStyle = "#0b0a1f";
        ctx.font = "bold 12px Poppins, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const glyph = { bomb: "B", flame: "F", speed: "S" }[this.kind] || "?";
        ctx.fillText(glyph, x, y + 1);
    }
}

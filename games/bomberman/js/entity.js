class Entity {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.size = config.size;
        this.speed = config.speed;
        this.dir = config.dir || DIR.DOWN;
        this.type = config.type;
        this.hp = config.hp || 1;
        this.maxHp = this.hp;
        this.alive = true;
        this.invulnerable = false;
        this.aiTimer = 0;
        this.blocked = false;
    }

    get centerX() {
        return this.x + this.size / 2;
    }

    get centerY() {
        return this.y + this.size / 2;
    }

    get gridCol() {
        return Math.floor(this.centerX / TILE);
    }

    get gridRow() {
        return Math.floor(this.centerY / TILE);
    }

    render(ctx) {
        const { x, y, size } = this;
        let bodyColor = "#7c5cff";
        if (this.type === "enemy") bodyColor = "#ff3d9a";
        if (this.type === "boss") bodyColor = "#e63946";

        ctx.save();
        if (this.invulnerable && Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.type === "player" ? "#ffcf4d" : "#f5f4fb";
        const eyeOffsetX = this.dir.x * (size / 4);
        const eyeOffsetY = this.dir.y * (size / 4);
        ctx.beginPath();
        ctx.arc(x + size / 2 + eyeOffsetX, y + size / 2 + eyeOffsetY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.type === "boss") {
            const barW = size + 14;
            const hpRatio = Math.max(this.hp, 0) / this.maxHp;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(x - 7, y - 14, barW, 6);
            ctx.fillStyle = "#3ddc84";
            ctx.fillRect(x - 7, y - 14, barW * hpRatio, 6);
        }
    }
}

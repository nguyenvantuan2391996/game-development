class Tank {
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
        this.fireCooldown = 0;
        this.aiTimer = 0;
        this.fireTimer = 0;
        this.blocked = false;
        this.invulnerable = false;
        this.lives = 0;
    }

    get centerX() {
        return this.x + this.size / 2;
    }

    get centerY() {
        return this.y + this.size / 2;
    }

    canFire() {
        return this.fireCooldown <= 0;
    }

    resetFireCooldown(ms) {
        this.fireCooldown = ms;
    }

    tickCooldown(dtMs) {
        if (this.fireCooldown > 0) this.fireCooldown -= dtMs;
    }

    muzzlePosition() {
        const offset = this.size / 2 + 2;
        return {
            x: this.centerX + this.dir.x * offset,
            y: this.centerY + this.dir.y * offset,
        };
    }

    render(ctx) {
        const { x, y, size } = this;
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        const angle = Math.atan2(this.dir.y, this.dir.x) + Math.PI / 2;
        ctx.rotate(angle);

        let bodyColor = "#7c5cff";
        if (this.type === "enemy") bodyColor = "#ff3d9a";
        if (this.type === "boss") bodyColor = "#e63946";

        ctx.fillStyle = bodyColor;
        ctx.fillRect(-size / 2, -size / 2, size, size);

        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6);

        ctx.fillStyle = this.type === "player" ? "#ffcf4d" : "#f5f4fb";
        ctx.fillRect(-3, -size / 2 - 4, 6, size / 2 + 4);

        ctx.restore();

        if (this.type === "boss") {
            const barW = size + 10;
            const hpRatio = Math.max(this.hp, 0) / this.maxHp;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(x - 5, y - 12, barW, 6);
            ctx.fillStyle = "#3ddc84";
            ctx.fillRect(x - 5, y - 12, barW * hpRatio, 6);
        }
    }
}

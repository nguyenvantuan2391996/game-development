class Bullet {
    constructor(x, y, dir, speed, owner) {
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.speed = speed;
        this.owner = owner;
        this.alive = true;
        this.size = BULLET_SIZE;
    }

    update(dt) {
        this.x += this.dir.x * this.speed * dt;
        this.y += this.dir.y * this.speed * dt;
    }

    render(ctx) {
        ctx.fillStyle = this.owner === "player" ? "#ffcf4d" : "#ff3d9a";
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

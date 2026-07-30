const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GROUND_HEIGHT = 60;
const GRAVITY_Y = 1500;
const FLAP_VELOCITY = -430;
const PIPE_GAP = 160;
const PIPE_WIDTH = 68;
const PIPE_SPEED = 180;
const PIPE_SPAWN_MS = 1400;
const BIRD_RADIUS = 16;
const BEST_SCORE_KEY = "flappyBirdBestScore";
const BEST_SCORE_AI_KEY = "flappyBirdBestScoreAI";
const Q_TABLE_KEY = "flappyBirdQTable";
const Q_EPISODE_KEY = "flappyBirdQEpisode";
const Q_EPSILON_KEY = "flappyBirdQEpsilon";

const urlParams = new URLSearchParams(window.location.search);
const MODE = urlParams.get("mode") === "ai" ? "ai" : "normal";

// Survives Scene.restart() (which throws away the old Scene instance),
// so training keeps its Q-table/episode count across every AI "death".
let sharedAgent = null;
let activeScene = null;
let currentTimeScale = 1;

class FlappyScene extends Phaser.Scene {
    constructor() {
        super("flappy");
    }

    create() {
        activeScene = this;
        this.mode = MODE;
        this.state = "ready";
        this.score = 0;
        this.bestKey = this.mode === "ai" ? BEST_SCORE_AI_KEY : BEST_SCORE_KEY;
        this.best = Number(localStorage.getItem(this.bestKey)) || 0;

        if (this.mode === "ai") {
            if (!sharedAgent) {
                sharedAgent = new QLearningAgent([0, 1], Q_TABLE_KEY, Q_EPISODE_KEY, Q_EPSILON_KEY);
            }
            this.agent = sharedAgent;
            this.pendingState = null;
            this.time.timeScale = currentTimeScale;
            this.physics.world.timeScale = currentTimeScale;
        }

        this.createTextures();
        this.createBackground();
        this.createGround();
        this.createBird();

        this.pipes = this.add.group();
        this.pipeTimer = null;

        this.scoreText = this.add
            .text(GAME_WIDTH / 2, 40, "0", {
                fontFamily: "Poppins, sans-serif",
                fontSize: "48px",
                fontStyle: "700",
                color: "#f5f4fb",
            })
            .setOrigin(0.5)
            .setDepth(10);

        this.messageText = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, "Chạm hoặc nhấn Space\nđể bắt đầu bay", {
                fontFamily: "Poppins, sans-serif",
                fontSize: "18px",
                color: "#f5f4fb",
                align: "center",
                wordWrap: { width: 280 },
            })
            .setOrigin(0.5)
            .setDepth(10);

        this.bestText = this.add
            .text(GAME_WIDTH - 16, 16, `Best: ${this.best}`, {
                fontFamily: "Poppins, sans-serif",
                fontSize: "14px",
                color: "#ffcf4d",
            })
            .setOrigin(1, 0)
            .setDepth(10);

        this.physics.add.collider(this.bird, this.groundBody, () => this.gameOver());
        this.physics.add.overlap(this.bird, this.pipes, () => this.gameOver());

        if (this.mode === "ai") {
            this.messageText.setVisible(false);
            this.updateAiHud();
            this.startGame();
        } else {
            this.input.on("pointerdown", () => this.handleInput());
            this.input.keyboard.on("keydown-SPACE", () => this.handleInput());

            this.floatTween = this.tweens.add({
                targets: this.bird,
                y: this.bird.y + 12,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
        }
    }

    updateAiHud() {
        const episodeEl = document.getElementById("hud-episode");
        const epsilonEl = document.getElementById("hud-epsilon");
        if (episodeEl) episodeEl.textContent = this.agent.episode;
        if (epsilonEl) epsilonEl.textContent = this.agent.epsilon.toFixed(2);
    }

    getNextPipe() {
        let nearest = null;
        this.pipes.getChildren().forEach((pipe) => {
            if (!pipe.isTopPipe || pipe.scored) return;
            if (!nearest || pipe.x < nearest.x) nearest = pipe;
        });
        if (!nearest) return null;
        return { x: nearest.x, gapCenterY: nearest.height + PIPE_GAP / 2 };
    }

    aiUpdate() {
        if (this.state === "ready") {
            this.startGame();
            return;
        }

        if (this.pendingState !== null) {
            const died = this.state === "gameover";
            const nextPipe = died ? null : this.getNextPipe();
            let reward;
            if (died) {
                reward = -10;
            } else if (this.score > this.pendingScore) {
                reward = 10;
            } else {
                const newDy = nextPipe ? Math.abs(this.bird.y - nextPipe.gapCenterY) : this.pendingDy;
                reward = newDy < this.pendingDy ? 1 : -1;
            }
            const nextState = died ? this.pendingState : getFlappyState(this.bird, nextPipe);
            this.agent.learn(this.pendingState, this.pendingAction, reward, nextState, died);
            this.pendingState = null;
        }

        if (this.state === "gameover") {
            this.agent.episode += 1;
            this.agent.decayEpsilon();
            if (this.agent.episode % 20 === 0) this.agent.save();
            this.updateAiHud();
            this.time.delayedCall(80, () => {
                if (this.scene) this.scene.restart();
            });
            return;
        }

        const nextPipe = this.getNextPipe();
        if (!nextPipe) return;

        const state = getFlappyState(this.bird, nextPipe);
        const actionIndex = this.agent.chooseAction(state);
        if (this.agent.actions[actionIndex] === 1) this.flap();

        this.pendingState = state;
        this.pendingAction = actionIndex;
        this.pendingScore = this.score;
        this.pendingDy = Math.abs(this.bird.y - nextPipe.gapCenterY);
        this.updateAiHud();
    }

    createTextures() {
        if (this.textures.exists("bird")) return;

        const birdWidth = Math.ceil(BIRD_RADIUS * 2.4);
        const birdHeight = BIRD_RADIUS * 2;
        const birdGfx = this.make.graphics({ x: 0, y: 0, add: false });
        birdGfx.fillStyle(0xffcf4d, 1);
        birdGfx.fillCircle(BIRD_RADIUS, BIRD_RADIUS, BIRD_RADIUS);
        birdGfx.fillStyle(0xff9d2f, 1);
        birdGfx.fillTriangle(
            BIRD_RADIUS * 1.5, BIRD_RADIUS,
            birdWidth - 1, BIRD_RADIUS - 5,
            birdWidth - 1, BIRD_RADIUS + 5
        );
        birdGfx.fillStyle(0x0b0a1f, 1);
        birdGfx.fillCircle(BIRD_RADIUS * 1.4, BIRD_RADIUS * 0.7, 3);
        birdGfx.generateTexture("bird", birdWidth, birdHeight);
        birdGfx.destroy();

        const groundGfx = this.make.graphics({ x: 0, y: 0, add: false });
        groundGfx.fillStyle(0x2a2550, 1);
        groundGfx.fillRect(0, 0, GAME_WIDTH, GROUND_HEIGHT);
        groundGfx.fillStyle(0x3a3470, 1);
        groundGfx.fillRect(0, 0, GAME_WIDTH, 8);
        groundGfx.generateTexture("ground", GAME_WIDTH, GROUND_HEIGHT);
        groundGfx.destroy();
    }

    createBackground() {
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a1f).setOrigin(0);
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x7c5cff, 0.08).setOrigin(0);
    }

    createGround() {
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - GROUND_HEIGHT / 2, "ground");

        this.groundBody = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT - GROUND_HEIGHT / 2,
            GAME_WIDTH,
            GROUND_HEIGHT,
            0x000000,
            0
        );
        this.physics.add.existing(this.groundBody, true);
    }

    createBird() {
        this.bird = this.physics.add.sprite(GAME_WIDTH * 0.28, GAME_HEIGHT / 2, "bird");
        this.bird.body.setCircle(BIRD_RADIUS);
        this.bird.body.setAllowGravity(false);
        this.bird.setDepth(5);
    }

    handleInput() {
        if (this.state === "ready") {
            this.startGame();
        } else if (this.state === "playing") {
            this.flap();
        } else if (this.state === "gameover") {
            this.restart();
        }
    }

    startGame() {
        this.state = "playing";
        this.messageText.setVisible(false);
        if (this.floatTween) this.floatTween.stop();
        this.bird.body.setAllowGravity(true);
        this.flap();

        this.pipeTimer = this.time.addEvent({
            delay: PIPE_SPAWN_MS,
            callback: () => this.spawnPipePair(),
            loop: true,
        });
        this.spawnPipePair();
    }

    flap() {
        this.bird.body.setVelocityY(FLAP_VELOCITY);
        this.tweens.add({ targets: this.bird, angle: -20, duration: 100 });
    }

    spawnPipePair() {
        const groundY = GAME_HEIGHT - GROUND_HEIGHT;
        const margin = 90;
        const minCenter = margin + PIPE_GAP / 2;
        const maxCenter = groundY - margin - PIPE_GAP / 2;
        const gapCenter = Phaser.Math.Between(minCenter, maxCenter);

        const topHeight = gapCenter - PIPE_GAP / 2;
        const bottomY = gapCenter + PIPE_GAP / 2;
        const bottomHeight = groundY - bottomY;
        const spawnX = GAME_WIDTH + PIPE_WIDTH / 2;

        const topPipe = this.add
            .rectangle(spawnX, 0, PIPE_WIDTH, topHeight, 0x1fae76)
            .setOrigin(0.5, 0)
            .setStrokeStyle(4, 0x3ddc84);
        const bottomPipe = this.add
            .rectangle(spawnX, bottomY, PIPE_WIDTH, bottomHeight, 0x1fae76)
            .setOrigin(0.5, 0)
            .setStrokeStyle(4, 0x3ddc84);

        [topPipe, bottomPipe].forEach((pipe) => {
            this.physics.add.existing(pipe);
            pipe.body.setAllowGravity(false);
            pipe.body.setImmovable(true);
            pipe.body.setVelocityX(-PIPE_SPEED);
            this.pipes.add(pipe);
        });

        topPipe.isTopPipe = true;
        topPipe.scored = false;
    }

    addScore() {
        this.score += 1;
        this.scoreText.setText(String(this.score));
    }

    gameOver() {
        if (this.state === "gameover") return;
        this.state = "gameover";
        this.physics.pause();
        if (this.pipeTimer) this.pipeTimer.remove();
        this.bird.setTint(0xff3d9a);

        if (this.score > this.best) {
            this.best = this.score;
            localStorage.setItem(this.bestKey, String(this.best));
        }
        this.bestText.setText(`Best: ${this.best}`);

        if (this.mode !== "ai") {
            this.messageText.setText(`Game Over!\nĐiểm: ${this.score}\nChạm để chơi lại`);
            this.messageText.setVisible(true);
        }
    }

    restart() {
        this.scene.restart();
    }

    update() {
        if (this.state === "playing") {
            const velocityY = this.bird.body.velocity.y;
            this.bird.angle = Phaser.Math.Clamp(velocityY * 0.06, -20, 90);

            if (this.bird.y - BIRD_RADIUS <= 0) {
                this.bird.y = BIRD_RADIUS;
                this.bird.body.setVelocityY(0);
            }

            this.pipes.getChildren().forEach((pipe) => {
                if (pipe.x < -PIPE_WIDTH) {
                    pipe.destroy();
                    return;
                }
                if (!pipe.scored && pipe.isTopPipe && pipe.x + PIPE_WIDTH / 2 < this.bird.x) {
                    pipe.scored = true;
                    this.addScore();
                }
            });
        }

        if (this.mode === "ai") {
            this.aiUpdate();
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-container",
    backgroundColor: "#0b0a1f",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: GRAVITY_Y },
            debug: false,
        },
    },
    scene: [FlappyScene],
};

new Phaser.Game(config);

if (MODE === "ai") {
    const aiControls = document.getElementById("ai-controls");
    const episodeChip = document.getElementById("hud-episode-chip");
    const epsilonChip = document.getElementById("hud-epsilon-chip");
    if (aiControls) aiControls.style.display = "flex";
    if (episodeChip) episodeChip.style.display = "inline-flex";
    if (epsilonChip) epsilonChip.style.display = "inline-flex";

    document.querySelectorAll(".speed-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".speed-btn").forEach((b) => b.classList.remove("speed-btn--active"));
            btn.classList.add("speed-btn--active");
            currentTimeScale = Number(btn.dataset.scale);
            if (activeScene) {
                activeScene.time.timeScale = currentTimeScale;
                activeScene.physics.world.timeScale = currentTimeScale;
            }
        });
    });

    const resetBtn = document.getElementById("btn-reset-ai");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (sharedAgent) sharedAgent.resetLearning();
            if (activeScene) activeScene.scene.restart();
        });
    }
}

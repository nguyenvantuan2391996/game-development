const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const CHAR_Y = GAME_HEIGHT * 0.32;
const CHAR_RADIUS = 18;
const HORIZONTAL_SPEED = 150;
const RISE_SPEED_BASE = 160;
const BEAM_GAP = 140;
const BEAM_THICKNESS = 20;
const BEAM_MARGIN = 45;
const BEAM_SPAWN_MS = 1350;
const BEST_SCORE_KEY = "swingCoptersBestScore";
const BEST_SCORE_AI_KEY = "swingCoptersBestScoreAI";
const Q_TABLE_KEY = "swingCoptersQTable";
const Q_EPISODE_KEY = "swingCoptersQEpisode";
const Q_EPSILON_KEY = "swingCoptersQEpsilon";

const urlParams = new URLSearchParams(window.location.search);
const MODE = urlParams.get("mode") === "ai" ? "ai" : "normal";

// Survives Scene.restart() (which throws away the old Scene instance),
// so training keeps its Q-table/episode count across every AI "death".
let sharedAgent = null;
let activeScene = null;
let currentTimeScale = 1;

class SwingCoptersScene extends Phaser.Scene {
    constructor() {
        super("swing-copters");
    }

    create() {
        activeScene = this;
        this.mode = MODE;
        this.state = "ready";
        this.score = 0;
        this.bestKey = this.mode === "ai" ? BEST_SCORE_AI_KEY : BEST_SCORE_KEY;
        this.best = Number(localStorage.getItem(this.bestKey)) || 0;
        this.riseSpeed = RISE_SPEED_BASE;
        this.direction = 1;

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
        this.createCharacter();

        this.beams = this.add.group();
        this.beamTimer = null;

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
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, "Chạm hoặc nhấn Space\nđể đổi hướng bay", {
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

        this.physics.add.overlap(this.character, this.beams, () => this.gameOver());

        if (this.mode === "ai") {
            this.messageText.setVisible(false);
            this.updateAiHud();
            this.startGame();
        } else {
            this.input.on("pointerdown", () => this.handleInput());
            this.input.keyboard.on("keydown-SPACE", () => this.handleInput());
        }
    }

    updateAiHud() {
        const episodeEl = document.getElementById("hud-episode");
        const epsilonEl = document.getElementById("hud-epsilon");
        if (episodeEl) episodeEl.textContent = this.agent.episode;
        if (epsilonEl) epsilonEl.textContent = this.agent.epsilon.toFixed(2);
    }

    getNextBeam() {
        let nearest = null;
        this.beams.getChildren().forEach((beam) => {
            if (!beam.isPrimary || beam.scored) return;
            if (!nearest || beam.y > nearest.y) nearest = beam;
        });
        if (!nearest) return null;
        const gapStart = nearest.width;
        return { y: nearest.y, gapCenterX: gapStart + BEAM_GAP / 2 };
    }

    aiFlip() {
        this.direction *= -1;
        this.character.body.setVelocityX(this.direction * HORIZONTAL_SPEED);
        this.tweens.add({ targets: this.character, angle: this.direction * 15, duration: 150 });
    }

    aiUpdate() {
        if (this.state === "ready") {
            this.startGame();
            return;
        }

        if (this.pendingState !== null) {
            const died = this.state === "gameover";
            const nextBeam = died ? null : this.getNextBeam();
            let reward;
            if (died) {
                reward = -10;
            } else if (this.score > this.pendingScore) {
                reward = 10;
            } else {
                const newDx = nextBeam ? Math.abs(this.character.x - nextBeam.gapCenterX) : this.pendingDx;
                reward = newDx < this.pendingDx ? 1 : -1;
            }
            const nextState = died ? this.pendingState : getSwingState(this.character, this.direction, nextBeam);
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

        const nextBeam = this.getNextBeam();
        const state = getSwingState(this.character, this.direction, nextBeam);
        const actionIndex = this.agent.chooseAction(state);
        if (this.agent.actions[actionIndex] === 1) this.aiFlip();

        this.pendingState = state;
        this.pendingAction = actionIndex;
        this.pendingScore = this.score;
        this.pendingDx = nextBeam ? Math.abs(this.character.x - nextBeam.gapCenterX) : 0;
        this.updateAiHud();
    }

    createTextures() {
        if (this.textures.exists("copter")) return;

        const w = CHAR_RADIUS * 2.6;
        const h = CHAR_RADIUS * 2.4;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        gfx.fillStyle(0x7c5cff, 1);
        gfx.fillRoundedRect(w * 0.15, h * 0.35, w * 0.7, h * 0.5, 8);

        gfx.fillStyle(0xffcf4d, 1);
        gfx.fillRect(0, h * 0.28, w, 4);

        gfx.fillStyle(0xff3d9a, 1);
        gfx.fillCircle(w / 2, h * 0.28, 5);

        gfx.fillStyle(0x0b0a1f, 1);
        gfx.fillRect(w * 0.3, h * 0.85, w * 0.1, h * 0.15);
        gfx.fillRect(w * 0.6, h * 0.85, w * 0.1, h * 0.15);

        gfx.generateTexture("copter", w, h);
        gfx.destroy();

        const beamGfx = this.make.graphics({ x: 0, y: 0, add: false });
        beamGfx.fillStyle(0x1fae76, 1);
        beamGfx.fillRect(0, 0, 40, BEAM_THICKNESS);
        beamGfx.fillStyle(0x3ddc84, 1);
        beamGfx.fillRect(0, 0, 40, 4);
        beamGfx.generateTexture("beam", 40, BEAM_THICKNESS);
        beamGfx.destroy();
    }

    createBackground() {
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a1f).setOrigin(0);
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x7c5cff, 0.08).setOrigin(0);

        this.add
            .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 3, GAME_HEIGHT, 0xffffff, 0.05)
            .setOrigin(0.5);
    }

    createCharacter() {
        this.character = this.physics.add.sprite(GAME_WIDTH / 2, CHAR_Y, "copter");
        this.character.body.setCircle(CHAR_RADIUS, (this.character.width - CHAR_RADIUS * 2) / 2, 0);
        this.character.body.setAllowGravity(false);
        this.character.setDepth(5);

        this.floatTween = this.tweens.add({
            targets: this.character,
            angle: -8,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });
    }

    handleInput() {
        if (this.state === "ready") {
            this.startGame();
        } else if (this.state === "playing") {
            this.direction *= -1;
            this.character.body.setVelocityX(this.direction * HORIZONTAL_SPEED);
            this.tweens.add({ targets: this.character, angle: this.direction * 15, duration: 150 });
        } else if (this.state === "gameover") {
            this.restart();
        }
    }

    startGame() {
        this.state = "playing";
        this.messageText.setVisible(false);
        if (this.floatTween) this.floatTween.stop();
        this.character.angle = 0;
        this.character.body.setVelocityX(this.direction * HORIZONTAL_SPEED);

        this.beamTimer = this.time.addEvent({
            delay: BEAM_SPAWN_MS,
            callback: () => this.spawnBeam(),
            loop: true,
        });
        this.spawnBeam();
    }

    spawnBeam() {
        const gapStart = Phaser.Math.Between(
            BEAM_MARGIN,
            GAME_WIDTH - BEAM_MARGIN - BEAM_GAP
        );
        const gapEnd = gapStart + BEAM_GAP;
        const y = -BEAM_THICKNESS;

        const leftWidth = gapStart;
        const rightWidth = GAME_WIDTH - gapEnd;

        const leftBeam = this.add
            .rectangle(0, y, leftWidth, BEAM_THICKNESS, 0x1fae76)
            .setOrigin(0, 0.5)
            .setStrokeStyle(3, 0x3ddc84);
        const rightBeam = this.add
            .rectangle(gapEnd, y, rightWidth, BEAM_THICKNESS, 0x1fae76)
            .setOrigin(0, 0.5)
            .setStrokeStyle(3, 0x3ddc84);

        [leftBeam, rightBeam].forEach((beam) => {
            this.physics.add.existing(beam);
            beam.body.setAllowGravity(false);
            beam.body.setImmovable(true);
            beam.body.setVelocityY(this.riseSpeed);
            this.beams.add(beam);
        });

        leftBeam.scored = false;
        leftBeam.isPrimary = true;
    }

    addScore() {
        this.score += 1;
        this.scoreText.setText(String(this.score));
        if (this.score % 5 === 0) {
            this.riseSpeed = Math.min(this.riseSpeed + 12, RISE_SPEED_BASE + 90);
            this.beams.getChildren().forEach((b) => b.body.setVelocityY(this.riseSpeed));
        }
    }

    gameOver() {
        if (this.state === "gameover") return;
        this.state = "gameover";
        this.physics.pause();
        if (this.beamTimer) this.beamTimer.remove();
        this.character.setTint(0xff3d9a);

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
            if (this.character.x - CHAR_RADIUS <= 0 || this.character.x + CHAR_RADIUS >= GAME_WIDTH) {
                this.gameOver();
            } else {
                this.beams.getChildren().forEach((beam) => {
                    if (beam.y > GAME_HEIGHT + BEAM_THICKNESS) {
                        beam.destroy();
                        return;
                    }
                    if (beam.isPrimary && !beam.scored && beam.y > CHAR_Y) {
                        beam.scored = true;
                        this.addScore();
                    }
                });
            }
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
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [SwingCoptersScene],
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

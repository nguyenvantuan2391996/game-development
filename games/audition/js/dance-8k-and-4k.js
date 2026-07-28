// Variable
let audio = new Audio();
let isReverse = false;
let isSpaced = false;
// True for the entire 3s gap where the box is hidden between rounds
// (whether the round ended via Space or timed out), so arrow-key presses
// during that gap don't get matched against the still-stale listKeyRandom
// (it isn't regenerated until pos next crosses 1150).
let isBoxHidden = false;
let increase = 1;
let pos = 0;
let count = 0;
let countToIncreaseLevel = 0;
let score = 0;
let level = 6;
let listKeyRandom = [];
let listKeyPress = [];
const boxElement = document.getElementById("box");
let picElement = document.getElementById("pic");
let scoreElement = document.getElementById("score");
let comboElement = document.getElementById("combo");
let intervalID = null;
let typeDance = "4k";

// Shared across dance-8k-and-4k.js / dance-beat-up.js so both game modes can
// feed the same HUD (combo, best score) and be paused/resumed generically.
let comboCount = 0;
let maxCombo = 0;
let judgementCounts = { perfect: 0, great: 0, cool: 0, bad: 0, miss: 0 };
let bestScore = 0;
let isPaused = false;
let isCountingDown = true;
const gameLoopControl = { start: null, stop: null };

// Consecutive-Perfect streak: each Perfect beyond the first in a row adds a
// growing bonus on top of the normal judgement score (capped so late-game
// streaks don't dwarf the base scoring).
let perfectStreak = 0;
const PERFECT_STREAK_BONUS_STEP = 50;
const PERFECT_STREAK_BONUS_CAP = 500;
let perfectStreakElement = document.getElementById("perfect-streak");

function updatePerfectStreak(isPerfect) {
  if (!isPerfect) {
    perfectStreak = 0;
    if (perfectStreakElement) perfectStreakElement.textContent = "";
    return;
  }
  perfectStreak++;
  if (perfectStreak > 1) {
    score += Math.min(
      PERFECT_STREAK_BONUS_STEP * (perfectStreak - 1),
      PERFECT_STREAK_BONUS_CAP
    );
    scoreElement.textContent = score;
  }
  if (perfectStreakElement) {
    perfectStreakElement.textContent =
      perfectStreak > 1 ? "Perfect x" + perfectStreak : "";
  }
}

function startMoveLoop() {
  if (intervalID === null) {
    intervalID = setInterval(move, 0);
  }
}

function stopMoveLoop() {
  clearInterval(intervalID);
  intervalID = null;
}

function updateCombo(hit) {
  comboCount = hit ? comboCount + 1 : 0;
  if (comboCount > maxCombo) maxCombo = comboCount;
  if (comboElement) {
    comboElement.textContent = comboCount > 1 ? comboCount + "x combo" : "";
  }
}

function compareKeyPressAndRandom(key) {
  if (isBoxHidden || listKeyPress.length === listKeyRandom.length) {
    return;
  }

  const mapKey = typeDance === "4k" ? MAP_KEY_4K : MAP_KEY_8K;
  if (mapKey.get(listKeyRandom[listKeyPress.length]) === key) {
    const hitElement = document.getElementById(String(listKeyPress.length + 1));
    listKeyPress.push(key + "-success");
    setKey(key + "-success", listKeyPress.length);
    highlightCurrentKey();
    hitElement.classList.remove("key-hit");
    void hitElement.offsetWidth;
    hitElement.classList.add("key-hit");
  } else {
    listKeyPress = [];
    for (let i = 0; i < listKeyRandom.length; i++) {
      setKey(listKeyRandom[i], i + 1);
    }
    highlightCurrentKey();
  }
}

function getListKey(level, listRandom) {
  let list = [];
  Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
  };
  for (let i = 0; i < level; i++) {
    list.push(listRandom.random());
  }
  return list;
}

function resetKeyRandom() {
  for (let i = 1; i <= 11; i++) {
    const el = document.getElementById(i.toString());
    el.src = "";
    el.classList.remove("current-key");
  }
}

function resetListKeyPress() {
  listKeyPress = [];
}

// Highlights the next key the player needs to press in the preview row.
function highlightCurrentKey() {
  for (let i = 1; i <= listKeyRandom.length; i++) {
    document.getElementById(i.toString()).classList.remove("current-key");
  }
  if (listKeyPress.length < listKeyRandom.length) {
    const nextIndex = listKeyPress.length + 1;
    const el = document.getElementById(nextIndex.toString());
    if (el) el.classList.add("current-key");
  }
}

function setScore(pos) {
  if (listKeyPress.length !== listKeyRandom.length) {
    showJudgement(picElement, "images/Miss.png");
    judgementCounts.miss++;
    updateCombo(false);
    updatePerfectStreak(false);
    return;
  }
  if (840 <= pos && pos <= 860) {
    showJudgement(picElement, "images/Perfect.png");
    score += isReverse ? 1200 : 800;
    judgementCounts.perfect++;
    updateCombo(true);
    updatePerfectStreak(true);
  } else if ((790 <= pos && pos < 840) || (860 < pos && pos <= 910)) {
    showJudgement(picElement, "images/Great.png");
    score += isReverse ? 600 : 350;
    judgementCounts.great++;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((760 <= pos && pos < 790) || (910 < pos && pos <= 940)) {
    showJudgement(picElement, "images/Cool.png");
    score += isReverse ? 350 : 150;
    judgementCounts.cool++;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((750 <= pos && pos < 760) || (940 < pos && pos <= 950)) {
    showJudgement(picElement, "images/Bad.png");
    score += isReverse ? 200 : 50;
    judgementCounts.bad++;
    updateCombo(true);
    updatePerfectStreak(false);
  } else {
    showJudgement(picElement, "images/Miss.png");
    judgementCounts.miss++;
    updateCombo(false);
    updatePerfectStreak(false);
  }
  scoreElement.textContent = score;
}

function move() {
  if (pos > 1150) {
    pos = 0;
    count++;
    if (count >= MIN_COUNT_TO_PLAY) {
      resetKeyRandom();
      setTimeout(function () {
        listKeyRandom = isReverse
          ? typeDance === "4k"
            ? getListKey(level, LIST_KEY_HAS_REVERSE_4K)
            : getListKey(level, LIST_KEY_HAS_REVERSE_8K)
          : typeDance === "4k"
          ? getListKey(level, LIST_KEY_4K)
          : getListKey(level, LIST_KEY_8K);
        for (let i = 0; i < listKeyRandom.length; i++) {
          setKey(listKeyRandom[i], i + 1);
        }
        highlightCurrentKey();
      }, 1000);
    }
    if (
      count >= MIN_COUNT_TO_PLAY &&
      countToIncreaseLevel % ROUNDS_PER_LEVEL_UP === 0
    ) {
      level++;
    }
    if (level > MAX_LEVEL) {
      level = MAX_LEVEL;
    }
    if (count > MIN_COUNT_TO_PLAY && !isSpaced) {
      countToIncreaseLevel++;
      showJudgement(picElement, "images/Miss.png");
      updateCombo(false);
      updatePerfectStreak(false);
      resetListKeyPress();
      hide("box");
      isBoxHidden = true;
      setTimeout(function () {
        show("box");
        pos = 0;
        isBoxHidden = false;
      }, 3000);
    }
  }

  pos += increase;
  boxElement.style.left = pos + "px";
}

// Event press key
document.body.onkeyup = function (e) {
  if (e.code === "Escape") {
    togglePause();
    return;
  }

  if (isPaused || isCountingDown) {
    return;
  }

  switch (typeDance) {
    case "4k":
    case "8k":
      if (e.code === "Space" && count >= MIN_COUNT_TO_PLAY && !isSpaced) {
        isSpaced = true;
        setScore(pos);
        hide("box");
        isBoxHidden = true;
        resetListKeyPress();
        setTimeout(function () {
          show("box");
          pos = 0;
          isSpaced = false;
          isBoxHidden = false;
        }, 3000);
        countToIncreaseLevel++;
      }

      // Key dance
      if (e.code === "ArrowUp" || e.code === "Numpad8") {
        compareKeyPressAndRandom("up");
      }
      if (e.code === "ArrowDown" || e.code === "Numpad2") {
        compareKeyPressAndRandom("down");
      }
      if (e.code === "ArrowRight" || e.code === "Numpad6") {
        compareKeyPressAndRandom("right");
      }
      if (e.code === "ArrowLeft" || e.code === "Numpad4") {
        compareKeyPressAndRandom("left");
      }
      if (e.code === "Numpad7") {
        compareKeyPressAndRandom("left-up");
      }
      if (e.code === "Numpad9") {
        compareKeyPressAndRandom("right-up");
      }
      if (e.code === "Numpad1") {
        compareKeyPressAndRandom("left-down");
      }
      if (e.code === "Numpad3") {
        compareKeyPressAndRandom("right-down");
      }

      // Key turn on, turn off reverse
      if (e.code === "NumpadDecimal") {
        isReverse = !isReverse;
        if (isReverse) {
          document.getElementById("reverse").textContent = "Reverse";
          show("reverse");
        } else {
          hide("reverse");
        }
      }
      break;
    case "beat-up":
      if (e.code === "Space" || e.code === "Numpad5") {
        hide("box-beat-up");
        setScoreBeatUpSpace(posSpaceBeatUp);
        setTimeout(function () {
          show("box-beat-up");
          posSpaceBeatUp = 0;
        }, 3000);
      }

      // Key dance
      if (e.code === "ArrowLeft" || e.code === "Numpad4") {
        setScoreBeatUpLeft(posLeft);
        posLeft = 0;
      }
      if (e.code === "Numpad7") {
        setScoreBeatUpLeft(posLeftUp);
        posLeftUp = 0;
      }
      if (e.code === "Numpad1") {
        setScoreBeatUpLeft(posLeftDown);
        posLeftDown = 0;
      }
      if (e.code === "ArrowRight" || e.code === "Numpad6") {
        setScoreBeatUpRight(posRight);
        posRight = 0;
      }
      if (e.code === "Numpad9") {
        setScoreBeatUpRight(posRightUp);
        posRightUp = 0;
      }
      if (e.code === "Numpad3") {
        setScoreBeatUpRight(posRightDown);
        posRightDown = 0;
      }
      break;
  }
};

function togglePause() {
  if (isCountingDown || !gameLoopControl.start) {
    return;
  }
  isPaused = !isPaused;
  if (isPaused) {
    audio.pause();
    gameLoopControl.stop();
    show("pause-overlay");
  } else {
    audio.play();
    gameLoopControl.start();
    hide("pause-overlay");
  }
}

function resumeFromPause() {
  if (isPaused) {
    togglePause();
  }
}

function quitToHome() {
  window.location.href = "/game-development/games/audition/home.html";
}

function initVariable() {
  isReverse = false;
  isSpaced = false;
  isBoxHidden = false;
  increase = 1;
  pos = 0;
  count = 0;
  countToIncreaseLevel = 0;
  score = 0;
  level = 6;
  listKeyRandom = [];
  listKeyPress = [];
  comboCount = 0;
  maxCombo = 0;
  judgementCounts = { perfect: 0, great: 0, cool: 0, bad: 0, miss: 0 };
  perfectStreak = 0;
  picElement = document.getElementById("pic");
  scoreElement = document.getElementById("score");
  comboElement = document.getElementById("combo");
  perfectStreakElement = document.getElementById("perfect-streak");
}

audio.onended = function () {
  gameLoopControl.stop();
  const result = saveBestScoreIfHigher(typeDance, score);
  showScoreSummary({
    score,
    best: result.best,
    isNewBest: result.isNewBest,
    maxCombo,
    judgementCounts,
    onReplay: function () {
      window.location.reload();
    },
    onHome: function () {
      window.location.href = "/game-development/games/audition/home.html";
    },
  });
};

// Shows a 3-2-1 countdown (reusing the Ready.png artwork already on the
// page) before the audio and game loop start, so players aren't thrown in
// mid-motion the instant the page loads.
function startCountdownThenPlay() {
  isCountingDown = true;
  show("countdown-overlay");
  const countdownText = document.getElementById("countdown-text");
  let secondsLeft = COUNTDOWN_SECONDS;
  countdownText.textContent = secondsLeft;

  const countdownInterval = setInterval(function () {
    secondsLeft--;
    if (secondsLeft > 0) {
      countdownText.textContent = secondsLeft;
      return;
    }
    if (secondsLeft === 0) {
      countdownText.textContent = "Go!";
      return;
    }
    clearInterval(countdownInterval);
    hide("countdown-overlay");
    isCountingDown = false;
    audio.play().catch(function (error) {
      console.log(
        "Chrome cannot play sound without user interaction first" + error
      );
    });
    gameLoopControl.start();
  }, 700);
}

async function initAudio() {
  stopMoveLoop();

  const urlParams = new URLSearchParams(window.location.search);
  const musicParam = urlParams.get("music");
  if (musicParam === null || urlParams.get("type") === null) {
    window.location.href = "/game-development/games/audition/home.html";
    return;
  }

  if (musicParam === "local") {
    const blob = await loadLocalSongBlob();
    if (!blob) {
      window.location.href = "/game-development/games/audition/home.html";
      return;
    }
    audio.src = URL.createObjectURL(blob);
  } else {
    audio.src = musicParam;
  }

  typeDance = urlParams.get("type");
  bestScore = getBestScore(typeDance);
  const bestScoreElement = document.getElementById("best-score");
  if (bestScoreElement) {
    bestScoreElement.textContent = bestScore;
  }

  if (typeDance !== "4k" && typeDance !== "8k") {
    hide("4k-8k-dance");
    initVariableBeatUp();
    gameLoopControl.start = startBeatUpLoops;
    gameLoopControl.stop = stopBeatUpLoops;
  } else {
    hide("beat-up-dance");
    initVariable();
    gameLoopControl.start = startMoveLoop;
    gameLoopControl.stop = stopMoveLoop;
  }

  startCountdownThenPlay();
}

window.addEventListener("load", initAudio);

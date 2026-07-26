// Variable
let audio = new Audio();
let isReverse = false;
let isSpaced = false;
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
let bestScore = 0;
let isPaused = false;
let isCountingDown = true;
const gameLoopControl = { start: null, stop: null };

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
  if (comboElement) {
    comboElement.textContent = comboCount > 1 ? comboCount + "x combo" : "";
  }
}

function compareKeyPressAndRandom(key) {
  if (listKeyPress.length === listKeyRandom.length) {
    return;
  }

  const mapKey = typeDance === "4k" ? MAP_KEY_4K : MAP_KEY_8K;
  if (mapKey.get(listKeyRandom[listKeyPress.length]) === key) {
    listKeyPress.push(key + "-success");
    setKey(key + "-success", listKeyPress.length);
    highlightCurrentKey();
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
    updateCombo(false);
    return;
  }
  if (840 <= pos && pos <= 860) {
    showJudgement(picElement, "images/Perfect.png");
    score += isReverse ? 1200 : 800;
    updateCombo(true);
  } else if ((790 <= pos && pos < 840) || (860 < pos && pos <= 910)) {
    showJudgement(picElement, "images/Great.png");
    score += isReverse ? 600 : 350;
    updateCombo(true);
  } else if ((760 <= pos && pos < 790) || (910 < pos && pos <= 940)) {
    showJudgement(picElement, "images/Cool.png");
    score += isReverse ? 350 : 150;
    updateCombo(true);
  } else if ((750 <= pos && pos < 760) || (940 < pos && pos <= 950)) {
    showJudgement(picElement, "images/Bad.png");
    score += isReverse ? 200 : 50;
    updateCombo(true);
  } else {
    showJudgement(picElement, "images/Miss.png");
    updateCombo(false);
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
      resetListKeyPress();
      hide("box");
      setTimeout(function () {
        show("box");
        pos = 0;
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
      if (e.code === "Space" && count >= MIN_COUNT_TO_PLAY) {
        isSpaced = true;
        setScore(pos);
        hide("box");
        resetListKeyPress();
        setTimeout(function () {
          show("box");
          pos = 0;
          isSpaced = false;
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
  increase = 1;
  pos = 0;
  count = 0;
  countToIncreaseLevel = 0;
  score = 0;
  level = 6;
  listKeyRandom = [];
  listKeyPress = [];
  comboCount = 0;
  picElement = document.getElementById("pic");
  scoreElement = document.getElementById("score");
  comboElement = document.getElementById("combo");
}

audio.onended = function () {
  gameLoopControl.stop();
  const result = saveBestScoreIfHigher(typeDance, score);
  Swal.fire({
    title: result.isNewBest ? "New high score!" : "Song finished!",
    html:
      "Điểm của bạn: <b>" +
      score +
      "</b><br/>Điểm cao nhất: <b>" +
      result.best +
      "</b>",
    icon: "success",
    confirmButtonText: "Về trang chủ",
  }).then(function () {
    window.location.href = "/game-development/games/audition/home.html";
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

function initAudio() {
  stopMoveLoop();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("music") === null || urlParams.get("type") === null) {
    window.location.href = "/game-development/games/audition/home.html";
    return;
  }

  audio.src = urlParams.get("music");
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

const leftUpBeatUpElement = document.getElementById("left-up-beat-up");
let posLeftUp = 0;
let intervalIDLeftUp = null;

const rightUpBeatUpElement = document.getElementById("right-up-beat-up");
let posRightUp = 0;
let intervalIDRightUp = null;

const leftBeatUpElement = document.getElementById("left-beat-up");
let posLeft = 0;
let intervalIDLeft = null;

const rightBeatUpElement = document.getElementById("right-beat-up");
let posRight = 0;
let intervalIDRight = null;

const leftDownBeatUpElement = document.getElementById("left-down-beat-up");
let posLeftDown = 0;
let intervalIDLeftDown = null;

const rightDownBeatUpElement = document.getElementById("right-down-beat-up");
let posRightDown = 0;
let intervalIDRightDown = null;

const spaceBeatUpElement = document.getElementById("box-beat-up");
let posSpaceBeatUp = 0;
let intervalIDSpaceBeatUp = null;

let timeLeftUp = 0;
let timeRightUp = 0;
let timeLeft = 0;
let timeRight = 0;
let timeLeftDown = 0;
let timeRightDown = 0;
const MAX_TIME_OUT = 5000;
let picBeatUpElement = document.getElementById("pic-beat-up");

function startBeatUpLoops() {
  if (intervalIDLeftUp === null) intervalIDLeftUp = setInterval(moveLeftUp, 15);
  if (intervalIDRightUp === null) intervalIDRightUp = setInterval(moveRightUp, 15);
  if (intervalIDLeft === null) intervalIDLeft = setInterval(moveLeft, 15);
  if (intervalIDRight === null) intervalIDRight = setInterval(moveRight, 15);
  if (intervalIDLeftDown === null) intervalIDLeftDown = setInterval(moveLeftDown, 15);
  if (intervalIDRightDown === null) intervalIDRightDown = setInterval(moveRightDown, 15);
  if (intervalIDSpaceBeatUp === null) intervalIDSpaceBeatUp = setInterval(moveSpaceBeatUp, 15);
}

function stopBeatUpLoops() {
  clearInterval(intervalIDLeftUp);
  clearInterval(intervalIDRightUp);
  clearInterval(intervalIDLeft);
  clearInterval(intervalIDRight);
  clearInterval(intervalIDLeftDown);
  clearInterval(intervalIDRightDown);
  clearInterval(intervalIDSpaceBeatUp);
  intervalIDLeftUp = null;
  intervalIDRightUp = null;
  intervalIDLeft = null;
  intervalIDRight = null;
  intervalIDLeftDown = null;
  intervalIDRightDown = null;
  intervalIDSpaceBeatUp = null;
}

function initVariableBeatUp() {
  timeLeftUp = getRandomInt(MAX_TIME_OUT);
  timeRightUp = getRandomInt(MAX_TIME_OUT);
  timeLeft = getRandomInt(MAX_TIME_OUT);
  timeRight = getRandomInt(MAX_TIME_OUT);
  timeLeftDown = getRandomInt(MAX_TIME_OUT);
  timeRightDown = getRandomInt(MAX_TIME_OUT);
}

function moveLeftUp() {
  if (posLeftUp < 450) {
    posLeftUp += increase;
  }
  leftUpBeatUpElement.style.marginLeft = posLeftUp + "px";
  if (posLeftUp === 450) {
    hide("left-up-beat-up");
    setTimeout(function () {
      posLeftUp = 0;
    }, timeLeftUp);
    show("left-up-beat-up");
  }
}

function moveRightUp() {
  if (posRightUp > 0) {
    posRightUp -= increase;
  }
  rightUpBeatUpElement.style.marginLeft = posRightUp + "px";
  if (posRightUp === 0) {
    hide("right-up-beat-up");
    setTimeout(function () {
      posRightUp = 450;
    }, timeRightUp);
    show("right-up-beat-up");
  }
}

function moveLeft() {
  if (posLeft < 450) {
    posLeft += increase;
  }
  leftBeatUpElement.style.marginLeft = posLeft + "px";
  if (posLeft === 450) {
    hide("left-beat-up");
    setTimeout(function () {
      posLeft = 0;
    }, timeLeft);
    show("left-beat-up");
  }
}

function moveRight() {
  if (posRight > 0) {
    posRight -= increase;
  }
  rightBeatUpElement.style.marginLeft = posRight + "px";
  if (posRight === 0) {
    hide("right-beat-up");
    setTimeout(function () {
      posRight = 450;
    }, timeRight);
    show("right-beat-up");
  }
}

function moveLeftDown() {
  if (posLeftDown < 450) {
    posLeftDown += increase;
  }
  leftDownBeatUpElement.style.marginLeft = posLeftDown + "px";
  if (posLeftDown === 450) {
    hide("left-down-beat-up");
    setTimeout(function () {
      posLeftDown = 0;
    }, timeLeftDown);
    show("left-down-beat-up");
  }
}

function moveRightDown() {
  if (posRightDown > 0) {
    posRightDown -= increase;
  }
  rightDownBeatUpElement.style.marginLeft = posRightDown + "px";
  if (posRightDown === 0) {
    hide("right-down-beat-up");
    setTimeout(function () {
      posRightDown = 450;
    }, timeRightDown);
    show("right-down-beat-up");
  }
}

function moveSpaceBeatUp() {
  if (posSpaceBeatUp < 450) {
    posSpaceBeatUp += increase;
  }
  spaceBeatUpElement.style.left = posSpaceBeatUp + "px";
  if (posSpaceBeatUp === 450) {
    posSpaceBeatUp = 0;
  }
}

// 280 - 410
function setScoreBeatUpSpace(pos) {
  if (325 <= pos && pos <= 365) {
    showJudgement(picBeatUpElement, "images/Perfect.png");
    score += isReverse ? 1200 : 800;
    updateCombo(true);
    updatePerfectStreak(true);
  } else if ((310 <= pos && pos < 325) || (365 < pos && pos <= 380)) {
    showJudgement(picBeatUpElement, "images/Great.png");
    score += isReverse ? 600 : 350;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((295 <= pos && pos < 310) || (380 < pos && pos <= 395)) {
    showJudgement(picBeatUpElement, "images/Cool.png");
    score += isReverse ? 350 : 150;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((280 <= pos && pos < 295) || (395 < pos && pos <= 410)) {
    showJudgement(picBeatUpElement, "images/Bad.png");
    score += isReverse ? 200 : 50;
    updateCombo(true);
    updatePerfectStreak(false);
  } else {
    showJudgement(picBeatUpElement, "images/Miss.png");
    updateCombo(false);
    updatePerfectStreak(false);
  }
  scoreElement.textContent = score;
}

// 370 - 450
function setScoreBeatUpLeft(pos) {
  if (400 <= pos && pos <= 420) {
    showJudgement(picBeatUpElement, "images/Perfect.png");
    score += isReverse ? 1200 : 800;
    updateCombo(true);
    updatePerfectStreak(true);
  } else if ((390 <= pos && pos < 400) || (420 < pos && pos <= 430)) {
    showJudgement(picBeatUpElement, "images/Great.png");
    score += isReverse ? 600 : 350;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((380 <= pos && pos < 390) || (430 < pos && pos <= 440)) {
    showJudgement(picBeatUpElement, "images/Cool.png");
    score += isReverse ? 350 : 150;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((370 <= pos && pos < 380) || (440 < pos && pos <= 450)) {
    showJudgement(picBeatUpElement, "images/Bad.png");
    score += isReverse ? 200 : 50;
    updateCombo(true);
    updatePerfectStreak(false);
  } else {
    showJudgement(picBeatUpElement, "images/Miss.png");
    updateCombo(false);
    updatePerfectStreak(false);
  }
  scoreElement.textContent = score;
}

// 0 - 80
function setScoreBeatUpRight(pos) {
  if (30 <= pos && pos <= 50) {
    showJudgement(picBeatUpElement, "images/Perfect.png");
    score += isReverse ? 1200 : 800;
    updateCombo(true);
    updatePerfectStreak(true);
  } else if ((20 <= pos && pos < 30) || (50 < pos && pos <= 60)) {
    showJudgement(picBeatUpElement, "images/Great.png");
    score += isReverse ? 600 : 350;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((10 <= pos && pos < 20) || (60 < pos && pos <= 70)) {
    showJudgement(picBeatUpElement, "images/Cool.png");
    score += isReverse ? 350 : 150;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((0 <= pos && pos < 10) || (70 < pos && pos <= 80)) {
    showJudgement(picBeatUpElement, "images/Bad.png");
    score += isReverse ? 200 : 50;
    updateCombo(true);
    updatePerfectStreak(false);
  } else {
    showJudgement(picBeatUpElement, "images/Miss.png");
    updateCombo(false);
    updatePerfectStreak(false);
  }
  scoreElement.textContent = score;
}

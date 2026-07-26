function show(id) {
  document.getElementById(id).style.display = "block";
}

function hide(id) {
  document.getElementById(id).style.display = "none";
}

function setKey(key, id) {
  document.getElementById(id).src = "images/" + key + ".png";
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// Sets the judgement image and restarts its pop-in animation, even if the
// same image was already showing (classList re-add alone wouldn't replay it).
function showJudgement(imgElement, src) {
  imgElement.src = src;
  imgElement.classList.remove("judgement-pop");
  void imgElement.offsetWidth;
  imgElement.classList.add("judgement-pop");
}

function getBestScore(danceType) {
  return Number(localStorage.getItem(BEST_SCORE_PREFIX + danceType)) || 0;
}

function saveBestScoreIfHigher(danceType, finalScore) {
  const best = getBestScore(danceType);
  if (finalScore > best) {
    localStorage.setItem(BEST_SCORE_PREFIX + danceType, String(finalScore));
    return { isNewBest: true, best: finalScore };
  }
  return { isNewBest: false, best };
}

// Lightweight modal styled to match the game's own overlay system (see
// .overlay / .overlay-btn in audition.css), replacing SweetAlert2 so popups
// don't look like a foreign library dropped into a custom-themed game.
function showModal({ icon, title, html, confirmText = "OK", onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.display = "block";
  overlay.innerHTML =
    '<div class="overlay__inner">' +
    '<div class="modal-panel">' +
    (icon ? '<div class="modal-icon modal-icon--' + icon + '"></div>' : "") +
    '<p class="modal-title">' + title + "</p>" +
    (html ? '<div class="modal-body">' + html + "</div>" : "") +
    '<div class="modal-actions">' +
    '<button type="button" class="overlay-btn modal-confirm-btn">' + confirmText + "</button>" +
    "</div></div></div>";
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-confirm-btn").addEventListener("click", function () {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
}

function AlertError(msg) {
  showModal({ icon: "error", title: "Oops...", html: msg });
}

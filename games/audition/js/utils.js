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

function AlertError(msg) {
  Swal.fire({
    icon: "error",
    title: "Oops...",
    text: msg,
  });
}

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
  imgElement.classList.remove("judgement-pop", "judgement-pop--perfect");
  void imgElement.offsetWidth;
  imgElement.classList.add(
    src.indexOf("Perfect") !== -1 ? "judgement-pop--perfect" : "judgement-pop"
  );
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

// Rough letter-grade derived from the judgement breakdown, purely cosmetic
// (weights Perfect the highest, Miss drags it down hardest).
function computeRank(counts) {
  const total =
    counts.perfect + counts.great + counts.cool + counts.bad + counts.miss;
  if (total === 0) return { letter: "-", className: "rank-c" };

  const weighted =
    (counts.perfect * 1 + counts.great * 0.8 + counts.cool * 0.55 + counts.bad * 0.25) /
    total;
  const missRatio = counts.miss / total;

  if (weighted >= 0.92 && missRatio === 0) return { letter: "S", className: "rank-s" };
  if (weighted >= 0.75 && missRatio < 0.08) return { letter: "A", className: "rank-a" };
  if (weighted >= 0.5) return { letter: "B", className: "rank-b" };
  if (weighted >= 0.25) return { letter: "C", className: "rank-c" };
  return { letter: "D", className: "rank-d" };
}

// End-of-song results screen: score, best score, best combo and a
// Perfect/Great/Cool/Bad/Miss breakdown with relative bars, styled to feel
// like an actual rhythm-game results card instead of a plain text alert.
function showScoreSummary({ score, best, isNewBest, maxCombo, judgementCounts, onReplay, onHome }) {
  const counts = judgementCounts || { perfect: 0, great: 0, cool: 0, bad: 0, miss: 0 };
  const rank = computeRank(counts);
  const maxCount = Math.max(counts.perfect, counts.great, counts.cool, counts.bad, counts.miss, 1);

  const rows = [
    { key: "perfect", label: "Perfect" },
    { key: "great", label: "Great" },
    { key: "cool", label: "Cool" },
    { key: "bad", label: "Bad" },
    { key: "miss", label: "Miss" },
  ];

  const breakdownHtml = rows
    .map((row) => {
      const count = counts[row.key] || 0;
      const widthPct = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
      return (
        '<div class="judgement-row judgement-row--' + row.key + '">' +
        '<span class="judgement-row__label">' + row.label + "</span>" +
        '<span class="judgement-row__bar"><span style="width:' + widthPct + '%"></span></span>' +
        '<span class="judgement-row__count">' + count + "</span>" +
        "</div>"
      );
    })
    .join("");

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.display = "block";
  overlay.innerHTML =
    '<div class="overlay__inner">' +
    '<div class="modal-panel summary-panel">' +
    '<div class="summary-rank ' + rank.className + '">' + rank.letter + "</div>" +
    '<div class="modal-icon modal-icon--' + (isNewBest ? "trophy" : "success") + '"></div>' +
    '<p class="modal-title">' + (isNewBest ? "Kỷ lục mới!" : "Hoàn thành bài hát!") + "</p>" +
    '<div class="summary-score">' +
    '<span class="summary-score__value">' + score + "</span>" +
    '<span class="summary-score__label">điểm</span>' +
    "</div>" +
    '<div class="summary-stats">' +
    '<div class="stat-chip"><span class="stat-chip__label">Cao nhất</span><span class="stat-chip__value">' + best + "</span></div>" +
    '<div class="stat-chip"><span class="stat-chip__label">Combo cao nhất</span><span class="stat-chip__value">' + (maxCombo || 0) + "x</span></div>" +
    "</div>" +
    '<div class="judgement-breakdown">' + breakdownHtml + "</div>" +
    '<div class="modal-actions">' +
    '<button type="button" class="overlay-btn summary-replay-btn">Chơi lại</button>' +
    '<button type="button" class="overlay-btn overlay-btn--ghost summary-home-btn">Về trang chủ</button>' +
    "</div>" +
    "</div></div>";
  document.body.appendChild(overlay);

  overlay.querySelector(".summary-replay-btn").addEventListener("click", function () {
    overlay.remove();
    if (onReplay) onReplay();
  });
  overlay.querySelector(".summary-home-btn").addEventListener("click", function () {
    overlay.remove();
    if (onHome) onHome();
  });
}

// Carries a locally picked mp3 (a Blob) from home.html to audition.html.
// Blob/object URLs die the moment the document that created them navigates
// away, so a plain query-string URL can't be used like it is for remote
// songs - IndexedDB is used instead since it can store a Blob directly and
// survives the full-page navigation between the two screens.
function openLocalSongDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("audition-local-music", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("songs")) {
        db.createObjectStore("songs");
      }
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalSongBlob(blob) {
  const db = await openLocalSongDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("songs", "readwrite");
    tx.objectStore("songs").put(blob, "selected");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadLocalSongBlob() {
  const db = await openLocalSongDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("songs", "readonly");
    const request = tx.objectStore("songs").get("selected");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remembers the last picked folder (a FileSystemDirectoryHandle) so the
// player isn't forced through the OS folder picker on every visit - only
// supported where the File System Access API exists (Chrome/Edge).
async function saveLocalFolderHandle(handle) {
  const db = await openLocalSongDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("handles", "readwrite");
    tx.objectStore("handles").put(handle, "folder");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadLocalFolderHandle() {
  const db = await openLocalSongDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("handles", "readonly");
    const request = tx.objectStore("handles").get("folder");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

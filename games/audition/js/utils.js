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

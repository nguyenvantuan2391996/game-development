const danceSelect = document.getElementById("list-type-dance");
const btnLetsGo = document.getElementById("button");

let previewAudio = new Audio();
let previewingCard = null;
// Selected music URL, tracked separately from the hidden <select> below:
// that select only ever had <option>s for the 3 default songs, so it can't
// represent a dynamically searched Jamendo track (assigning .value to a URL
// with no matching <option> silently fails and leaves it at "").
let selectedMusicUrl = "";
// Set instead of selectedMusicUrl when the chosen card is a local mp3 file
// (see buildLocalSongCard) - a File object can't be represented as a URL
// query param, so it's handed off separately in handleLetGo().
let selectedLocalFile = null;

function updateLetsGoState() {
  const ready = selectedMusicUrl !== "" && danceSelect.value !== "";
  btnLetsGo.classList.toggle("is-ready", ready);
}

function selectSongCard(card) {
  document
    .querySelectorAll(".song-card")
    .forEach((c) => c.classList.remove("is-selected"));
  card.classList.add("is-selected");
  selectedMusicUrl = card.dataset.value;
  selectedLocalFile = card._localFile || null;
  updateLetsGoState();
}

function selectDanceCard(card) {
  document
    .querySelectorAll(".dance-card")
    .forEach((c) => c.classList.remove("is-selected"));
  card.classList.add("is-selected");
  danceSelect.value = card.dataset.value;
  updateLetsGoState();
}

let previewObjectUrl = null;

function togglePreview(card, event) {
  event.stopPropagation();
  const icon = card.querySelector(".preview-btn i");

  if (previewingCard === card) {
    previewAudio.pause();
    previewingCard = null;
    icon.className = "fa-solid fa-play";
    return;
  }

  document.querySelectorAll(".preview-btn i").forEach((i) => {
    i.className = "fa-solid fa-play";
  });

  previewAudio.pause();
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  if (card._localFile) {
    previewObjectUrl = URL.createObjectURL(card._localFile);
    previewAudio = new Audio(previewObjectUrl);
  } else {
    previewAudio = new Audio(card.dataset.value);
  }
  previewAudio.play().catch(() => {});
  previewingCard = card;
  icon.className = "fa-solid fa-pause";
  previewAudio.onended = () => {
    icon.className = "fa-solid fa-play";
    previewingCard = null;
  };
}

function renderBestScores() {
  document.querySelectorAll(".dance-card").forEach((card) => {
    const best = getBestScore(card.dataset.value);
    card.querySelector(".dance-card__best").textContent =
      "Best: " + best;
  });
}

async function handleLetGo() {
  const music = selectedMusicUrl;
  const typeDance = danceSelect.value;

  if (music === "" || typeDance === "") {
    AlertError("Vui lòng chọn nhạc và kiểu nhảy");
    return;
  }
  previewAudio.pause();

  if (selectedLocalFile) {
    await saveLocalSongBlob(selectedLocalFile);
    window.location.href =
      "/game-development/games/audition/audition.html?music=local&type=" +
      encodeURIComponent(typeDance);
    return;
  }

  window.location.href =
    "/game-development/games/audition/audition.html?music=" +
    encodeURIComponent(music) +
    "&type=" +
    encodeURIComponent(typeDance);
}

function attachSongCardHandlers(card) {
  card.addEventListener("click", () => selectSongCard(card));
  const previewBtn = card.querySelector(".preview-btn");
  if (previewBtn) {
    previewBtn.addEventListener("click", (event) => togglePreview(card, event));
  }
}

document.querySelectorAll(".song-card").forEach(attachSongCardHandlers);

document.querySelectorAll(".dance-card").forEach((card) => {
  card.addEventListener("click", () => selectDanceCard(card));
});

renderBestScores();

// ---------------------------------------------------------------------------
// Song search (Jamendo - Creative Commons music)
// ---------------------------------------------------------------------------
const songSearchInput = document.getElementById("song-search-input");
const songSearchStatus = document.getElementById("song-search-status");
const suggestedGrid = document.getElementById("song-grid-suggested");
const searchResultsGrid = document.getElementById("song-grid-search-results");
const localGrid = document.getElementById("song-grid-local");
let songSearchDebounce = null;
let songSearchRequestId = 0;

// Some Jamendo track names arrive with HTML entities baked into the text
// itself (e.g. literal "&quot;" instead of a quote character), so decode
// once before displaying. Uses a template element rather than innerHTML on
// the live DOM, so no script in the decoded text ever executes.
function decodeHtmlEntities(text) {
  const template = document.createElement("template");
  template.innerHTML = text;
  return template.content.textContent;
}

function buildSongCard(title, artist, streamUrl) {
  const card = document.createElement("div");
  card.className = "song-card";
  card.dataset.value = streamUrl;

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "preview-btn";
  previewBtn.title = "Preview";
  previewBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

  const text = document.createElement("div");
  text.className = "song-card__text";
  const titleEl = document.createElement("div");
  titleEl.className = "song-card__title";
  titleEl.textContent = decodeHtmlEntities(title);
  const artistEl = document.createElement("div");
  artistEl.className = "song-card__artist";
  artistEl.textContent = decodeHtmlEntities(artist);
  text.append(titleEl, artistEl);

  card.append(previewBtn, text);
  attachSongCardHandlers(card);
  return card;
}

async function fetchJamendoTracks(query) {
  const url =
    "https://api.jamendo.com/v3.0/tracks/?client_id=" +
    encodeURIComponent(JAMENDO_CLIENT_ID) +
    "&format=json&limit=12&audioformat=mp32&namesearch=" +
    encodeURIComponent(query);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }
  const data = await response.json();
  return data.results || [];
}

async function runSongSearch(query) {
  const requestId = ++songSearchRequestId;
  songSearchStatus.textContent = "Đang tìm...";
  try {
    // Jamendo's API returns an empty result set for a real query surprisingly
    // often (~30% of the time in testing, even on identical back-to-back
    // requests), so an empty response gets a couple of retries before we
    // trust it as "no matches".
    let tracks = await fetchJamendoTracks(query);
    for (let attempt = 0; attempt < 2 && tracks.length === 0; attempt++) {
      tracks = await fetchJamendoTracks(query);
    }
    if (requestId !== songSearchRequestId) {
      return; // a newer search superseded this one
    }
    searchResultsGrid.innerHTML = "";
    if (tracks.length === 0) {
      songSearchStatus.textContent = "Không tìm thấy bài nào";
    } else {
      tracks.forEach((track) => {
        searchResultsGrid.appendChild(
          buildSongCard(track.name, track.artist_name, track.audio)
        );
      });
      songSearchStatus.textContent = tracks.length + " kết quả";
    }
    suggestedGrid.hidden = true;
    searchResultsGrid.hidden = false;
    localGrid.hidden = true;
  } catch (error) {
    if (requestId !== songSearchRequestId) {
      return;
    }
    songSearchStatus.textContent = "Lỗi tìm kiếm, thử lại sau";
  }
}

songSearchInput.addEventListener("input", () => {
  const query = songSearchInput.value.trim();
  clearTimeout(songSearchDebounce);

  if (query === "") {
    songSearchRequestId++; // invalidate any in-flight search
    songSearchStatus.textContent = "";
    searchResultsGrid.hidden = true;
    suggestedGrid.hidden = false;
    return;
  }

  songSearchDebounce = setTimeout(() => runSongSearch(query), 400);
});

// ---------------------------------------------------------------------------
// Local mp3 files (picked from a folder on the player's own computer)
// ---------------------------------------------------------------------------
const btnPickLocalFolder = document.getElementById("btn-pick-local-folder");
const localFolderInput = document.getElementById("local-folder-input");
const localFolderStatus = document.getElementById("local-folder-status");

function buildLocalSongCard(file) {
  const card = document.createElement("div");
  card.className = "song-card";
  card.dataset.value = "local:" + file.name;
  card._localFile = file;

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "preview-btn";
  previewBtn.title = "Preview";
  previewBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

  const text = document.createElement("div");
  text.className = "song-card__text";
  const titleEl = document.createElement("div");
  titleEl.className = "song-card__title";
  titleEl.textContent = file.name.replace(/\.mp3$/i, "");
  const artistEl = document.createElement("div");
  artistEl.className = "song-card__artist";
  artistEl.textContent = "Từ máy tính";
  text.append(titleEl, artistEl);

  const badge = document.createElement("span");
  badge.className = "song-card__badge";
  badge.textContent = "Local";

  card.append(previewBtn, text, badge);
  attachSongCardHandlers(card);
  return card;
}

function renderLocalMp3Files(files) {
  localGrid.innerHTML = "";
  if (files.length === 0) {
    localFolderStatus.textContent = "Không tìm thấy file .mp3 nào trong folder";
    return;
  }
  files.forEach((file) => localGrid.appendChild(buildLocalSongCard(file)));
  localFolderStatus.textContent = files.length + " file mp3";
  songSearchInput.value = "";
  songSearchStatus.textContent = "";
  suggestedGrid.hidden = true;
  searchResultsGrid.hidden = true;
  localGrid.hidden = false;
}

// The File System Access API lets a picked folder's *handle* be stored in
// IndexedDB and reopened on a later visit (after a quick permission check),
// so the player only has to go through the OS folder picker once. Plain
// <input type="file" webkitdirectory> can't do this - a FileList has no
// concept that survives a reload - so it's kept only as a fallback for
// browsers without the newer API (Firefox, Safari).
const localFolderApiSupported = "showDirectoryPicker" in window;

async function listMp3FilesFromDirectoryHandle(dirHandle) {
  const files = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file" && /\.mp3$/i.test(entry.name)) {
      files.push(await entry.getFile());
    }
  }
  return files;
}

if (localFolderApiSupported) {
  btnPickLocalFolder.addEventListener("click", async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await saveLocalFolderHandle(dirHandle);
      localFolderStatus.textContent = "Đang đọc folder...";
      renderLocalMp3Files(await listMp3FilesFromDirectoryHandle(dirHandle));
    } catch (error) {
      if (error.name !== "AbortError") {
        localFolderStatus.textContent = "Không thể đọc folder";
      }
    }
  });

  // Try to restore the folder picked on a previous visit.
  (async () => {
    let savedHandle;
    try {
      savedHandle = await loadLocalFolderHandle();
    } catch (error) {
      return;
    }
    if (!savedHandle) return;

    try {
      const permission = await savedHandle.queryPermission({ mode: "read" });
      if (permission === "granted") {
        localFolderStatus.textContent = "Đang tải lại folder đã lưu...";
        renderLocalMp3Files(await listMp3FilesFromDirectoryHandle(savedHandle));
        return;
      }

      // Browsers require a fresh user gesture to re-confirm folder access,
      // so surface a one-click "reuse" affordance instead of the full
      // picker dialog.
      const reuseBtn = document.createElement("button");
      reuseBtn.type = "button";
      reuseBtn.className = "local-folder-btn";
      reuseBtn.innerHTML =
        '<i class="fa-solid fa-rotate-left"></i> Dùng lại folder đã lưu (' +
        savedHandle.name +
        ")";
      reuseBtn.addEventListener("click", async () => {
        const granted = await savedHandle.requestPermission({ mode: "read" });
        if (granted !== "granted") {
          localFolderStatus.textContent = "Chưa được cấp quyền đọc folder";
          return;
        }
        reuseBtn.remove();
        localFolderStatus.textContent = "Đang đọc folder...";
        renderLocalMp3Files(await listMp3FilesFromDirectoryHandle(savedHandle));
      });
      btnPickLocalFolder.insertAdjacentElement("afterend", reuseBtn);
    } catch (error) {
      // Stale handle (e.g. folder moved/deleted) - ignore, user can pick again.
    }
  })();
} else {
  btnPickLocalFolder.addEventListener("click", () => localFolderInput.click());
  localFolderInput.addEventListener("change", () => {
    const mp3Files = Array.from(localFolderInput.files).filter((file) =>
      /\.mp3$/i.test(file.name)
    );
    renderLocalMp3Files(mp3Files);
  });
}

// ---------------------------------------------------------------------------
// Ambient background music (YouTube IFrame Player API)
// ---------------------------------------------------------------------------
let ambientPlayer = null;

function onYouTubeIframeAPIReady() {
  const videoId = LIST_MUSIC[Math.floor(Math.random() * LIST_MUSIC.length)];
  ambientPlayer = new YT.Player("ambient-player", {
    height: "0",
    width: "0",
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      loop: 1,
      playlist: videoId,
    },
    events: {
      onReady: (event) => {
        event.target.setVolume(40);
        event.target.playVideo();
      },
    },
  });
}

const muteBtn = document.getElementById("btn-mute-ambient");
muteBtn.addEventListener("click", () => {
  if (!ambientPlayer) return;
  const isMuted = ambientPlayer.isMuted();
  if (isMuted) {
    ambientPlayer.unMute();
  } else {
    ambientPlayer.mute();
  }
  muteBtn.querySelector("i").className = isMuted
    ? "fa-solid fa-volume-high"
    : "fa-solid fa-volume-xmark";
});

const danceSelect = document.getElementById("list-type-dance");
const btnLetsGo = document.getElementById("button");

let previewAudio = new Audio();
let previewingCard = null;
// Selected music URL, tracked separately from the hidden <select> below:
// that select only ever had <option>s for the 3 default songs, so it can't
// represent a dynamically searched Jamendo track (assigning .value to a URL
// with no matching <option> silently fails and leaves it at "").
let selectedMusicUrl = "";

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

function togglePreview(card, event) {
  event.stopPropagation();
  const url = card.dataset.value;
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
  previewAudio = new Audio(url);
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

function handleLetGo() {
  const music = selectedMusicUrl;
  const typeDance = danceSelect.value;

  if (music === "" || typeDance === "") {
    AlertError("Vui lòng chọn nhạc và kiểu nhảy");
    return;
  }
  previewAudio.pause();
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

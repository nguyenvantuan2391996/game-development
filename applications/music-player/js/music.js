// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let player = null;
let queue = [];
let queueIndex = -1;
let favorites = loadJSON(FAVORITES_KEY, []);
let isShuffle = loadJSON(SHUFFLE_KEY, false);
let repeatMode = loadJSON(REPEAT_KEY, REPEAT_OFF);
let activeTab = "playlist";
let progressTimer = null;
let isSeeking = false;
let isVolumeDragging = false;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const el = {
  songName: document.getElementById("song-name"),
  songArtist: document.getElementById("song-artist"),
  albumCover: document.getElementById("album-cover"),
  disc: document.getElementById("disc"),
  equalizer: document.getElementById("equalizer"),
  playIcon: document.getElementById("icon-play-pause"),
  btnPlay: document.getElementById("btn-play-song"),
  btnForward: document.getElementById("btn-forward"),
  btnBackward: document.getElementById("btn-backward"),
  btnShuffle: document.getElementById("btn-shuffle"),
  btnRepeat: document.getElementById("btn-repeat"),
  btnFavorite: document.getElementById("btn-favorite"),
  btnSearch: document.getElementById("btn-search"),
  btnMenu: document.getElementById("btn-menu"),
  btnClosePlaylist: document.getElementById("btn-close-playlist"),
  playlistPanel: document.getElementById("playlist-panel"),
  playlistOverlay: document.getElementById("playlist-overlay"),
  playlistList: document.getElementById("playlist-list"),
  tabPlaylist: document.getElementById("tab-playlist"),
  tabFavorites: document.getElementById("tab-favorites"),
  progress: document.getElementById("progress"),
  progressFilled: document.getElementById("progress-filled"),
  progressThumb: document.getElementById("progress-thumb"),
  timeCurrent: document.getElementById("time-current"),
  timeDuration: document.getElementById("time-duration"),
  volume: document.getElementById("volume"),
  volumeFilled: document.getElementById("volume-filled"),
  volumeThumb: document.getElementById("volume-thumb"),
  searchPanel: document.getElementById("search-panel"),
  searchOverlay: document.getElementById("search-overlay"),
  searchInput: document.getElementById("search-input"),
  searchResults: document.getElementById("search-results"),
  btnCloseSearch: document.getElementById("btn-close-search"),
};

// Disabled until the YouTube IFrame Player has finished initializing.
el.btnSearch.disabled = true;

// ---------------------------------------------------------------------------
// YouTube IFrame Player API
// ---------------------------------------------------------------------------
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player-yt", {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady() {
  el.btnSearch.disabled = false;
  const savedVolume = loadJSON(VOLUME_KEY, 80);
  player.setVolume(savedVolume);
  setVolumeUI(savedVolume);
  setShuffleUI();
  setRepeatUI();

  const savedQueue = loadJSON(QUEUE_KEY, []);
  const savedIndex = loadJSON(QUEUE_INDEX_KEY, 0);
  if (savedQueue.length > 0) {
    queue = savedQueue;
    playIndex(savedIndex, { autoplay: false });
  }
  renderPlaylist();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setPlayingUI(true);
    startProgressTimer();
  } else if (event.data === YT.PlayerState.PAUSED) {
    setPlayingUI(false);
    stopProgressTimer();
  } else if (event.data === YT.PlayerState.ENDED) {
    setPlayingUI(false);
    stopProgressTimer();
    handleSongEnded();
  }
}

function handleSongEnded() {
  if (repeatMode === REPEAT_ONE) {
    playIndex(queueIndex, { autoplay: true });
    return;
  }

  const isLast = queueIndex >= queue.length - 1;
  if (!isShuffle && isLast && repeatMode === REPEAT_OFF) {
    return;
  }

  forward();
}

// ---------------------------------------------------------------------------
// Queue / playback
// ---------------------------------------------------------------------------
function loadQueue(songs, startIndex) {
  queue = songs;
  saveJSON(QUEUE_KEY, queue);
  playIndex(startIndex, { autoplay: true });
  renderPlaylist();
}

function playIndex(index, { autoplay }) {
  if (index < 0 || index >= queue.length) {
    return;
  }

  queueIndex = index;
  saveJSON(QUEUE_INDEX_KEY, queueIndex);

  const song = queue[index];
  if (autoplay) {
    player.loadVideoById(song.id);
  } else {
    player.cueVideoById(song.id);
  }

  el.songName.textContent = decodeHtmlEntities(song.title);
  el.songArtist.textContent = decodeHtmlEntities(song.artist);
  el.albumCover.src = song.thumbnail;
  resetProgressUI();
  setFavoriteUI();
  highlightActivePlaylistItem();
}

function togglePlay() {
  if (!player || queue.length === 0) {
    return;
  }
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function forward() {
  if (queue.length === 0) return;
  playIndex(getNextIndex("forward"), { autoplay: true });
}

function backward() {
  if (queue.length === 0) return;
  playIndex(getNextIndex("backward"), { autoplay: true });
}

function getNextIndex(direction) {
  if (queue.length <= 1) {
    return 0;
  }

  if (isShuffle) {
    let randomIndex = queueIndex;
    while (randomIndex === queueIndex) {
      randomIndex = Math.floor(Math.random() * queue.length);
    }
    return randomIndex;
  }

  if (direction === "forward") {
    return queueIndex + 1 > queue.length - 1 ? 0 : queueIndex + 1;
  }
  return queueIndex - 1 < 0 ? queue.length - 1 : queueIndex - 1;
}

// ---------------------------------------------------------------------------
// Shuffle / repeat
// ---------------------------------------------------------------------------
function toggleShuffle() {
  isShuffle = !isShuffle;
  saveJSON(SHUFFLE_KEY, isShuffle);
  setShuffleUI();
}

function setShuffleUI() {
  el.btnShuffle.classList.toggle("is-active", isShuffle);
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  saveJSON(REPEAT_KEY, repeatMode);
  setRepeatUI();
}

function setRepeatUI() {
  el.btnRepeat.classList.toggle("is-active", repeatMode !== REPEAT_OFF);
  el.btnRepeat.removeAttribute("data-mode");
  if (repeatMode === REPEAT_ONE) {
    el.btnRepeat.setAttribute("data-mode", "one");
    el.btnRepeat.title = "Repeat one";
  } else if (repeatMode === REPEAT_ALL) {
    el.btnRepeat.title = "Repeat all";
  } else {
    el.btnRepeat.title = "Repeat off";
  }
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------
function toggleFavorite() {
  const song = queue[queueIndex];
  if (!song) return;

  const existingIndex = favorites.findIndex((fav) => fav.id === song.id);
  if (existingIndex === -1) {
    favorites.push(song);
  } else {
    favorites.splice(existingIndex, 1);
  }
  saveJSON(FAVORITES_KEY, favorites);
  setFavoriteUI();
  if (activeTab === "favorites") {
    renderPlaylist();
  }
}

function setFavoriteUI() {
  const song = queue[queueIndex];
  const isFav = !!song && favorites.some((fav) => fav.id === song.id);
  el.btnFavorite.classList.toggle("is-active", isFav);
  el.btnFavorite.querySelector("i").className = isFav
    ? "fa-solid fa-heart"
    : "fa-regular fa-heart";
}

// ---------------------------------------------------------------------------
// Playlist panel
// ---------------------------------------------------------------------------
function openPlaylist() {
  el.playlistPanel.classList.add("is-open");
  el.playlistOverlay.classList.add("is-open");
}

function closePlaylist() {
  el.playlistPanel.classList.remove("is-open");
  el.playlistOverlay.classList.remove("is-open");
}

function switchTab(tab) {
  activeTab = tab;
  el.tabPlaylist.classList.toggle("is-active", tab === "playlist");
  el.tabFavorites.classList.toggle("is-active", tab === "favorites");
  renderPlaylist();
}

function renderPlaylist() {
  const list = activeTab === "playlist" ? queue : favorites;
  el.playlistList.innerHTML = "";

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.className = "playlist__empty";
    empty.textContent =
      activeTab === "playlist"
        ? "Search for a song to build your playlist."
        : "No favorites yet — tap the heart while a song plays.";
    el.playlistList.appendChild(empty);
    return;
  }

  list.forEach((song, idx) => {
    const li = document.createElement("li");
    li.className = "playlist__item";
    const isPlaying =
      activeTab === "playlist" && idx === queueIndex && queue === list;
    if (isPlaying) {
      li.classList.add("is-playing");
    }
    li.dataset.songId = song.id;

    const img = document.createElement("img");
    img.src = song.thumbnail;
    img.alt = "";

    const text = document.createElement("div");
    text.className = "playlist__item-text";
    const title = document.createElement("div");
    title.className = "playlist__item-title";
    title.textContent = decodeHtmlEntities(song.title);
    const artist = document.createElement("div");
    artist.className = "playlist__item-artist";
    artist.textContent = decodeHtmlEntities(song.artist);
    text.appendChild(title);
    text.appendChild(artist);

    li.appendChild(img);
    li.appendChild(text);

    if (isPlaying) {
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-volume-high playlist__item-playing-icon";
      li.appendChild(icon);
    }

    li.addEventListener("click", () => {
      queue = list.slice();
      saveJSON(QUEUE_KEY, queue);
      playIndex(idx, { autoplay: true });
      renderPlaylist();
    });

    el.playlistList.appendChild(li);
  });
}

function highlightActivePlaylistItem() {
  if (el.playlistPanel.classList.contains("is-open")) {
    renderPlaylist();
  }
}

// ---------------------------------------------------------------------------
// Playing UI (disc spin, equalizer, play/pause icon)
// ---------------------------------------------------------------------------
function setPlayingUI(isPlaying) {
  el.playIcon.className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
  el.disc.classList.toggle("is-spinning", isPlaying);
  el.equalizer.classList.toggle("is-active", isPlaying);
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(updateProgress, 250);
  updateProgress();
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function updateProgress() {
  if (!player || isSeeking) return;
  const current = player.getCurrentTime() || 0;
  const duration = player.getDuration() || 0;
  setProgressUI(current, duration);
}

function setProgressUI(current, duration) {
  const ratio = duration > 0 ? current / duration : 0;
  el.progressFilled.style.width = ratio * 100 + "%";
  el.progressThumb.style.left = ratio * 100 + "%";
  el.timeCurrent.textContent = formatTime(current);
  el.timeDuration.textContent = formatTime(duration);
}

function resetProgressUI() {
  setProgressUI(0, 0);
}

function seekFromClientX(clientX) {
  const rect = el.progress.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  const duration = player.getDuration() || 0;
  setProgressUI(ratio * duration, duration);
  return ratio;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Volume bar
// ---------------------------------------------------------------------------
function setVolumeUI(volume) {
  el.volumeFilled.style.width = volume + "%";
  el.volumeThumb.style.left = volume + "%";
}

function setVolumeFromClientX(clientX) {
  const rect = el.volume.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  const volume = Math.round(ratio * 100);
  setVolumeUI(volume);
  return volume;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
let searchDebounceTimer = null;
let searchRequestId = 0;

function openSearchPanel() {
  el.searchPanel.classList.add("is-open");
  el.searchOverlay.classList.add("is-open");
  el.searchInput.focus();
}

function closeSearchPanel() {
  el.searchPanel.classList.remove("is-open");
  el.searchOverlay.classList.remove("is-open");
}

function renderSearchState(html) {
  el.searchResults.innerHTML = `<li class="search__state">${html}</li>`;
}

function renderSearchResults(songs) {
  el.searchResults.innerHTML = "";

  if (songs.length === 0) {
    renderSearchState(NOT_FOUND_SONG);
    return;
  }

  songs.forEach((song) => {
    const li = document.createElement("li");
    li.className = "search__item";

    const img = document.createElement("img");
    img.src = song.thumbnail;
    img.alt = "";

    const text = document.createElement("div");
    text.className = "search__item-text";
    const title = document.createElement("div");
    title.className = "search__item-title";
    title.textContent = decodeHtmlEntities(song.title);
    const artist = document.createElement("div");
    artist.className = "search__item-artist";
    artist.textContent = decodeHtmlEntities(song.artist);
    text.appendChild(title);
    text.appendChild(artist);

    li.appendChild(img);
    li.appendChild(text);

    li.addEventListener("click", () => {
      loadQueue(songs, songs.indexOf(song));
      closeSearchPanel();
    });

    el.searchResults.appendChild(li);
  });
}

async function runSearch(keyword) {
  const requestId = ++searchRequestId;
  renderSearchState('<i class="fa-solid fa-spinner fa-spin"></i>Searching...');

  const songs = await searchKey(keyword);

  if (requestId !== searchRequestId) {
    return;
  }
  renderSearchResults(songs);
}

el.searchInput.addEventListener("input", (event) => {
  const keyword = event.target.value.trim();
  clearTimeout(searchDebounceTimer);

  if (keyword === "") {
    searchRequestId++;
    renderSearchState("Enter a song name to search");
    return;
  }

  searchDebounceTimer = setTimeout(() => runSearch(keyword), 400);
});

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
el.btnSearch.addEventListener("click", (event) => {
  event.preventDefault();
  renderSearchState("Enter a song name to search");
  el.searchInput.value = "";
  openSearchPanel();
});

el.btnCloseSearch.addEventListener("click", (event) => {
  event.preventDefault();
  closeSearchPanel();
});

el.searchOverlay.addEventListener("click", closeSearchPanel);

el.btnPlay.addEventListener("click", (event) => {
  event.preventDefault();
  togglePlay();
});

el.btnForward.addEventListener("click", (event) => {
  event.preventDefault();
  forward();
});

el.btnBackward.addEventListener("click", (event) => {
  event.preventDefault();
  backward();
});

el.btnShuffle.addEventListener("click", (event) => {
  event.preventDefault();
  toggleShuffle();
});

el.btnRepeat.addEventListener("click", (event) => {
  event.preventDefault();
  toggleRepeat();
});

el.btnFavorite.addEventListener("click", (event) => {
  event.preventDefault();
  toggleFavorite();
});

el.btnMenu.addEventListener("click", (event) => {
  event.preventDefault();
  renderPlaylist();
  openPlaylist();
});

el.btnClosePlaylist.addEventListener("click", (event) => {
  event.preventDefault();
  closePlaylist();
});

el.playlistOverlay.addEventListener("click", closePlaylist);

el.tabPlaylist.addEventListener("click", () => switchTab("playlist"));
el.tabFavorites.addEventListener("click", () => switchTab("favorites"));

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (event.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") {
    event.preventDefault();
    togglePlay();
  }
  if (event.code === "Escape") {
    closeSearchPanel();
    closePlaylist();
  }
});

// Progress bar drag/seek
el.progress.addEventListener("mousedown", (event) => {
  if (!player || queue.length === 0) return;
  isSeeking = true;
  seekFromClientX(event.clientX);
});
el.progress.addEventListener("touchstart", (event) => {
  if (!player || queue.length === 0) return;
  isSeeking = true;
  seekFromClientX(event.touches[0].clientX);
});

document.addEventListener("mousemove", (event) => {
  if (isSeeking) seekFromClientX(event.clientX);
  if (isVolumeDragging) {
    const volume = setVolumeFromClientX(event.clientX);
    player.setVolume(volume);
    saveJSON(VOLUME_KEY, volume);
  }
});
document.addEventListener("touchmove", (event) => {
  if (isSeeking) seekFromClientX(event.touches[0].clientX);
  if (isVolumeDragging) {
    const volume = setVolumeFromClientX(event.touches[0].clientX);
    player.setVolume(volume);
    saveJSON(VOLUME_KEY, volume);
  }
});

document.addEventListener("mouseup", (event) => {
  if (isSeeking) {
    const ratio = seekFromClientX(event.clientX);
    player.seekTo(ratio * (player.getDuration() || 0), true);
    isSeeking = false;
  }
  isVolumeDragging = false;
});
document.addEventListener("touchend", (event) => {
  if (isSeeking) {
    isSeeking = false;
  }
  isVolumeDragging = false;
});

// Volume bar drag
el.volume.addEventListener("mousedown", (event) => {
  if (!player) return;
  isVolumeDragging = true;
  const volume = setVolumeFromClientX(event.clientX);
  player.setVolume(volume);
  saveJSON(VOLUME_KEY, volume);
});
el.volume.addEventListener("touchstart", (event) => {
  if (!player) return;
  isVolumeDragging = true;
  const volume = setVolumeFromClientX(event.touches[0].clientX);
  player.setVolume(volume);
  saveJSON(VOLUME_KEY, volume);
});

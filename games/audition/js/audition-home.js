const musicSelect = document.getElementById("list-music");
const danceSelect = document.getElementById("list-type-dance");
const btnLetsGo = document.getElementById("button");

let previewAudio = new Audio();
let previewingCard = null;

function updateLetsGoState() {
  const ready = musicSelect.value !== "" && danceSelect.value !== "";
  btnLetsGo.classList.toggle("is-ready", ready);
}

function selectSongCard(card) {
  document
    .querySelectorAll(".song-card")
    .forEach((c) => c.classList.remove("is-selected"));
  card.classList.add("is-selected");
  musicSelect.value = card.dataset.value;
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
  const music = musicSelect.value;
  const typeDance = danceSelect.value;

  if (music === "" || typeDance === "") {
    AlertError("Vui lòng chọn nhạc và kiểu nhảy");
    return;
  }
  previewAudio.pause();
  window.location.href =
    "/game-development/games/audition/audition.html?music=" +
    music +
    "&type=" +
    typeDance;
}

document.querySelectorAll(".song-card").forEach((card) => {
  card.addEventListener("click", () => selectSongCard(card));
  const previewBtn = card.querySelector(".preview-btn");
  if (previewBtn) {
    previewBtn.addEventListener("click", (event) => togglePreview(card, event));
  }
});

document.querySelectorAll(".dance-card").forEach((card) => {
  card.addEventListener("click", () => selectDanceCard(card));
});

renderBestScores();

window.addEventListener("load", () => {
  const music = LIST_MUSIC[Math.floor(Math.random() * LIST_MUSIC.length)];
  const ambientAudio = new Audio(music);
  ambientAudio.volume = 0.4;
  ambientAudio.play().catch(function (error) {
    console.log(
      "Chrome cannot play sound without user interaction first" + error
    );
  });

  const muteBtn = document.getElementById("btn-mute-ambient");
  muteBtn.addEventListener("click", () => {
    ambientAudio.muted = !ambientAudio.muted;
    muteBtn.querySelector("i").className = ambientAudio.muted
      ? "fa-solid fa-volume-xmark"
      : "fa-solid fa-volume-high";
  });
});

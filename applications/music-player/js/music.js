document.getElementById("btn-search").addEventListener("click", (event) => {
  event.preventDefault();
  Swal.fire({
    title: "Điền tên bài hát",
    input: "text",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "Search",
    showLoaderOnConfirm: true,
    preConfirm: async (songName) => {
      const ids = await searchKey(songName);
      if (ids.length === 0) {
        AlertError(NOT_FOUND_SONG, "");
        return;
      }

      localStorage.setItem(VIDEO_YOUTUBE_ID, ids);
      localStorage.setItem(SELECTED_VIDEO_ID, ids[0]);
      document.getElementById("song").src =
        "https://www.youtube.com/embed/" +
        ids[0] +
        "?rel=0&amp;controls=0&amp;showinfo=0&amp;autoplay=1";
      document.getElementById("icon-play-pause").className = "fa fa-pause";

      // get the song's information
      await getInfoTheSong(ids[0]);
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {});
});

document.getElementById("btn-play-song").addEventListener("click", (event) => {
  document.getElementById("icon-play-pause").className =
    document.getElementById("icon-play-pause").className === "fa fa-play"
      ? "fa fa-pause"
      : "fa fa-play";
  const isAuto =
    document.getElementById("icon-play-pause").className === "fa fa-play"
      ? "0"
      : "1";
  document.getElementById("song").src =
    "https://www.youtube.com/embed/" +
    localStorage.getItem(SELECTED_VIDEO_ID) +
    "?rel=0&amp;controls=0&amp;showinfo=0&amp;autoplay=" +
    isAuto;
});

document
  .getElementById("btn-forward")
  .addEventListener("click", async (event) => {
    const newForwardIndex = getNewIndex("forward");
    const ids = localStorage.getItem(VIDEO_YOUTUBE_ID).split(",");
    localStorage.setItem(SELECTED_VIDEO_ID, ids[newForwardIndex]);

    document.getElementById("song").src =
      "https://www.youtube.com/embed/" +
      ids[newForwardIndex] +
      "?rel=0&amp;controls=0&amp;showinfo=0&amp;autoplay=1";
    await getInfoTheSong(ids[newForwardIndex]);
  });

document
  .getElementById("btn-backward")
  .addEventListener("click", async (event) => {
    const newBackwardIndex = getNewIndex("backward");
    const ids = localStorage.getItem(VIDEO_YOUTUBE_ID).split(",");
    localStorage.setItem(SELECTED_VIDEO_ID, ids[newBackwardIndex]);

    document.getElementById("song").src =
      "https://www.youtube.com/embed/" +
      ids[newBackwardIndex] +
      "?rel=0&amp;controls=0&amp;showinfo=0&amp;autoplay=1";
    await getInfoTheSong(ids[newBackwardIndex]);
  });

function getNewIndex(type) {
  const ids = localStorage.getItem(VIDEO_YOUTUBE_ID).split(",");
  const selectedID = localStorage.getItem(SELECTED_VIDEO_ID);
  let newIndex = 0;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === selectedID && type === "backward") {
      newIndex = i - 1;
      return newIndex < 0 ? ids.length - 1 : newIndex;
    }

    if (ids[i] === selectedID && type === "forward") {
      newIndex = i + 1;
      return newIndex > ids.length - 1 ? 0 : newIndex;
    }
  }

  return newIndex;
}

async function getInfoTheSong(id) {
  const songInfo = await getInfoSong(id);
  document.getElementById("song-name").textContent = songInfo.title;
  document.getElementById("song-artist").textContent = songInfo.artist;
  if (songInfo.thumbnail || songInfo.thumbnail !== NOT_FOUND) {
    document.getElementById("album-cover").src = songInfo.thumbnail;
  }
}

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
      const videoId = await searchKey(songName);
      if (!videoId) {
        AlertError(NOT_FOUND_SONG, "");
        return;
      }

      localStorage.setItem(VIDEO_YOUTUBE_ID, videoId);
      document.getElementById("song").src =
        "https://www.youtube.com/embed/" +
        videoId +
        "?rel=0&amp;controls=0&amp;showinfo=0&amp;autoplay=1";
      document.getElementById("icon-play-pause").className = "fa fa-pause";

      // get the song's information
      const songInfo = await getInfoSong(
        localStorage.getItem(VIDEO_YOUTUBE_ID)
      );
      document.getElementById("song-name").textContent = songInfo.title;
      document.getElementById("song-artist").textContent = songInfo.artist;
      if (songInfo.thumbnail) {
        document.getElementById("album-cover").src = songInfo.thumbnail;
      }
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
    localStorage.getItem(VIDEO_YOUTUBE_ID) +
    "?rel=0&amp;controls=0&amp;showinfo=0&amp;autoplay=" +
    isAuto;
});

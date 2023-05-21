async function searchKey(keyword) {
  return await searchYouTube(keyword, API_KEY);
}

async function searchYouTube(keyword, apiKey) {
  // Perform keyword search using YouTube Data API v3
  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(
      keyword
    )}&key=${apiKey}`
  );
  const searchResult = await searchResponse.json();

  return searchResult.items.map((item) => item.id.videoId);
}

async function getInfoSong(id) {
  let res = {
    title: NOT_FOUND,
    artist: NOT_FOUND,
    thumbnail: NOT_FOUND,
  };

  await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=` +
      id +
      `&part=snippet&key=` +
      API_KEY
  )
    .then((response) => response.json())
    .then((data) => {
      const video = data.items[0];
      res.artist = video.snippet.channelTitle;
      res.title = video.snippet.title;
      res.thumbnail = video.snippet.thumbnails.standard
        ? video.snippet.thumbnails.standard.url
        : video.snippet.thumbnails.high.url;
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  return res;
}

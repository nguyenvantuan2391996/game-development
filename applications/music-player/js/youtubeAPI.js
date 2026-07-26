async function searchKey(keyword) {
  return await searchYouTube(keyword, API_KEY);
}

// Perform keyword search using YouTube Data API v3 and return full song
// objects straight from the search response so we don't need an extra
// request per video just to show a title/artist/thumbnail.
async function searchYouTube(keyword, apiKey) {
  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(
      keyword
    )}&key=${apiKey}`
  );
  const searchResult = await searchResponse.json();

  if (!searchResult.items) {
    return [];
  }

  return searchResult.items
    .filter((item) => item.id && item.id.videoId)
    .map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail:
        (item.snippet.thumbnails.high && item.snippet.thumbnails.high.url) ||
        (item.snippet.thumbnails.medium && item.snippet.thumbnails.medium.url) ||
        item.snippet.thumbnails.default.url,
    }));
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

# Music Player

A browser-based music player that searches YouTube for a track and plays the
audio through a hidden YouTube IFrame Player, wrapped in a dark, glassmorphism
UI with a spinning vinyl disc.

## Features

- **Search** — a slide-down search panel (styled like the rest of the app,
  not a browser dialog) with live, debounced YouTube search as you type;
  clicking a result builds a playlist from the results.
- **Real playback controls** — play/pause, seek, and volume are driven by the
  YouTube IFrame Player API (not just swapping the iframe URL), so they behave
  like a real player.
- **Playlist panel** — slide-out panel listing the current search results,
  with the playing track highlighted. Click any track to jump to it.
- **Favorites** — heart a track to save it; browse saved tracks in the
  Favorites tab of the playlist panel. Persisted in `localStorage`.
- **Shuffle & repeat** — shuffle randomizes next/previous; repeat cycles
  through off → repeat all → repeat one.
- **Progress bar & volume** — draggable/clickable sliders with live time
  display, backed by the actual player position and volume.
- **Session persistence** — the current playlist, track, volume, shuffle, and
  repeat state are remembered across page reloads.
- **Keyboard shortcut** — <kbd>Space</kbd> toggles play/pause (when not
  typing in a text field).

## Running it

This is a static site with no build step or server-side code.

```bash
cd applications/music-player
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## Configuration

The YouTube Data API v3 key lives in `js/constants.js` (`API_KEY`). Replace it
with your own key from the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials) if
the bundled one stops working or you exceed its quota.

## File overview

| File                  | Purpose                                                        |
| --------------------- | --------------------------------------------------------------- |
| `home.html`            | Page markup and script/style includes                          |
| `css/music.css`        | Dark glassmorphism theme, disc/equalizer animations, layout    |
| `js/constants.js`      | API key and `localStorage` keys                                 |
| `js/youtubeAPI.js`     | YouTube Data API search + video-info requests                   |
| `js/utils.js`          | Small helpers (time formatting, HTML-entity decoding)            |
| `js/music.js`          | App state, YouTube IFrame Player wiring, all UI interactions     |

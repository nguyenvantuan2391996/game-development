# Audition

A browser-based rhythm dance game inspired by *Audition Online* — arrow
prompts scroll across the screen and you hit the matching keys in time to
the beat, scored on timing accuracy.

## Features

- **Three dance modes** — 4K (arrows), 8K (arrows + diagonals), and
  Beat-up (continuous multi-lane beat tracking).
- **Reverse mode** — toggle with <kbd>Del</kbd> to mirror key prompts
  mid-run for extra difficulty.
- **Song picker** — pick from a small set of preview-able songs before
  starting a run; the choice is passed to the gameplay screen and played
  back with a plain `<audio>` element.
- **Ambient background music** — while browsing the home screen, a random
  track plays via a hidden YouTube IFrame Player (same approach as the
  [music player](../../applications/music-player)), togglable with the
  mute button.
- **Scoring & combo** — Perfect / Great / Cool / Bad / Miss judgements
  drive the score and combo counter; level ramps up as you land rounds.
- **Best score tracking** — the best score per dance type is remembered in
  `localStorage` and shown both on the home screen cards and in-game HUD.
- **Pause/resume** — <kbd>Esc</kbd> pauses the run with an overlay to
  resume or quit back to the home screen.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/audition
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                       | Purpose                                                          |
| --------------------------- | ------------------------------------------------------------------ |
| `home.html`                 | Song/dance selection screen, ambient music player                 |
| `audition.html`              | Gameplay screen (HUD, countdown/pause overlays, key prompt lanes)  |
| `css/audition.css`           | Theme, layout, and prompt/judgement animations                    |
| `js/constants.js`            | Game tuning constants, key maps, ambient `LIST_MUSIC` video IDs   |
| `js/utils.js`                | Small helpers (show/hide, judgement image, best-score storage)     |
| `js/audition-home.js`        | Home screen: selection state, song preview, ambient YouTube player |
| `js/dance-8k-and-4k.js`      | Gameplay loop and scoring for the 4K/8K modes                     |
| `js/dance-beat-up.js`        | Gameplay loop and scoring for the Beat-up mode                    |

## Notes

The song choices on the home screen (`song-card` elements in `home.html`)
point at hosted MP3 files, independent of `LIST_MUSIC` in `js/constants.js`
— the latter is only used for the home screen's ambient background music.

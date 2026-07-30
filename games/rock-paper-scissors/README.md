# Rock Paper Scissors

A browser-based take on the classic hand game, split into a room-selection
lobby and a pure CSS/HTML gameplay screen where you and a "computer" hand
throw rock, paper, or scissors.

## Features

- **Room lobby** — the home screen shows four clickable room icons
  (`images/room-1.png` … `room-4.png`); clicking one prompts for a player
  name, then fetches that room's game state from a remote mock API
  (mockapi.io), rejects the join if the room already has 2 players, adds
  the player to the room, saves the name to `localStorage`, and redirects
  into the game screen.
- **CSS-driven gameplay** — the actual rock/paper/scissors round has no
  game-logic JavaScript at all: it's built from 9 hidden radio inputs (one
  per rock/paper/scissors combination) whose `:checked` state drives CSS
  `::before` content to announce "You Win!", "You Tied!", or
  "Computer Wins!", and drives which hand shapes (fist/paper fingers/
  scissors fingers) are shown.
- **Animated hands** — the user and computer hand illustrations continuously
  rock back and forth via CSS keyframe animations until a choice is made.
- **Timing-based selection** — each of the three move icons (✊ 🖐️ ✌) is
  actually three stacked labels per column with staggered, looping
  `z-index` animations, so which underlying radio button you actually hit
  depends on the moment you click — adding a reflex/luck element on top of
  the nominal choice.
- **Reset control** — a "Refresh Round" reset button (`<input type="reset">`)
  clears the selected radio so another round can be played.

## Running it

This is a static site with no build step or server-side code.

```bash
cd games/rock-paper-scissors
python3 -m http.server 8080
```

Then open `http://localhost:8080/home.html` in a browser.

## File overview

| File                            | Purpose                                                          |
| -------------------------------- | ------------------------------------------------------------------ |
| `home.html`                      | Room-selection lobby with four clickable room icons                |
| `rock-paper-scissors.html`       | Gameplay screen (hidden radios, hands, move icons, result message)  |
| `css/home.css`                   | Lobby layout and hover effects for the room boxes                  |
| `css/rock-paper-scissors.css`    | Hand illustrations, shake/selection animations, result text/reset  |
| `js/home.js`                     | Room join flow: prompt for name, call mock API, redirect into game |
| `images/room-1.png` … `room-4.png` | Room thumbnail images shown on the lobby screen                  |

## Notes

The game screen itself does not read the `name` or room data set during the
lobby join — the mock API call in `js/home.js` is only used to gate room
capacity (max 2 players) before redirecting; the round that follows is
played entirely against the CSS-driven "computer" hand, not another live
player.

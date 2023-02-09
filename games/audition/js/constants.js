// Const variable
const MAX_LEVEL = 11
const MIN_COUNT_TO_PLAY = 5
const LIST_KEY_HAS_REVERSE_4K = ["right", "up", "down", "left", "right-reverse", "up-reverse", "down-reverse", "left-reverse"]
const LIST_KEY_4K = ["right", "up", "down", "left"]
const MAP_KEY_4K = new Map([
    ["right", "right"],
    ["up", "up"],
    ["down", "down"],
    ["left", "left"],
    ["right-reverse", "left"],
    ["up-reverse", "down"],
    ["down-reverse", "up"],
    ["left-reverse", "right"],
])

const LIST_KEY_HAS_REVERSE_8K = ["right", "up", "down", "left", "right-reverse", "up-reverse", "down-reverse", "left-reverse", "right-up", "left-up", "right-down", "left-down", "right-up-reverse", "left-up-reverse", "right-down-reverse", "left-down-reverse"]
const LIST_KEY_8K = ["right", "up", "down", "left", "right-up", "left-up", "right-down", "left-down"]
const MAP_KEY_8K = new Map([
    ["right", "right"],
    ["up", "up"],
    ["down", "down"],
    ["left", "left"],
    ["right-reverse", "left"],
    ["up-reverse", "down"],
    ["down-reverse", "up"],
    ["left-reverse", "right"],
    ["right-up", "right-up"],
    ["left-up", "left-up"],
    ["right-down", "right-down"],
    ["left-down", "left-down"],
    ["right-up-reverse", "left-down"],
    ["left-up-reverse", "right-down"],
    ["right-down-reverse", "left-up"],
    ["left-down-reverse", "right-up"],
])

const LIST_MUSIC = [
    "https://firebasestorage.googleapis.com/v0/b/tuvandaihoc-c8a1c.appspot.com/o/Waiting%20For%20You%20-%20MONO_%20Onionn.mp3?alt=media&token=a10b4da9-9967-4dc4-b120-76c7e08e13e2",
    "https://firebasestorage.googleapis.com/v0/b/tuvandaihoc-c8a1c.appspot.com/o/dua%20nao%20lam%20em%20buon_%20-%20Phuc%20Du.mp3?alt=media&token=5123bcc3-3305-408c-adf9-e3cb3d95d8cd",
    "https://firebasestorage.googleapis.com/v0/b/tuvandaihoc-c8a1c.appspot.com/o/See%20Tinh%20-%20Hoang%20Thuy%20Linh.mp3?alt=media&token=87095bae-98a7-4d18-9573-2e129d0c136b"
]
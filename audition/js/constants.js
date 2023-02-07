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
    "https://data.chiasenhac.com/down2/2276/2/2275150-9f672b16/128/Waiting%20For%20You%20-%20MONO_%20Onionn.mp3",
    "https://data.chiasenhac.com/down2/2274/2/2273480-77a54e64/128/dua%20nao%20lam%20em%20buon_%20-%20Phuc%20Du.mp3",
    "https://data.chiasenhac.com/down2/2226/2/2225812-e3722baa/128/See%20Tinh%20-%20Hoang%20Thuy%20Linh.mp3"
]
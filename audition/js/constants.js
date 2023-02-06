// Const variable
const MAX_LEVEL = 11
const MIN_COUNT_TO_PLAY = 5
const LIST_KEY_HAS_REVERSE = ["right", "up", "down", "left", "right-reverse", "up-reverse", "down-reverse", "left-reverse", "right-up", "left-up", "right-down", "left-down", "right-up-reverse", "left-up-reverse", "right-down-reverse", "left-down-reverse"]
const LIST_KEY = ["right", "up", "down", "left", "right-up", "left-up", "right-down", "left-down"]
const MAP_KEY = new Map([
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
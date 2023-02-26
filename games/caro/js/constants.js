const XText = "<span class=\"x\">x</class>";
const OText = "<span class=\"o\">o</class>";
const X = "x"
const O = "o"
const WIN = "win"
const DRAW = "draw"
const TWO_PLAYER = "2-players"
const COMPUTER = "player-computer"
const COMPUTER_COMPUTER = "computer-computer"
const MAP_SCORE_COMPUTER = new Map([
    [5, Infinity], [4, 2000], [3, 500], [2, 300], [1, 100]
])
const MAP_POINT_HUMAN = new Map([
    [4, 999999], [3, 1000], [2, 400], [1, 10], [0, 0]
])
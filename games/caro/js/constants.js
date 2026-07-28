const X = "x";
const O = "o";
const WIN = "win";
const DRAW = "draw";
const TWO_PLAYER = "2-players";
const COMPUTER = "player-computer";
const COMPUTER_COMPUTER = "computer-computer";
const BOARD_SIZES = [10, 20, 30, 40, 50, 60];
const MAP_SCORE_COMPUTER = new Map([
  [6, Infinity],
  [5, 99999],
  [4, 2000],
  [3, 500],
  [2, 300],
  [1, 100],
]);
const MAP_POINT_HUMAN = new Map([
  [5, 19999],
  [4, 9999],
  [3, 1000],
  [2, 400],
  [1, 10],
  [0, 0],
]);

function show(id) {
  document.getElementById(id).style.display = "block";
}

function hide(id) {
  document.getElementById(id).style.display = "none";
}

function setKey(key, id) {
  document.getElementById(id).src = "images/" + key + ".png";
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

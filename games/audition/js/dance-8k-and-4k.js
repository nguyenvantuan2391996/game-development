// Variable
let audio = new Audio();
let isReverse = false
let isSpaced = false
let increase = 1
let pos = 0
let count = 0
let countToIncreaseLevel = 0
let score = 0
let level = 6
let listKeyRandom = []
let listKeyPress = []
const boxElement = document.getElementById("box")
let picElement = document.getElementById("pic")
let scoreElement = document.getElementById("score")
let intervalID = setInterval(move, 0)
let typeDance = "4k"

function show(id) {
    document.getElementById(id).style.display = 'block'
}

function hide(id) {
    document.getElementById(id).style.display = 'none'
}

function setKey(key, id) {
    document.getElementById(id).src = "images/" + key + ".png"
}

function compareKeyPressAndRandom(key) {
    if (listKeyPress.length === listKeyRandom.length) {
        return
    }

    const mapKey = typeDance === "4k" ? MAP_KEY_4K : MAP_KEY_8K
    if (mapKey.get(listKeyRandom[listKeyPress.length]) === key && !isReverse) {
        listKeyPress.push(key + "-success")
        setKey(key + "-success", listKeyPress.length)
    } else if (mapKey.get(listKeyRandom[listKeyPress.length]) === key && isReverse) {
        listKeyPress.push(key + "-success")
        setKey(key + "-success", listKeyPress.length)
    } else {
        listKeyPress = []
        for (let i = 0; i < listKeyRandom.length; i++) {
            setKey(listKeyRandom[i], i + 1)
        }
    }
}

function getListKey(level, listRandom) {
    let list = []
    Array.prototype.random = function () {
        return this[Math.floor((Math.random() * this.length))];
    }
    for (let i = 0; i < level; i++) {
        list.push(listRandom.random())
    }
    return list
}

function resetKeyRandom() {
    for (let i = 1; i <= 11; i++) {
        document.getElementById(i.toString()).src = ""
    }
}

function resetListKeyPress() {
    listKeyPress = []
}

function setScore(pos) {
    if (listKeyPress.length !== listKeyRandom.length) {
        picElement.src = "images/Miss.png"
        return
    }
    if (840 <= pos && pos <= 860) {
        picElement.src = "images/Perfect.png"
        score += isReverse ? 1200 : 800
    } else if ((790 <= pos && pos < 840) || (860 < pos && pos <= 910)) {
        picElement.src = "images/Great.png"
        score += isReverse ? 600 : 350
    } else if ((760 <= pos && pos < 790) || (910 < pos && pos <= 940)) {
        picElement.src = "images/Cool.png"
        score += isReverse ? 350 : 150
    } else if ((750 <= pos && pos < 760) || (940 < pos && pos <= 950)) {
        picElement.src = "images/Bad.png"
        score += isReverse ? 200 : 50
    } else {
        picElement.src = "images/Miss.png"
    }
    scoreElement.textContent = score
}

function move() {
    if (pos > 1150) {
        pos = 0
        count++
        if (count >= MIN_COUNT_TO_PLAY) {
            resetKeyRandom()
            setTimeout(function () {
                listKeyRandom = isReverse ?
                    (typeDance === "4k" ?
                            getListKey(level, LIST_KEY_HAS_REVERSE_4K) : getListKey(level, LIST_KEY_HAS_REVERSE_8K)
                    ) :
                    (typeDance === "4k" ?
                            getListKey(level, LIST_KEY_4K) : getListKey(level, LIST_KEY_8K)
                    )
                console.log(listKeyRandom)
                for (let i = 0; i < listKeyRandom.length; i++) {
                    setKey(listKeyRandom[i], i + 1)
                }
            }, 1000)
        }
        if (count >= MIN_COUNT_TO_PLAY && countToIncreaseLevel % 1 === 0) {
            level++
        }
        if (level > MAX_LEVEL) {
            level = 11;
        }
        if (count > MIN_COUNT_TO_PLAY && !isSpaced) {
            countToIncreaseLevel++
            picElement.src = "images/Miss.png"
            resetListKeyPress()
            hide("box")
            setTimeout(function () {
                show("box")
                pos = 0
            }, 3000)
        }
    }

    pos += increase
    boxElement.style.left = pos + "px"
}

// Event press key
document.body.onkeyup = function (e) {
    if (e.code === "Space" && count >= MIN_COUNT_TO_PLAY) {
        isSpaced = true
        setScore(pos)
        hide("box")
        resetListKeyPress()
        setTimeout(function () {
            show("box")
            pos = 0
            isSpaced = false
        }, 3000)
        countToIncreaseLevel++
    }

    // Key dance
    if (e.code === "ArrowUp" || e.code === "Numpad8") {
        compareKeyPressAndRandom("up")
    }
    if (e.code === "ArrowDown" || e.code === "Numpad2") {
        compareKeyPressAndRandom("down")
    }
    if (e.code === "ArrowRight" || e.code === "Numpad6") {
        compareKeyPressAndRandom("right")
    }
    if (e.code === "ArrowLeft" || e.code === "Numpad4") {
        compareKeyPressAndRandom("left")
    }
    if (e.code === "Numpad7") {
        compareKeyPressAndRandom("left-up")
    }
    if (e.code === "Numpad9") {
        compareKeyPressAndRandom("right-up")
    }
    if (e.code === "Numpad1") {
        compareKeyPressAndRandom("left-down")
    }
    if (e.code === "Numpad3") {
        compareKeyPressAndRandom("right-down")
    }

    // Key turn on, turn off reverse
    if (e.code === "NumpadDecimal") {
        isReverse = !isReverse
        if (isReverse) {
            document.getElementById("reverse").textContent = "Reverse"
            show("reverse")
        } else {
            hide("reverse")
        }
    }
}

function initVariable() {
    isReverse = false
    isSpaced = false
    increase = 1
    pos = 0
    count = 0
    countToIncreaseLevel = 0
    score = 0
    level = 6
    listKeyRandom = []
    listKeyPress = []
    picElement = document.getElementById("pic")
    scoreElement = document.getElementById("score")
}

audio.onended = function () {
    clearInterval(intervalID)
    alert("Chúc mừng bạn đã đạt: " + score + " điểm")
    window.location.href = "../home.html";
}

function initAudio() {
    clearInterval(intervalID)

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('music') === null || urlParams.get('type') === null) {
        window.location.href = "../home.html";
    }

    audio.src = urlParams.get('music')
    audio.play().catch(function (error) {
        console.log("Chrome cannot play sound without user interaction first" + error)
    });

    typeDance = urlParams.get('type')

    intervalID = setInterval(move, 0)
    initVariable()
}

window.addEventListener("load", initAudio)
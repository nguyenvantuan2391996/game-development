async function joinRoom(id) {
    let name = prompt("Please enter your name", "anonymous")
    if (name !== null) {
        let requestOptions = {
            method: 'GET',
            redirect: 'follow'
        };

        await fetch("https://63fe1d50571200b7b7c57218.mockapi.io/api/v1/games/" + id, requestOptions)
            .then(response => response.json())
            .then(result => {
                if (!result.game_info) {
                    alert("Not found game information!")
                    return
                }

                let gameInfo = JSON.parse(result.game_info)

                if (gameInfo.length >= 2) {
                    alert("Room is full!")
                    return
                }

                gameInfo.push(
                    {
                    "name": name,
                    "round": 1,
                    "sum_of_wins": 0,
                    "result": ""
                    }
                )

                // update
                update(id, gameInfo, name)
            })
            .catch(error => console.log('error', error))
    } else {

    }
}

async function update(id, gameInfo, name) {
    let myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/json")

    let raw = {
        "id": id,
        "game_info": JSON.stringify(gameInfo)
    }

    let bodyRequest = {
        method: 'PUT',
        headers: myHeaders,
        body: JSON.stringify(raw),
        redirect: 'follow'
    }

    await fetch("https://63fe1d50571200b7b7c57218.mockapi.io/api/v1/games/" + id, bodyRequest)
        .then(response => response.json())
        .then(result => {
            console.log(result)
            localStorage.setItem("name", name)
            window.location.href = "/game-development/games/rock-paper-scissors/rock-paper-scissors.html";
        })
        .catch(error => {
            alert(error)
        })
}
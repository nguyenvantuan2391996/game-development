async function joinRoom(id) {
    let name = prompt("Please enter your name", "anonymous")
    if (name !== null) {
        localStorage.setItem("name", name)
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
                if (update(id, gameInfo)) {
                    console.log("hihi")
                }
            })
            .catch(error => console.log('error', error))
    } else {

    }
}

function update(id, gameInfo) {
    let myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/json")

    let raw = {
        "id": id,
        "game_info": JSON.stringify(gameInfo)
    }

    let bodyRequest = {
        method: 'PUT',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    }

    fetch("https://63fe1d50571200b7b7c57218.mockapi.io/api/v1/games/" + id, bodyRequest)
        .then(response => response.json())
        .then(result => {
            console.log(result)
            return true
        })
        .catch(error => {
            alert(error)
            return false
        })

    return false
}
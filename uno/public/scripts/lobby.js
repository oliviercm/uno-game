const message_container = document.querySelector('.chat-field')
const messageButton = document.querySelector('.input-button')
const input = document.querySelector('.input-field-chat')
const creatGameButton = document.querySelector('.new-game-button')
const gameList = document.querySelector('.box-game-list')
const startGameButton = document.querySelector('.start-game')
const socket = io({
    path: "/global-chat/"
});

startGameButton.addEventListener('click', startGame)
messageButton.addEventListener('click', addMessage);
creatGameButton.addEventListener('click', createGame);

let globalgame_id;

socket.on('message', (data) => {

    message_container.innerHTML += createContainer(data.username, data.message)

})

socket.on('game_created', (data) => {
    gameList.innerHTML += creatGameCard(data.game_id)
})


window.onload = function populateGameList() {

    fetch('/api/games')
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            data.games.forEach(element => {
                gameList.innerHTML += creatGameCard(element.game_id)
            });
        })
        .catch((err) => console.log(err));
}


function createContainer(username, message) {
    return `
<div class="row comments mb-2">
<div class="col-md-2 col-sm-2 col-3 text-center user-img">
<p>&nbsp</p>
</div>
<div class="col-md-9 col-sm-9 col-9 comment rounded mb-2">
<h4 class="m-0"><a href="#">${username}</a></h4>
<time class="text-white ml-3"></time>
<like></like>
<p class="mb-0 text-white">${message}</p>
</div>
</div>

`
}

function addMessage() {
    if (input.value === '') {
        return
    } else {

        var message = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                "message": input.value
            })
        }
        fetch('/api/global-chat', message)
            .catch((err) => console.log(err));
        input.value = '';
        input.focus();
    }
}



function createGame() {

    fetch('/api/games', { method: 'POST' })
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            globalgame_id = data.game_id;
            return globalgame_id
        })
        .then(function (globalgame_id) {
            fetch('/api/global-chat/game-created', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    "game_id": globalgame_id
                })
            })
                .catch((err) => console.log(err));
        })
    startGameButton.style.visibility = 'visible';
}


function creatGameCard(game_id) {
    return `<div class="game-card">
    <p>Game Id: ${game_id} 
    <button class="join-game" onclick = "joinGame(${game_id})">JOIN GAME</button>
    </p>
    </div>`
}

function startGame() {
    const query = `/api/games/${globalgame_id}/start`
    fetch(query, {
        method: 'POST',
        credentials: 'include'
    })
        .then((response) => {
            if (response.status == 200) {
                window.location.href = `/game?game_id=${globalgame_id}`;
            }
            else {
                alert('ERROR')
            }
        })
}

function joinGame(game_id) {
    const query = `/api/games/${game_id}/join`
    fetch(query, {
        method: 'POST',
        credentials: 'include'
    })
        .then((response) => {
            if (response.status == 200) {
                window.location.href = `/game?game_id=${game_id}`;
            }
            else {
                alert('ERROR')
            }
        })
}
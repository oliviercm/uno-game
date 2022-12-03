import { CARD_FILE } from "./resources.js";

const searchParams = new URLSearchParams(window.location.search);
const gameId = searchParams.get("game_id");
const message_container = document.querySelector('.chat-field')
const messageButton = document.querySelector('.input-button')
const input = document.querySelector('.input-field-chat')
const socketgChat = io({
    path: '/global-chat/',
});
const socket = io({
    path: "/games/",
    query: {
        game_id: gameId,
    },
});

// GCHAT functions
messageButton.addEventListener('click', addMessage);
socketgChat.on('message', (data) => {
    message_container.innerHTML += createContainer(data.username, data.message);
});

function addMessage() {
    if (input.value === '') {
        return;
    } else {
        var message = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                message: input.value,
            }),
        };
        fetch('/api/global-chat', message).catch((err) => console.log(err));
        input.value = '';
        input.focus();
    }
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
  
  `;
}


//Game State  
const gamePlayers = {
    leftOpponent: "",
    topOpponent: "",
    rightOpponent: ""
};

let currentUser;
fetch('/api/users/current')
    .then((response) => {
        if (response.status == 200) {
            response.json().then(data => {
                currentUser = data.user;
                console.log(currentUser);
            });
        } else {
            alert('Not logged in');
        }
    });

let currentUserCards;
socket.on("game_state", (gameState) => {
    console.log(gameState);
    // const currentUserCards = gameState?.cards.filter(card => { -- change by troy
    currentUserCards = gameState?.cards.filter(card => {
        return card.location === "HAND" && card.user_id === currentUser.user_id;
    }).sort((a, b) => a.order - b.order);
    for (const card of currentUserCards) {
        // dealCard(CARD_FILE[card.color][card.value]); -- change by troy
        dealCard(card)
    }
    console.log(currentUserCards);
});

socket.on('game_event', (gameEvent) => {
    switch (gameEvent.type) {
        //Additional keys: user_id
        case "PLAYER_JOINED":
            break;
        //Additional keys: user_id
        case "PLAYER_LEFT":
        case "PLAYER_FORFEIT":
            break;
        case "DECK_SHUFFLED":
            replenishDeck();
            break;
        //Additional keys: user_id
        case "DEALT_CARD":
            dealOpponentCard(user_id)
            break;
        case "GAME_DELETED":
            //?? what do we display here
            // TODO: display message "the host has ended the game", redirect to lobby
            break;
        case "GAME_STARTED":
            //TODO
            //make 
            break;
        case "GAME_ENDED":
            break;
        default:
            console.log("Unrecognized ")
    }
})

//TODO
//direction of play matters
function addPlayer(user_id) {
    for (const opponent in gamePlayers) {
        if (!gamePlayers[opponent]) {
            gamePlayers[opponent] = user_id;
            break;
        }
    }
}

function removePlayer(user_id) {
    for (const opponent in gamePlayers) {
        if (gamePlayers[opponent] === user_id) {
            gamePlayers[opponent] = "";
            break;
        }
    }
}


let lastDeckCard;
replenishDeck();

//TODO
//get number of cards reshuffled (maybe from DECK_RESHUFFLED io event)
function replenishDeck(deckSize) {
    if (!deckSize) {
        deckSize = 80
        //TODO
        //based on 7 cards dealt to FOUR players
        //get number of players? or localize a value
    }

    for (let i = 0; i < deckSize; i++) {
        let elem = document.getElementsByClassName("deckContainer").item(0);
        let newCard = document.createElement("div");
        newCard.classList.add("card", "deckCard");
        elem.appendChild(newCard);
    }
    lastDeckCard = document.getElementsByClassName("deckContainer").item(0).lastChild;
    lastDeckCard.addEventListener("click", takeAndDeal, false);
}


function takeAndDeal() {
    lastDeckCard.remove()
    lastDeckCard = document.getElementsByClassName("deckContainer").item(0).lastChild;
    dealCard();
    lastDeckCard.addEventListener("click", takeAndDeal, false);
}

/**
 *             | |
 *             | |
 *             | |
 *            \   /
 *              ∨
 */

function dealCard(card) {
    //TODO
    //Get top card of database deck and assign specific card background
    let elem = document.getElementById("myHand");
    let newCard = document.createElement("div");
    newCard.classList.add("card", "myCard");
    newCard.setAttribute('id', `${card.card_id}`)
    newCard.style.backgroundImage = "url(" + CARD_FILE[card.color][card.value] + ")";
    newCard.addEventListener("click", function () { playCard(newCard); }, false);
    elem.appendChild(newCard);
}

function dealOpponentCard(user_id) {
    const key = Object.keys(gamePlayers).find(user_id => obj[user_id] === value);
    const elem = getElementById(key);
    let newCard = document.createElement("div");
    newCard.classList.add("card", key + "card")
}

/**
 *             | |
 *             | |
 *             | |
 *            \   /
 *              ∨
 */

//TODO
//add timeout to play another card
function playCard(elem) {
    //TODO
    const num = parseInt(elem.id)
    const query = `/api/games/${gameId}/play-card`
    fetch(query, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "card_id": num
        })
    })
    .then((response)=>{
        if(response.status == 200){
            discardPileCard(elem);
            let seconds = .2;
            elem.style.transition = "opacity " + seconds + "s ease";
            elem.style.opacity = 0;
            setTimeout(function () {
                elem.remove();
            }, 300);
            //elem.remove();
        } else {
            alert(response.statusText)
        }
    })
}


function POSTCard() {
    var card = {
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

    input.value = '';
    input.focus();
}

/**
 *             | |
 *             | |
 *             | |
 *            \   /
 *              ∨
 */

function discardPileCard(card) {
    console.log("DISCARD WAS CALLED")
    let elem = document.getElementsByClassName("discard").item(0);
    let newCard = document.createElement("div");
    let randomDegree = Math.floor(Math.random() * 20) * (Math.round(Math.random()) ? 1 : -1);
    console.log(randomDegree);
    newCard.classList.add("card", "discardCard");
    newCard.setAttribute('id', `${card.id}`) //added this --troy
    // newCard.style.backgroundImage = "url(" + CARD_FILE.GREEN.FIVE + ")"; -- changed this troy
    newCard.style.backgroundImage = card.style.backgroundImage
    newCard.animate([
        { transform: 'rotate(calc(' + randomDegree + 'deg' + ')) scale(1.5)' },
        { transform: 'rotate(calc(' + randomDegree + 'deg' + ')) scale(1)' }
    ], {
        duration: 300,
        iterations: 1
    })
    newCard.style.transform = 'rotate(calc(' + randomDegree + 'deg' + '))'
    elem.appendChild(newCard);
}

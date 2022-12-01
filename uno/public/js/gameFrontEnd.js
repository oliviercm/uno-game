import { CARD_FILE } from "./resources.js";

const searchParams = new URLSearchParams(window.location.search);
const gameId = searchParams.get("id");

const socket = io({
    path: "/games/",
    query: {
        game_id: gameId,
    },
});

const gamePlayers = {
    leftOpponent: "",
    topOpponent: "",
    rightOpponent: ""
};

socket.on("game_state", (gameState) => {
    console.log(gameState);
});

socket.on('game_event', (data) => {
    switch (data.type) {
        //Additional keys: user_id
        case "PLAYER_JOINED":
            addPlayer(data.user_id);
            break;
        //Additional keys: user_id
        case "PLAYER_LEFT":
        case "PLAYER_FORFEIT":
            removePlayer(data.user_id);
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
function addPlayer(user_id){
    for(const opponent in gamePlayers){
        if(!gamePlayers[opponent]){
            gamePlayers[opponent] = user_id;
            break;
        }
    }
}

function removePlayer(user_id){
    for (const opponent in gamePlayers){
        if(gamePlayers[opponent] === user_id){
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

//TODO
//Testing code: remove
for (let i = 0; i < 10; i++) {
    dealCard();
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

function dealCard() {
    //TODO
    //Get top card of database deck and assign specific card background
    let elem = document.getElementById("myHand");
    let newCard = document.createElement("div");
    newCard.classList.add("card", "myCard");
    newCard.style.backgroundImage = "url(" + CARD_FILE.GREEN.FIVE + ")";
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
    //Need a way to track which card in hand is which corresponding database card
    discardPileCard();
    let seconds = .2;
    elem.style.transition = "opacity "+seconds+"s ease";
    elem.style.opacity = 0;
    setTimeout(function() {
        elem.remove();
    }, 300);
    //elem.remove();
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

function discardPileCard() {
    let elem = document.getElementsByClassName("discard").item(0);
    let newCard = document.createElement("div");
    let randomDegree = Math.floor(Math.random() * 20) * (Math.round(Math.random()) ? 1 : -1);
    console.log(randomDegree);
    newCard.classList.add("card", "discardCard");
    newCard.style.backgroundImage = "url(" + CARD_FILE.GREEN.FIVE + ")";
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

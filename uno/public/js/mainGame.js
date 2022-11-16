import { CARD_FILE } from "./resources.mjs";

let lastDeckCard = document.getElementsByClassName("deckContainer").item(0).lastChild;
lastDeckCard.addEventListener("click", takeAndDeal, false);

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

function dealOpponentCard(){
    // need a way to determine which opponent is being dealt the card
}

/**
 *             | |
 *             | |
 *             | |
 *            \   /
 *              ∨
 */

function playCard(elem) {
    //TODO
    //Need a way to track which card in hand is which corresponding database card
    discardCard();
    elem.remove();
}

/**
 *             | |
 *             | |
 *             | |
 *            \   /
 *              ∨
 */

function discardCard() {
    let elem = document.getElementsByClassName("discard").item(0);
    let newCard = document.createElement("div");
    newCard.classList.add("card", "discardCard");
    newCard.style.backgroundImage = "url(" + CARD_FILE.GREEN.FIVE + ")";
    newCard.style.transform = 'rotate(calc(' + getRandomDegree() + 'deg' + '))'
    elem.appendChild(newCard);
}

//when a card is discarded a random degree is calculated that skews the card a certain amount in the discard pile
function getRandomDegree() {
    let num = Math.floor(Math.random() * 20);
    return num * (Math.round(Math.random()) ? 1 : -1);
}

//TODO
//ALL EXPOSED METHODS FOR CURRENt FRONT END NEEDED:
//Player drawing a card (need card info)
//Opponent drawing a card (don't need card info)
//Player playing a card (need card info)
//Opponent playing a card (need card info)
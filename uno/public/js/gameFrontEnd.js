import { CARD_FILE } from './resources.js';
const searchParams = new URLSearchParams(window.location.search);
const gameId = searchParams.get('game_id');
const message_container = document.querySelector('.chat-field');
const messageButton = document.querySelector('.input-button');
const input = document.querySelector('.input-field-chat');
const startGameButton = document.querySelector('.start-game');
const leaveGameButton = document.querySelector('.leave-game');
const wildcardButtonContainer = document.querySelector(
  '.wildcardButtonContainer'
);
const deckContainer = document.querySelector('.deckContainer')
const socket = io({
  path: '/games/',
  query: {
    game_id: gameId,
  },
});

// GCHAT functions
messageButton.addEventListener('click', addMessage);
socket.on('chat_message', (data) => {
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
    fetch(`/api/games/${gameId}/chat`, message).catch((err) =>
      console.log(err)
    );
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
  </div>`;
}

function startGame() {
  const query = `/api/games/${gameId}/start`;
  fetch(query, {
      method: 'POST',
      credentials: 'include',
  }).then((response) => {
      if (response.status == 200) {
        startGameButton.style.visibility = 'hidden'
      } else {
          alert('ERROR_start_game');
      }
  });
}
startGameButton.addEventListener('click', startGame);

function leaveGame() {
  const query = `/api/games/${gameId}/leave`;
  fetch(query, {
      method: 'POST',
      credentials: 'include',
  }).then((response) => {
      if (response.status == 200) {
        window.location.href = "/lobby"
      } else {
          alert('ERROR_leave_game');
      }
  });
}
leaveGameButton.addEventListener('click', leaveGame);

//  GAME STATE

let discardPileDegree = [];
for (let i = 0; i < 108; i++) {
  discardPileDegree.push(Math.floor(Math.random() * 20) * (Math.round(Math.random()) ? 1 : -1));
}

let currentUser;
fetch('/api/users/current').then((response) => {
  if (response.status == 200) {
    response.json().then((data) => {
      currentUser = data.user;
      console.log(currentUser);
    });
  } else {
    alert('Not logged in');
  }
});

socket.on("game_state", (gameState) => {
  console.log(gameState);

  // Determine if the current user is a spectator or a player
  const userIsSpectator = !gameState.users.some(user => user.user_id === currentUser.user_id);

  if (!userIsSpectator) {
    // Change user seat order such that the current user has seat order of 0, and other users follow consecutively 1, 2, 3...
    gameState.users = gameState.users.map(user => {
      let normalizedSeatOrder = user.seat_order - (gameState.users.find(user => user.user_id === currentUser.user_id)).seat_order;
      if (normalizedSeatOrder < 0) {
        normalizedSeatOrder = gameState.users.length + normalizedSeatOrder;
      }
      return {
        ...user,
        seat_order: normalizedSeatOrder,
      };
    });
  }

  // Display the "Start Game" button if the current user is the host and the game hasn't started yet
  const host = gameState?.users.find(user => user.is_host);
  if (currentUser.user_id === host.user_id) {
    if (gameState?.started === false) {
      startGameButton.style.visibility = 'visible';
    }
  }

  // Display the current user's cards
  const handElement = document.getElementById("myHand");
  while (handElement.firstChild) {
    handElement.removeChild(handElement.firstChild);
  }
  const currentUserCards = gameState?.cards.filter(card => {
    return card.user_id === currentUser.user_id;
  }).sort((a, b) => a.order - b.order);
  for (const card of currentUserCards) {
    displayOwnCard(card);
  }

  // Display opponent cards and name
  const opponents = gameState.users
    .filter(user => user.user_id !== currentUser.user_id)
    .sort((opponent1, opponent2) => opponent2.seat_order - opponent1.seat_order);
  const cardsInHands = gameState.cards.filter(card => card.location === "HAND");
  // If there is only one opponent, display them on top. Otherwise, display opponents counter-clockwise
  let orderToDisplayOpponents;
  if (opponents.length === 1) {
    orderToDisplayOpponents = ["topOpponent"];
  } else {
    orderToDisplayOpponents = ["rightOpponent", "topOpponent", "leftOpponent"];
  }
  for (let i = 0; i < opponents.length; i++) {
    const numOpponentCards = cardsInHands.filter(card => card.user_id === opponents[i].user_id).length;
    displayOpponentCards(orderToDisplayOpponents[i], numOpponentCards);
    displayOpponentUsername(orderToDisplayOpponents[i], opponents[i].username);
  }

  // Display deck
  const deckStack = gameState?.cards.filter(card => {
      return card.location === "DECK";
  });
  displayDeck(deckStack.length);

  // Display discard pile
  const discardPile = gameState?.cards.filter(card => {
    return card.location === "DISCARD"
  }).sort((a, b) => a.order - b.order);
  displayDiscardPile(discardPile);
});

socket.on('game_event', (gameEvent) => {
  console.log(gameEvent)
  switch (gameEvent.type) {
    case "PLAYER_JOINED":
      //TODO: display message "X player has joined"
      break;
    case "PLAYER_LEFT":
      //TODO: display message "X player has left"
      break;
    case "PLAYER_FORFEIT":
      //TODO: display message "X player has forfeited"
      break;
    case "DECK_SHUFFLED":
      //TODO: play an animation of the deck shuffling
      break;
    case "DEALT_CARD":
      visualizeDealtCard(gameEvent?.user_id);
      break;
    case "GAME_DELETED":
      // TODO: display message "the host has ended the game", redirect to lobby
      break;
    case "GAME_STARTED":
      //TODO: display message "the game has started"
      break;
    case "GAME_ENDED":
      //TODO: display message "the game has ended"
      break;
    case "CARD_PLAYED":
      //TODO: display an animation of a card being played
      break;
    default:
      console.log(`Unrecongnized game event: ${gameEvent.type}`);
      break;
  }
})

function displayDeck(deckSize) {
  while (deckContainer.firstChild) {
    deckContainer.removeChild(deckContainer.firstChild);
  }

  for (let i = 0; i < deckSize; i++) {
    let elem = deckContainer;
    let newCard = document.createElement('div');
    newCard.classList.add('card', 'deckCard');
    elem.appendChild(newCard);
  }
}

function displayOwnCard(card) {
  let elem = document.getElementById('myHand');
  let newCard = document.createElement('div');
  newCard.classList.add('card', 'myCard');
  newCard.setAttribute('id', `${card.card_id}`);
  newCard.style.backgroundImage =
    'url(' + CARD_FILE[card.color][card.value] + ')';
  if (card.color === 'BLACK') {
    newCard.addEventListener(
      'click',
      function () {
        window.location.href = '#modal';
        wildcard(newCard);
      },
      false
    );
  } else {
    newCard.addEventListener(
      'click',
      function () {
        playCard(newCard, null);
      },
      false
    );
  }
  elem.appendChild(newCard);
}

/**
 * @param {String} opponentKey "topOpponent", "rightOpponent", "leftOpponent"
 * @param {Number} amount Amount of cards to display in hand
 */
function displayOpponentCards(opponentKey, amount) {
  const opponentHandElement = document.getElementById(opponentKey);
  const cardsAlreadyInOpponentsHand = opponentHandElement.childElementCount;
  // Based on how many cards are already displayed and how many should be displayed, add or remove cards as necessary
  if (cardsAlreadyInOpponentsHand < amount) {
    for (let i = 0; i < amount - cardsAlreadyInOpponentsHand; i++) {
      const newCard = document.createElement('div');
      newCard.classList.add('card', `${opponentKey}Card`);
      opponentHandElement.appendChild(newCard);
    }
  } else if (cardsAlreadyInOpponentsHand > amount) {
    for (let i = 0; i < cardsAlreadyInOpponentsHand - amount; i++) {
      opponentHandElement.removeChild(opponentHandElement.firstChild);
    }
  }
}

/**
 * @param {String} opponentKey "topOpponent", "rightOpponent", "leftOpponent"
 * @param {String} username Username to display
 */
function displayOpponentUsername(opponentKey, username) {
  const opponentNameElement = document.getElementById(`${opponentKey}Name`);
  opponentNameElement.textContent = username;
}

//TODO
//add timeout to play another card
function playCard(elem, color) {
  //TODO
  const num = parseInt(elem.id);
  const query = `/api/games/${gameId}/play-card`;

  let request;

  if (color != null) {
    while (wildcardButtonContainer.firstChild) {
      wildcardButtonContainer.removeChild(wildcardButtonContainer.firstChild);
    }
    request = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_id: num,
        chosen_wildcard_color: color,
      }),
    };
  } else {
    request = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_id: num,
      }),
    };
  }

  fetch(query, request);
}

function wildcard(card) {
  const redButton = document.getElementById('redbttn');
  const blueButton = document.getElementById('bluebttn');
  const yellowButton = document.getElementById('yellowbttn');
  const greenButton = document.getElementById('greenbttn');

  redButton.addEventListener('click', function () {
    console.log('RED picked');
    playCard(card, 'RED');
    window.location.href = '#';
  });
  blueButton.addEventListener('click', function () {
    console.log('BLUE picked');
    playCard(card, 'BLUE');
    window.location.href = '#';
  });
  yellowButton.addEventListener('click', function () {
    console.log('YELLOW picked');
    playCard(card, 'YELLOW');
    window.location.href = '#';
  });
  greenButton.addEventListener('click', function () {
    console.log('GREEN picked');
    playCard(card, 'GREEN');
    window.location.href = '#';
  });
}

function displayDiscardPile(discardPile) {
    let degreeTracker = 0;
    for (const card of discardPile) {
        let elem = document.getElementsByClassName("discard").item(0);
        let newCard = document.createElement("div");
        elem.appendChild(newCard);
        newCard.classList.add("card", "discardCard");
        newCard.style.backgroundImage = "url(" + CARD_FILE[card.color][card.value] + ")";
        newCard.style.transform = 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + '))'
        degreeTracker++;
    }
    let lastCard = document.getElementsByClassName("discard").item(0).lastChild;
    lastCard.animate([
        { transform: 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + ')) scale(1.5)' },
        { transform: 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + ')) scale(1)' }
    ], {
        duration: 300,
        iterations: 1
    })
    lastCard.style.transform = 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + '))'
}

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
const colorIndicator = document.querySelector('.colorContainer');
const alertIndicator = document.querySelector('.alertContainer');
const deckContainer = document.querySelector('.deckContainer');
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

// GAME STATE

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
let playerMap = new Map();

let visualVars = {
  //base values, updates as soon as the game starts
  opponentContainerSize: 510,
  userContainerSize: 800,
  cardSize: 110
}

//TRUE === CLOCKWISE
//FALSE === COUNTERCLOCKWISE
let directionOfPlay = true;

socket.on("game_state", (gameState) => {
  console.log(gameState);

  // Determine if the current user is a spectator or a player
  const currentUserInGameState = gameState.users.find(user => user.user_id === currentUser.user_id);
  const userIsSpectator = !currentUserInGameState;

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

  //If the game is started, update the visual vars
  if (gameState?.started === true && gameState?.ended === false) {
    visualVars.cardSize = document.getElementById("myHand").children[0].clientWidth;
    visualVars.opponentContainerSize = document.getElementById("topOpponent").clientWidth;
    visualVars.userContainerSize = document.getElementById("myHand").clientWidth;
  }
  document.querySelector(':root').style.setProperty("--myHandOverlap", calculateOverlap(handElement.children.length) + "px");


  // Display turn border for self
  if (currentUserInGameState && currentUserInGameState.play_order === 0) {
    displayTurnBorder("myHand");
  }

  if (!playerMap.get(currentUser.user_id)) {
    playerMap.set(currentUser.user_id, "myHand");
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

    //add player locations to non-instanced map for other function use (game_event)
    if (!playerMap.get(opponents[i].user_id)) {
      playerMap.set(opponents[i].user_id, orderToDisplayOpponents[i]);
    }

    // Display turn border for opponents
    if (opponents[i].play_order === 0) {
      displayTurnBorder(orderToDisplayOpponents[i]);
    }
  }

  // Display deck
  const deckStack = gameState?.cards.filter(card => {
    return card.location === "DECK";
  });
  displayDeck(deckStack.length);

  // Display discard pile if game is started
  if (gameState.started) {
    const discardPile = gameState?.cards.filter(card => {
      return card.location === "DISCARD"
    }).sort((a, b) => a.order - b.order);
    displayDiscardPile(discardPile);
  }

  // Display current color and event card alerts
  if (gameState?.started === true) {
    const discardPile = gameState?.cards
      .filter((card) => {
        return card.location === 'DISCARD';
      })
      .sort((a, b) => b.order - a.order);
    console.log(discardPile);
    discardColor(discardPile, gameState);
    eventAlert(discardPile);
  }

  // Display won or lost screen
  if (gameState?.ended === true) {
    if (currentUserInGameState.state === 'WON') {
      window.location.href = '#winner';
    }
    if (currentUserInGameState.state === 'LOST') {
      window.location.href = '#loser';
    }
  }
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
      //animateDealtCard(gameEvent.user_id);
      //TODO: play an animation of a card being dealt
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
      animatePlayedCard(gameEvent.user_id, gameEvent.card_color, gameEvent.card_value);
      //TODO: display an animation of a card being played
      break;
    case "SKIPPED_TURN":
      break;
    case "REVERSED_TURNS":
      break;
    default:
      console.log(`Unrecognized game event: ${gameEvent.type}`);
      break;
  }
});

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
  let sizeControllerImg = document.createElement('img');
  sizeControllerImg.src = ('/assets/Invisible.png');
  newCard.appendChild(sizeControllerImg);
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
  opponentHandElement.style.visibility = "visible";
  const cardsAlreadyInOpponentsHand = opponentHandElement.childElementCount;
  // Based on how many cards are already displayed and how many should be displayed, add or remove cards as necessary
  if (cardsAlreadyInOpponentsHand < amount) {
    for (let i = 0; i < amount - cardsAlreadyInOpponentsHand; i++) {
      const newCard = document.createElement('div');
      const sizeControllerImg = document.createElement('img');
      sizeControllerImg.classList.add(opponentKey + "Img");
      newCard.appendChild(sizeControllerImg);
      newCard.classList.add('card', `${opponentKey}Card`);
      opponentHandElement.appendChild(newCard);
    }
  } else if (cardsAlreadyInOpponentsHand > amount) {
    for (let i = 0; i < cardsAlreadyInOpponentsHand - amount; i++) {
      opponentHandElement.removeChild(opponentHandElement.firstChild);
    }
  }
  document.querySelector(':root').style.setProperty(`--${opponentKey}Overlap`, calculateOverlap(opponentHandElement.children.length) + "px");
}

/**
 * 
 * @param {int} numCards number of cards in a hand
 * @returns calculated overlap per card so that they fit inside a container
 */
function calculateOverlap(numCards) {
  let fullOverlapValue = (visualVars.cardSize * numCards) - visualVars.opponentContainerSize;
  let overlapPerCard = ((fullOverlapValue / numCards) * -1) - (30 - numCards);
  if (overlapPerCard > -15) {
    return -15;
  }
  return overlapPerCard;
}


/**
 * @param {String} opponentKey "topOpponent", "rightOpponent", "leftOpponent"
 * @param {String} username Username to display
 */
function displayOpponentUsername(opponentKey, username) {
  const opponentNameElement = document.getElementById(`${opponentKey}Name`);
  opponentNameElement.style.visibility = "visible";
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
  const discardPileElement = document.getElementsByClassName("discard").item(0);
  while (discardPileElement.firstChild) {
    discardPileElement.removeChild(discardPileElement.firstChild);
  }
  for (const card of discardPile) {
    const newCard = document.createElement("div");
    newCard.classList.add("card", "discardCard");
    newCard.style.backgroundImage = "url(" + CARD_FILE[card.color][card.value] + ")";
    newCard.style.transform = 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + '))';
    discardPileElement.appendChild(newCard);
    degreeTracker++;
  }
  const lastCard = discardPileElement.lastChild;
  lastCard.animate([
    { transform: 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + ')) scale(1.5)' },
    { transform: 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + ')) scale(1)' }
  ], {
      duration: 300,
    iterations: 1
  })
  lastCard.style.transform = 'rotate(calc(' + discardPileDegree[degreeTracker] + 'deg' + '))'
}


/**
 * @param {String} turnHandKey "myHand", "rightOpponent", "topOpponent", "leftOpponent"
 */
function displayTurnBorder(turnHandKey) {
  const handElementKeys = ["myHandBorder", "rightOpponentBorder", "topOpponentBorder", "leftOpponentBorder"];
  const root = document.querySelector(':root');
  for (const handElementKey of handElementKeys) {
    document.getElementById(handElementKey).style.border = ".2rem solid yellow";
    root.style.setProperty(`--${handElementKey}`, "hidden");
  }
  document.getElementById(turnHandKey + "Border").style.border = "0rem";
  root.style.setProperty(`--${turnHandKey}Border`, "visible");
}


function animateDealtCard(user_id) {
  const player = document.getElementsByClassName(playerMap.get(user_id));
  //choose random card
  let cardnumber = Math.floor(Math.random() * player.children.length) * (Math.round(Math.random()));
}

function animatePlayedCard(user_id, card_color, card_value) {
  switch (card_value) {
    case "REVERSE":
      animateReverse();
      break;
    case "SKIP":
      animateSkip();
      break;
    case "DRAW_TWO":
      animateDrawTwo();
      break;
    case "DRAW_FOUR":
      animateDrawFour();
      break;
  }
}

/**
 * Displays and animates the reverse symbol
 */
function animateReverse() {
  let reverse = document.getElementById("reverse");
  let reverseContainer = document.getElementById("reverseContainer");
  reverse.style.visibility = "visible"
  reverseContainer.style.animationName = "bounce";
  reverseContainer.style.zIndex = "4";

  //CLOCKWISE
  if (directionOfPlay === true) {
    reverse.animate([
      { transform: 'rotate(0deg) scale(1.5)' },
      { transform: 'rotate(270deg) scale(1.5)' }
    ], {
      duration: 3000,
      iterations: 1
    })
    directionOfPlay = !directionOfPlay;

    //COUNTERCLOCKWISE
  } else {
    reverse.animate([
      { transform: 'rotate(0deg) scaleX(-1) scale(1.25)' },
      { transform: 'rotate(-270deg) scaleX(-1) scale(1.25)' }
    ], {
      duration: 3000,
      iterations: 1
    })
    directionOfPlay = !directionOfPlay;
  }
  setTimeout(() => {
    reverse.style.opacity = 0;
    reverseContainer.style.animationName = "";
  }, "1000")
  setTimeout(() => {
    reverse.style.visibility = "hidden"
    reverseContainer.style.zIndex = "-4";
    reverse.style.opacity = 1;
  }, "2950")
  reverse.opacity = 1;
}

/**
 * Displays and animates the skip symbol
 */
function animateSkip() {
  let skip = document.getElementById("skip");
  let skipContainer = document.getElementById("skipContainer");
  skip.style.visibility = "visible"
  skipContainer.style.animationName = "bounce";
  skipContainer.style.zIndex = "4";
  setTimeout(() => {
    skip.style.opacity = 0;
    skipContainer.style.animationName = "";
  }, "1000");
  setTimeout(() => {
    skip.style.visibility = "hidden"
    skipContainer.style.zIndex = "-4";
    skip.style.opacity = 1;
  }, "1950");
}

/**
 * Displays and animates the draw four symbol
 */
function animateDrawFour() {
  let drawFour = document.getElementById("plusFour");
  let drawFourContainer = document.getElementById("plusFourContainer");
  drawFour.style.visibility = "visible"
  drawFourContainer.style.animationName = "bounce";
  drawFourContainer.style.zIndex = "4";
  setTimeout(() => {
    drawFour.style.opacity = 0;
    drawFourContainer.style.animationName = "";
  }, "1000");
  setTimeout(() => {
    drawFour.style.visibility = "hidden"
    drawFourContainer.style.zIndex = "-4";
    drawFour.style.opacity = 1;
  }, "1950"); drawFour

}

/**
 * Displays and animates the draw two symbol
 */
function animateDrawTwo() {
  let drawTwo = document.getElementById("plusTwo");
  let drawTwoContainer = document.getElementById("plusTwoContainer");
  drawTwo.style.visibility = "visible"
  drawTwoContainer.style.animationName = "bounce";
  drawTwoContainer.style.zIndex = "4";
  setTimeout(() => {
    drawTwo.style.opacity = 0;
    drawTwoContainer.style.animationName = "";
  }, "1000");
  setTimeout(() => {
    drawTwo.style.visibility = "hidden"
    drawTwoContainer.style.zIndex = "-4";
    drawTwo.style.opacity = 1;
  }, "1950");

}

//Button on end game screen return to lobby
const returnLobby = document.querySelectorAll('.lobby-button');
returnLobby.forEach((el) =>
  el.addEventListener('click', (event) => {
    window.location.href = '/lobby';
  })
);

// Display current color of discard pile
function discardColor(discardPile, gameState) {
  let currentColor = discardPile[0].color;
  const wildcardColor = gameState.chosen_wildcard_color;

  if (wildcardColor != null) {
    currentColor = wildcardColor;
  }
  if (currentColor === 'YELLOW') {
    colorIndicator.style.borderWidth = '25px 0 25px 40px';
    colorIndicator.style.borderColor =
      'transparent transparent transparent #fbb300';
  }
  if (currentColor === 'RED') {
    colorIndicator.style.borderWidth = '25px 0 25px 40px';
    colorIndicator.style.borderColor =
      'transparent transparent transparent #d53e33';
  }
  if (currentColor === 'GREEN') {
    colorIndicator.style.borderWidth = '25px 0 25px 40px';
    colorIndicator.style.borderColor =
      'transparent transparent transparent #399953';
  }
  if (currentColor === 'BLUE') {
    colorIndicator.style.borderWidth = '25px 0 25px 40px';
    colorIndicator.style.borderColor =
      'transparent transparent transparent #377af5';
  }
}

function eventAlert(discardPile) {
  const eventAction = discardPile[0].value;
  console.log(eventAction);


  alertIndicator.style.display = "block";
  alertIndicator.style.textAlign = "center";
  alertIndicator.style.width = alertIndicator.innerText.width + "px";

  if(eventAction === "WILD_CARD" || eventAction === "DRAW_FOUR"){
    alertIndicator.innerText = "COLOR CHANGE";
    setTimeout(function() {
    }, 500);
    setTimeout(function() {
      alertIndicator.style.display = "none";
    }, 1000);
  } else if(eventAction === "REVERSE"){
    alertIndicator.innerText = "REVERSE";
    setTimeout(function() {
    }, 500);
    setTimeout(function() {
      alertIndicator.style.display = "none";
    }, 1000);
  } else if(eventAction === "SKIP"){
    alertIndicator.innerText = "TURN SKIPPED";
    setTimeout(function() {
    }, 500);
    setTimeout(function() {
      alertIndicator.style.display = "none";
    }, 1000);
  } else {
    alertIndicator.innerText = "";
  }

  

}

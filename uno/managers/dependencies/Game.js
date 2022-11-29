const pgp = require("pg-promise");
const db = require("../../db");
const ApiClientError = require("../../errors/ApiClientError");

class Game {
  constructor(id) {
    this.id = id;
    this.connectedSockets = {};
    this.deleted = false;
  }

  async connect(socket) {
    this.connectedSockets[socket.id] = socket;
    socket.on("disconnect", (reason) => {
      delete this.connectedSockets[socket.id];
      this.emitGameEvent({ type: "USER_DISCONNECTED", user_id: socket.request.session.passport.user.user_id, username: socket.request.session.passport.user.username });
      console.log(`[Game ${this.id}] Removed socket ID ${socket.id} (${reason}). # of connected sockets: ${Object.keys(this.connectedSockets).length}`);
    });
    console.log(`[Game ${this.id}] Added socket ID ${socket.id}, established by user ${socket.request.session.passport.user.username}. # of connected sockets: ${Object.keys(this.connectedSockets).length}`);

    socket.emit("game_state", await this.getGameStateForUser(socket.request.session.passport.user.user_id));

    this.emitGameEvent({ type: "USER_CONNECTED", user_id: socket.request.session.passport.user.user_id, username: socket.request.session.passport.user.username });
  }

  /**
   * Returns a dictionary of sanitized game states for all connected users/sockets.
   * Should be used when emitting game state to all connected users (eg. after a card is played) instead of ```getGameStateForUser``` to minimize DB queries.
   */
  async getGameStatesForConnectedUsers() {
    const connectedUserIds = Array.from(new Set(Object.values(this.connectedSockets).map(socket => {
      return socket.request.session.passport.user.user_id;
    })));
    const gameState = await this.getGameState();
    const sanitizedUserGameStates = {};
    for (const connectedUserId of connectedUserIds) {
      sanitizedUserGameStates[connectedUserId] = await this.sanitizeGameStateForUser(gameState, connectedUserId);
    }
    return sanitizedUserGameStates;
  }

  /**
   * Emits sanitized game state to all connected users/sockets.
   */
  async emitGameStateToConnectedUsers() {
    const gameStatesToEmit = await this.getGameStatesForConnectedUsers();
    for (const socketId in this.connectedSockets) {
      const socket = this.connectedSockets[socketId];
      socket.emit("game_state", gameStatesToEmit[socket.request.session.passport.user.user_id]);
    }
  }

  /**
   * Returns the sanitized game state (cards that the user shouldn't see are hideen) for a user.
   * This should only be used when emitting game state to a single user (only occurs during initial socket connection).
   */
  async getGameStateForUser(userId) {
    return await this.sanitizeGameStateForUser(await this.getGameState(), userId);
  }

  /**
   * Given a game state and user:
   * Returns a game state where cards that the given user should not be able to see (other player's cards, the deck, etc.) are hidden.
   */
  sanitizeGameStateForUser(gameState, userId) {
    const {
      cards,
      ...restOfGameState
    } = gameState;
    const largestOrderInDiscardPile = cards
      .filter(card => card.location === "DISCARD")
      .reduce((largestOrder, currentCard) => {
        if (!largestOrder || currentCard.order > largestOrder) {
          return currentCard.order;
        } else {
          return largestOrder;
        }
      }, null);
    const sanitizedGameState = {
      cards: cards.map(card => {
        // The user can only see their own cards, and the top card of the discard pile.
        if (card.user_id === userId) {
          return card;
        }
        if (card.location === "DISCARD" && card.order === largestOrderInDiscardPile) {
          return card;
        }
        // Otherwise, the card's card_id (color and value can be determined from card_id), color, and value should be hidden to the user.
        const {
          card_id,
          color,
          value,
          ...restOfCard
        } = card;
        return restOfCard;
      }),
      ...restOfGameState
    };
    return sanitizedGameState;
  }

  /**
   * Retrieves and returns the current game state from DB.
   * The returned game state is unsanitized (all card colors and values are visible).
   */
  async getGameState() {
    return await db.tx(async t => {
      // Retrieve game data from DB
      const game = await this.getGame(t);
      const gameUsers = await this.getGameUsers(t);
      const gameCards = await this.getGameCards(t);

      // Construct game state from retrieved data
      const gameState = {
        started: game.started,
        ended: game.ended,
        users: gameUsers,
        cards: gameCards,
      };

      return gameState;
    });
  }

  async getGame(transaction) {
    const game = await (transaction ?? db).one("SELECT started, ended FROM games WHERE game_id = $1", [
      this.id,
    ]);
    return game;
  }

  async getGameUsers(transaction) {
    const gameUsers = await (transaction ?? db).manyOrNone(`
      SELECT user_id, username, play_order, state, is_host
        FROM game_users
        INNER JOIN users USING(user_id)
        WHERE game_id = $1`, [
      this.id,
    ]);
    return gameUsers;
  }

  async getGameCards(transaction) {
    const gameCards = await (transaction ?? db).manyOrNone(`
      SELECT card_id, color, \"value\", location, \"order\", user_id
        FROM game_cards
        INNER JOIN cards USING(card_id)
        WHERE game_id = $1`, [
      this.id,
    ]);
    return gameCards;
  }

  async getDeckCards(transaction) {
    const deckCards = await (transaction ?? db).manyOrNone(`
      SELECT card_id, color, \"value\", location, \"order\", user_id
        FROM game_cards
        INNER JOIN cards USING(card_id)
        WHERE game_id = $1 AND location = 'DECK'`, [
      this.id,
    ]);
    return deckCards;
  }

  async getUserHandCards(userId, transaction) {
    const deckCards = await (transaction ?? db).manyOrNone(`
      SELECT card_id, color, \"value\", location, \"order\", user_id
        FROM game_cards
        INNER JOIN cards USING(card_id)
        WHERE game_id = $1 AND user_id = $2 AND location = 'HAND'`, [
      this.id,
      userId,
    ]);
    return deckCards;
  }

  async isGameInProgress(transaction) {
    const game = await this.getGame(transaction);
    return game.started && !game.ended;
  }

  async shuffleDeck(transaction) {
    // Check that game is in progress
    if (!(await this.isGameInProgress(transaction))) {
      throw new ApiClientError("Game has not started or is ended.");
    }
    const deckCards = await this.getDeckCards(transaction);
    // Generate an array of consecutive numbers 0 ... deckCards.length
    const newCardOrders = [...Array(deckCards.length).keys()];
    // Durstenfeld shuffle in-place
    for (let i = newCardOrders.length - 1; i > 0; i--) {
      const rand = Math.floor(Math.random() * (i + 1));
      [newCardOrders[i], newCardOrders[rand]] = [newCardOrders[rand], newCardOrders[i]];
    }
    // Update cards in DB
    await (transaction ?? db).none(`
        UPDATE game_cards
          SET "order" = temp."order"
          FROM (VALUES $2:raw) AS temp(card_id, "order")
          WHERE game_id = $1 AND game_cards.card_id = temp.card_id`, [
      this.id,
      require("pg-promise")().helpers.values(newCardOrders.map((newCardOrder, i) => {
        return {
          card_id: deckCards[i].card_id,
          order: newCardOrder,
        };
      }), ["card_id", "order"]),
    ]);
    this.emitGameEvent({ type: "DECK_SHUFFLED" });
  }

  async mergeDiscardIntoDeckIfDeckEmpty(transaction) {
    // Check that game is in progress
    if (!(await this.isGameInProgress(transaction))) {
      throw new ApiClientError("Game has not started or is ended.");
    }
    // If deck is empty
    if (await (transaction ?? db).one(`SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND location = 'DECK'`, [this.id]) === 0) {
      // Merge discard into deck
      await (transaction ?? db).none(`UPDATE game_cards SET location = 'DECK' WHERE game_id = $1 AND location = 'DISCARD'`, [this.id]);
      // Shuffle deck
      await this.shuffleDeck(transaction);
    }
  }

  async dealCard(userId, transaction) {
    const deal = async t => {
      // Check that game is in progress
      if (!(await this.isGameInProgress(t))) {
        throw new ApiClientError("Game has not started or is ended.");
      }
      // Replenish deck if needed and deal card
      await this.mergeDiscardIntoDeckIfDeckEmpty(t);
      await t.none(`
        UPDATE game_cards
          SET
            location = 'HAND',
            user_id = $2,
            "order" = 1 + COALESCE(
              (SELECT MAX("order") FROM game_cards WHERE game_id = $1 AND user_id = $2 AND location = 'HAND'), -1
            )
          WHERE
            game_id = $1 AND
            location = 'DECK' AND
            "order" = (
              SELECT MAX("order") FROM game_cards WHERE game_id = $1 AND location = 'DECK'
            )`, [
        this.id,
        userId,
      ]);
    };
    if (!transaction) {
      await db.tx(async t => {
        await deal(t);
      });
    } else {
      await deal(transaction);
    }
    this.emitGameEvent({ type: "DEALT_CARD", user_id: userId });
  }

  async startGame(requestingUserId) {
    await db.tx(async t => {
      // Check that game is not already started
      const game = await this.getGame(t);
      if (game.started) {
        throw new ApiClientError("The game has already started.");
      }
      // Check that requesting user is host
      const gameUsers = await this.getGameUsers(t);
      const host = gameUsers.find(user => user.is_host);
      if (requestingUserId !== host.user_id) {
        throw new ApiClientError("Only the game host may start the game.");
      }
      // Check that there are at least 2 players
      if (gameUsers.length < 2) {
        throw new ApiClientError("At least 2 players are required to start the game.");
      }
      // Start game
      await t.none(`UPDATE games SET started = TRUE WHERE game_id = $1`, [
        this.id,
      ]);
      await this.shuffleDeck(t);
      await Promise.all(gameUsers.flatMap(user => {
        return new Array(7).fill().map(_ => {
          return this.dealCard(user.user_id, t);
        });
      }));
      // Assign random starting order for users
      const randomOrder = Math.floor(Math.random() * gameUsers.length);
      for (let i = 0; i < gameUsers.length; i++) {
        gameUsers[i].play_order = (randomOrder + i) % gameUsers.length;
      }
      await Promise.all(gameUsers.map(gameUser => {
        return t.none(`UPDATE game_users SET play_order = $3 WHERE game_id = $1 AND user_id = $2`, [
          this.id,
          gameUser.user_id,
          gameUser.play_order,
        ]);
      }));
    });
    this.emitGameEvent({ type: "GAME_STARTED" });
    this.emitGameStateToConnectedUsers();
  }

  async addPlayer(userId) {
    await db.tx(async t => {
      // Check that game is not already started
      const game = await this.getGame(t);
      if (game.started) {
        throw new ApiClientError("The game has already started.");
      }
      // Check that the user isn't already in game
      const gameUsers = await this.getGameUsers(t);
      const existingUser = gameUsers.find(user => user.user_id === userId);
      if (existingUser) {
        throw new ApiClientError("You have already joined the game.");
      }
      // Check that player limit will not be exceeded
      if (gameUsers.length + 1 > 4) {
        throw new ApiClientError("The game is full.");
      }
      // Add player to game
      await t.none(`INSERT INTO game_users(game_id, user_id, play_order, state, is_host) VALUES ($1, $2, -1, 'PLAYING', FALSE)`, [
        this.id,
        userId,
      ]);
    });
    this.emitGameEvent({ type: "PLAYER_JOINED", user_id: userId });
    this.emitGameStateToConnectedUsers();
  }

  async removePlayer(userId) {
    await db.tx(async t => {
      // Check that the user is in game
      const gameUsers = await this.getGameUsers(t);
      const existingUser = gameUsers.find(user => user.user_id === userId);
      if (!existingUser) {
        throw new ApiClientError("You are not in this game.");
      }
      // Remove player from game
      if (await this.isGameInProgress()) {
        // If game is in progress, the user forfeits
        await t.none(`UPDATE game_users SET state = 'LOST' WHERE game_id = $1 AND user_id = $2`, [
          this.id,
          userId,
        ]);
        this.emitGameEvent({ type: "PLAYER_FORFEIT", user_id: userId });
        // TODO: Re-build play order
        // TODO: Migrate host
        // TODO: Discard player's cards
      } else {
        // If game has not started, the user is removed
        await t.none(`DELETE FROM game_users WHERE game_id = $1 AND user_id = $2`, [
          this.id,
          userId,
        ]);
        // Delete game if no players remain
        if ((await this.getGameUsers(t)).length <= 0) {
          await this.deleteGame(t);
        }
      }
    });
    this.emitGameEvent({ type: "PLAYER_LEFT", user_id: userId });
    this.emitGameStateToConnectedUsers();
  }

  async deleteGame(transaction) {
    const dg = async t => {
      await t.none(`DELETE FROM game_cards WHERE game_id = $1`, [
        this.id,
      ]);
      await t.none(`DELETE FROM game_users WHERE game_id = $1`, [
        this.id,
      ]);
      await t.none(`DELETE FROM games WHERE game_id = $1`, [
        this.id,
      ]);
    };
    if (!transaction) {
      await db.tx(async t => {
        await dg(t);
      });
    } else {
      await dg(transaction);
    }
    this.emitGameEvent({ type: "GAME_DELETED" });
    this.disconnectSockets();
    this.deleted = true;
  }

  /**
   * Emits a chat message event to all connected sockets.
   */
  emitChatMessage(username, message) {
    for (const socketId in this.connectedSockets) {
      this.connectedSockets[socketId].emit("chat_message", { username: username, message: message });
    }
  }

  /**
   * Types:
   * ------------
   * USER_CONNECTED - User connected (not necessarily a player, may be a spectator).
   *    Additional keys: user_id, username
   * 
   * USER_DISCONNECTED - User disconnected (not necessarily a player, may be a spectator).
   *    Additional keys: user_id, username
   * 
   * PLAYER_JOINED - Player joined the game.
   *    Additional keys: user_id
   * 
   * PLAYER_LEFT - Player left the game.
   *    Additional keys: user_id
   * 
   * PLAYER_FORFEIT - Player forfeited the game.
   *    Additional keys: user_id
   * 
   * DECK_SHUFFLED - The deck was shuffled.
   * 
   * DEALT_CARD - A card was dealt to a player.
   *    Additional keys: user_id
   * 
   * GAME_DELETED - All players left before game started.
   * 
   * GAME_STARTED - Game has been started by the host.
   */
  emitGameEvent(event) {
    for (const socketId in this.connectedSockets) {
      this.connectedSockets[socketId].emit("game_event", event);
    }
  }

  disconnectSockets() {
    for (const socketId in this.connectedSockets) {
      this.connectedSockets[socketId].disconnect();
    }
  }
}

module.exports = Game;
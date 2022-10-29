const pgp = require("pg-promise");
const db = require("../db");
const PasswordHasher = require("../api/PasswordHasher");
const ApiClientError = require("../errors/ApiClientError");

class UserManager {
  async createUser(username, password, email) {
    try {
      const getUserByUsername = new pgp.PreparedStatement({
        name: "get-user-by-username",
        text: "SELECT * FROM users WHERE username = $1",
      });
      const existingUser = await db.oneOrNone(getUserByUsername, [username]);
      if (existingUser) {
        throw new ApiClientError(`A user with username "${username}" already exists.`);
      }
  
      // Create user and user options in transaction
      const hashedPassword = await PasswordHasher.hash(password);
      await db.tx(async t => {
        const createUser = new pgp.PreparedStatement({
          name: "create-user",
          text: "INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING user_id",
        });
        const newUser = await t.one(createUser, [
          username,
          hashedPassword,
          email,
        ]);
        const createUserOptions = new pgp.PreparedStatement({
          name: "create-user-options",
          text: "INSERT INTO user_options (user_id, music_enabled) VALUES ($1, TRUE)",
        });
        return t.none(createUserOptions, [newUser.user_id]);
      });
    } catch(e) {
      throw e;
    }
  }

  async getUserById(id) {
    try {
      const getUserAndOptionsByUserId = new pgp.PreparedStatement({
        name: "get-user-and-options-by-user-id",
        text: "SELECT user_id, email, music_enabled FROM users INNER JOIN user_options USING(user_id) WHERE user_id = $1",
      });
      const user = await db.oneOrNone(getUserAndOptionsByUserId, [id]);
      if (!user) {
        return null;
      }
      return user;
    } catch(e) {
      throw e;
    }
  }
}

module.exports = new UserManager();
const express = require("express");
const router = express.Router();
const UserManager = require("../managers/UserManager");
const ApiClientError = require("../errors/ApiClientError");
const ApiNotFoundError = require("../errors/ApiNotFoundError");
const ApiUnauthorizedError = require("../errors/ApiUnauthorizedError");
const passport = require("../middleware/passport");

/**
 * GET /api/users/current
 * Retrieve currently logged in user.
 */
router.get("/current", passport.session(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiUnauthorizedError("Not logged in.");
    }
    return res.status(200).json({
      user: req.user,
    });
  } catch(e) {
    next(e);
  }
});

/**
 * GET /api/users/:userId
 * Retrieve user by user ID.
 */
router.get("/:userId", async (req, res, next) => {
  try {
    const {
      userId,
    } = req.params;

    // Verify request parameters
    if (isNaN(userId)) {
      throw new ApiClientError(`'${userId}' is not a valid user ID.`);
    }

    // Fetch user
    const user = await UserManager.getUserById(userId);
    if (!user) {
      throw new ApiNotFoundError(`A user with id "${userId}" does not exist.`);
    }

    return res.status(200).json({
      user: user,
    });
  } catch(e) {
    next(e);
  }
});

/**
 * POST /api/users
 * Create (register) a user with given username, password, and email.
 *
 * Request body must be a JSON object containing the keys "username", "password", and "email".
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      username,
      password,
      email,
      ...rest
    } = req.body;
  
    // Verify request body has all required properties and has correct format
    const restKeys = Object.keys(rest);
    if (restKeys.length > 0) {
      throw new ApiClientError(`"${restKeys[0]}" is not a valid option.`);
    }
    if (!username) {
      throw new ApiClientError(`"username" is required.`);
    }
    if (username.length < 6 || username.length > 32) {
      throw new ApiClientError(`"username" must be between 6 and 32 characters.`);
    }
    if (!password) {
      throw new ApiClientError(`"password" is required.`);
    }
    if (!email) {
      throw new ApiClientError(`"email" is required.`);
    }
    if (!/^[^@]+@[^@]+$/.test(email)) {
      throw new ApiClientError(`"email" must be an email address.`);
    }

    // Create user
    await UserManager.createUser(username, password, email);

    return res.status(201).send();
  } catch(e) {
    next(e);
  }
});

module.exports = router;
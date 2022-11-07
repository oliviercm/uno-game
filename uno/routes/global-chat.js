const express = require("express");
const router = express.Router();
const passport = require("../middleware/passport");
const Joi = require("joi");
const GlobalChatManager = require("../managers/GlobalChatManager");
const ApiUnauthorizedError = require("../errors/ApiUnauthorizedError");

/**
 * POST /api/global-chat
 * 
 * Request body must be a JSON object containing the keys "message".
 */
router.post("/", passport.session(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiUnauthorizedError("Not logged in.");
    }

    const MAX_MESSAGE_LENGTH = 512;
    const schema = Joi.object({
      message: Joi.string().max(MAX_MESSAGE_LENGTH).required(),
    });
    const validated = await schema.validateAsync(req.body);

    const username = req.user.username;
    const message = validated.message;
    GlobalChatManager.sendMessage(username, message);
    return res.status(200).send();
  } catch(e) {
    next(e);
  }
});

module.exports = router;
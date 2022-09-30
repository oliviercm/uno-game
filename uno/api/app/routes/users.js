const express = require("express");
const router = express.Router({ mergeParams: true });

router.get("/", async (req, res, next) => {
    try {
        res.status(200).json({
            user: {
                username: "Hello world!",
            },
        });
        next();
    } catch(e) {
        next(e);
    };
});

module.exports = router;
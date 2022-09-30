/**
 * Main application initialization.
 */

const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

// Set app dependencies
app.set("logger", require("../interfaces/logger").logger);

// Parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use("/users", require("./routes/users"));

// 404 route (should come after all other routes)
app.get("*", (req, res, next) => {
    if (!res.headersSent) {
        res.sendStatus(404);
    };
    next();
});

// Handle errors and log all requests
app.use(require("./middleware/error_handler"));
app.use(require("./middleware/log_request")); // The request logging middleware comes after the error handler because the error handler may change the response status code.

// Listen for requests
app.listen(port, () => {
    app.get("logger").info(`Server listening on port ${port}.`);
});

module.exports = {
    app,
};
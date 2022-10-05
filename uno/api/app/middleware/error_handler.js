/**
 * This middleware is intended to be the sole error-handling middleware.
 * All API errors should eventually reach here and be logged and handled.
 * Note that in order to prevent revealing application information, error/debug/stack information should not be sent in the response!
 */

module.exports = function(err, req, res, next) {
    req.app.get("logger").error(err);

    if (res.headersSent) {
        return next();
    };

    switch (true) {
        default: {
            res.sendStatus(500);
            break;
        };
    };

    next();
};
/**
 * This middleware logs requests made to the API.
 */

module.exports = function(req, res, next) {
    req.app.get("logger").http(`[${res.statusCode}] ${req.method} ${req.originalUrl}`);
    next();
};
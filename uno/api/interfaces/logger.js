/**
 * Logger interface for use across the entire application.
 */

const logger = {
    error: console.error,
    warn: console.log,
    info: console.log,
    http: console.log,
    verbose: console.log,
    debug: console.debug,
    silly: console.debug,
};

module.exports = {
    logger,
};
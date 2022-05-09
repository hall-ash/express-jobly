"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization; // get JWT from req header
  
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim(); // remove 'B/bearer' and whitespace
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) { // if no token or invalid token, go to next handler
    return next(); // don't return error
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to ensure that access to a user's account
 * for reading, updating, or deleting is only availble
 * to that user or an admin.
 * 
 * Raises 401 Unauthorized, otherwise.
 */
function ensureAuthUserOrAdmin(req, res, next) {
  try {
    const { username } = req.params;
    const { user } = res.locals;
    if (user && (user.username === username || user.isAdmin)) {
      return next();
    }
    throw new UnauthorizedError();

  } catch (err) {
    return next(err);
  }
}


/** Middleware to ensure that the user is an admin.
 * 
 * If not, raises 401 Unauthorized.
 */
const ensureAdmin = (req, res, next) => {
  try {
    const { user } = res.locals;
    if (user && user.isAdmin) {
      return next();
    }
    
    throw new UnauthorizedError();

  } catch (err) {
    return next(err);
  }
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureAuthUserOrAdmin,
};

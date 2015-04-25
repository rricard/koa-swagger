"use strict";

var debug = require("debug")("swagger:match");

/**
 * An error thrown when something didn't matched
 * @param message {string} What didn't matched ?
 * @param status {number} HTTP status override
 * @constructor
 */
function MatchingError(message, status) {
  this.name = "MatchingError";
  this.message = message || "";
  this.status = status || 404;
}
MatchingError.prototype = Error.prototype;
exports.MatchingError = MatchingError;

/**
 * Matches a registered path with its definitions and its catched params
 * @param router {routington} The registered router
 * @param path {string} The HTTP path
 * @return {{def: Path, param: object}} The matched path definition and the
 *   found params
 * @throws {MatchingError} A 404 error
 */
exports.path = function(router, path) {
  var match = router.match(path);
  if(!match) {
    throw new MatchingError(path + " not found");
  }
  return {
    def: match.node.def,
    param: match.param
  };
};

/**
 * Matches a registered method with it's definition
 * @param def {Path} The path definition to search in
 * @param method {string} The HTTP method
 * @returns {Operation} The method definition or null if it didn't matched
 */
exports.method = function(def, method) {
  var m = method.toLowerCase();
  if(!def || !def[m]) {
    throw new MatchingError(method + " unsupported", 405);
  }
  return def[m];
};

/**
 * Matches an attribute from a specific location from the context and retrieve
 * its value
 * @param name {string} The attribute's name
 * @param from {string} The location between "query", "header", "path",
 *   "formData" or "body".
 * @param context {Context} The koa context
 * @return {*} The matched value
 */
exports.fromContext = function(name, from, context) {
  switch(from) {
    case "query":
      return (context.query || {})[name];
    case "header":
      return (context.header || {})[name];
    case "body":
      return (context.body || context.request.body || {})[name];
    case "params":
      return (context.pathParam || {})[name];
    case "formData":
      // TODO
    default:
      throw new MatchingError("Unsupported parameter origin: " + from, 500);
  }
};

/**
 * Matches a return code with its corresponding definition
 * @param def {Responses} The responses definition
 * @param status {number} The status
 * @returns {Response}
 */
exports.status = function(def, status) {
  var cast = "" + status;
  if(!def[cast] && !def.default) {
    debug("Implementation Spec Violation: Unsupported response status");
    debug("Unexpected " + status);
    throw new MatchingError("Unmatching response format", 500);
  }
  return def[cast] || def.default;
};

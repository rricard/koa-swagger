"use strict";

var deref = require("json-schema-deref-sync");
var Jay = require("jayschema");

var check = require("./checkers.js");
var match = require("./matchers.js");
var genRouter = require("./gen-router.js");

/**
 * Creates the generator from the swagger router & validator
 * @param router {routington} A swagger definition
 * @param validator {function(object, Schema)} JSON-Schema validator function
 * @returns {function*} The created middleware
 */
function createMiddleware(router, validator) {
  /**
   * Checks request and response against a swagger spec
   * Uses the usual koa context attributes
   * Uses the koa-bodyparser context attribute
   * Sets a new context attribute: {object} parameter
   */
  return function* middleware(next) {
    // Routing matches
    try {
      var routeMatch = match.path(router, this.path);
    } catch(e) {
      // TODO: let an option before doing that, strict mode throws the error
      yield next;
      return false;
    }
    this.pathParam = routeMatch.param; // Add the path's params to the context
    var methodDef = match.method(routeMatch.def, this.method);


    // Parameters check & assign
    this.parameter = check.parameters(validator,
      methodDef.parameters || {}, this);

    // Let the implementation happen
    yield next;

    // Response check
    var statusDef = match.status(methodDef.responses || {}, this.status);
    check.sentHeaders(validator, statusDef.headers || {}, this.sentHeaders);
    if(statusDef.schema) {
      check.body(validator, statusDef.schema, yield this.body);
    }
  };
}

/**
 * Middleware factory function
 * Creates a new koa generator enforcing swagger api spec compliance
 * in a new context attribute: {object} parameter
 * @param def {Swagger} A swagger definition
 * @param options {{validator: function(object, Schema)}} Optional options dict.
 * @returns {function*} The created middleware
 */
module.exports = function koaSwaggerFactory(def, options) {
  var flatDef = deref(def);

  check.swaggerVersion(flatDef);

  var jay = new Jay();
  var validator = options && options.validator ?
    options.validator :
    jay.validate.bind(jay);
  var router = genRouter(flatDef);

  // Return the middleware
  return createMiddleware(router, validator);
};

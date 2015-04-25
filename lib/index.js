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
    var routeMatch = match.path(router, this.path);
    this.pathParam = routeMatch.param; // Add the path's params to the context
    var methodDef = match.method(routeMatch.def, this.method);

    // Parameters check & assign
    this.parameter = check.parameters(validator, methodDef.parameters || {});

    // Let the implementation happen
    yield next;

    // Check the returned codes
    var responses = methodDef.responses || {};
    if(!responses[this.status] && !responses.default) {
      return this.throw("Unexpected return code " + this.status);
    }
    var responseDef = responses[this.status] || responses.default;
    var body = yield this.body;

    // TODO: tail unknown attributes
    // Check the schema
    if(responseDef.schema) {
      var resSchemaErr = validator(body, responseDef.schema);
      if(resSchemaErr) {
        return this.throw("Unmatching response format");
      }
    }

    // Check headers
    var headerDefs = responseDef.headers || {};
    Object.keys(headerDefs).forEach(function eachHeader(header) {
      var schema = headerDefs[header];
      delete schema.description;
      var value = this.headerSent[header];
      var headerSentErr = validator(value, schema);
      if(headerSentErr) {
        return this.throw("Unmatching header format");
      }
    }.bind(this));
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

  var validator = options && options.validator ?
    options.validator :
    new Jay().validate;
  var router = genRouter(flatDef);

  // Return the middleware
  return createMiddleware(router, validator);
};

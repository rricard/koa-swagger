"use strict";

var debug = require("debug")("swagger:check");

var match = require("./matchers.js");

/**
 * An error thrown when validating parameters
 * @param message {string} What failed ?
 * @param status {number} HTTP status override
 * @constructor
 */
function ValidationError(message, status) {
  this.name = "ValidationError";
  this.message = message || "";
  this.status = status || 400;
}
ValidationError.prototype = Error.prototype;
exports.ValidationError = ValidationError;

/**
 * Defines if the spec version is supported by the middleware
 * @param def {Swagger} The swagger complete definition
 * @throws {ValidationError} If the version is not supported
 */
exports.swaggerVersion = function(def) {
  if(def.swagger !== "2.0") {
    throw new ValidationError("Swagger " + def.swagger +
      "is not supported by this middleware.");
  }
};

/**
 * Check if the context carries the parameter correctly
 * @param validator {function(object, Schema)} JSON-Schema validator function
 * @param def {Parameter} The parameter's definition
 * @param context {Context} A koa context
 * @return {*} The cleaned value
 * @throws {ValidationError} A possible validation error
 */
function checkParameter(validator, def, context) {
  var value = match.fromContext(def.name, def.in, context);

  // Check requirement
  if(def.required && !value) {
    throw new ValidationError(def.name + " is required");
  } else if(!value) {
    return def.default;
  }

  // Select the right schema according to the spec
  var schema;
  if(def.in === "body") {
    schema = def.schema;
    // TODO: clean and sanitize recursively
  } else {
    // TODO: coerce other types
    if(def.type === "integer") {
      value = parseInt(value);
    } else if(def.type === "number") {
      value = parseFloat(value);
    }
    schema = def;
  }

  var err = validator(value, schema);
  if(err.length > 0) {
    throw new ValidationError(def.name + " has an invalid format: " +
      JSON.stringify(err));
  }

  return value;
}
exports.parameter = checkParameter;

/**
 * Check if the context carries the parameters correctly
 * @param validator {function(object, Schema)} JSON-Schema validator function
 * @param defs {[Parameter]} The list of parameters definitions
 * @param context {Context} A koa context
 * @return {object} The checked parameters in a dict
 * @throws {ValidationError}
 */
exports.parameters = function(validator, defs, context) {
  var errorMessages = [];
  var parameterDict = {};
  defs.forEach(function eachDef(def) {
    try {
      parameterDict[def.name] = checkParameter(validator, def, context);
    } catch(e) {
      if(e.name !== "ValidationError") {
        throw e;
      }
      errorMessages.push(e.message);
    }
  });
  if(errorMessages.length > 0) {
    throw new ValidationError(errorMessages.join(", "));
  }
  return parameterDict;
};

/**
 * Checks the response's body and logs the exact violation in swagger:check
 * @param validator {function(object, Schema)} JSON-Schema validator function
 * @param schema {Schema} The JSON-schema to test the body against
 * @param body {*} The body to send back
 * @throws {ValidationError} When the body does not respect the schema
 */
exports.body = function(validator, schema, body) {
  // TODO: clean and sanitize recursively
  var err = validator(body, schema);
  if(err.length > 0) {
    debug("Implementation Spec Violation: Unmatching response format");
    debug(err);
    throw new ValidationError("Unmatching response format", 500);
  }
};

/**
 * Checks a sent header and logs the exact violation in swagger:check
 * @param validator {function(object, Schema)} JSON-Schema validator function
 * @param def {Header} The header definition
 * @param name {string} The header's name
 * @param value {*} The header value
 * @throws {ValidationError} When the header does not respect the schema
 */
function checkSentHeader(validator, def, name, value) {
  if(!value && def.default) {
    return def.def.default;
  }
  var err = validator(value, def.schema);
  if(err) {
    debug("Implementation Spec Violation: Unmatching sent header format: " +
      name);
    debug(err);
    throw new ValidationError("Unmatching response format", 500);
  }
}
exports.sentHeader = checkSentHeader;

/**
 *
 * @param validator {function(object, Schema)} JSON-Schema validator function
 * @param defs {Headers} The header's definitions
 * @param sentHeaders {object} The sent headers
 * @throws {ValidationError} When the headers does not respect the schema
 */
exports.sentHeaders = function(validator, defs, sentHeaders) {
  var errored = false;
  Object.keys(defs).forEach(function eachSentHeader(name) {
    try {
      checkSentHeader(validator, defs[name], name, sentHeaders[name]);
    } catch(e) {
      errored = true;
    }
  });
  if(errored) {
    throw new ValidationError("Unmatching response format", 500);
  }
};

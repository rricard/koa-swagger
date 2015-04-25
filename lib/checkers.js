"use strict";

var match = require("./matchers.js");

/**
 * An error thrown when validating parameters
 * @param message What failed ?
 * @constructor
 */
function ValidationError(message) {
  this.name = "ValidationError";
  this.message = (message || "");
  this.status = 400;
}
ValidationError.prototype = Error.prototype;
exports.ValidationError = ValidationError;

/**
 * Defines if the spec version is supported by the middleware
 * @param def {Swagger} The swagger complete definition
 * @return {boolean} If it's valid
 */
exports.swaggerVersion = function(def) {
  return def.swagger === "2.0";
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
    return undefined; // skip this one
  }

  // Select the right schema according to the spec
  var schema;
  if(def.in === "body") {
    schema = def.schema;
    // TODO: tail unknown attributes
  } else {
    schema = def;
  }

  if(validator(value, schema)) {
    throw new ValidationError(def.name + " has an invalid format");
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
      errorMessages.push(e.message);
    }
  });
  if(errorMessages.length > 0) {
    throw new ValidationError(errorMessages.join(", "));
  }
  return parameterDict;
};

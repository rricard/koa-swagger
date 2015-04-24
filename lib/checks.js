"use strict";

/**
 * Defines if the spec version is supported by the middleware
 * @param def {Swagger} The swagger complete definition
 * @return {boolean} If it's valid
 */
exports.swaggerVersion = function(def) {
  return def.swagger === "2.0";
};

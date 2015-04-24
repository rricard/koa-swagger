"use strict";

var routington = require("routington");

/**
 * Generates the checking router from the swagger def
 * @param def {Swagger} The swagger complete definition
 * @return {routington} A router
 */
module.exports = function genRouter(def) {
  var paths = def.paths;
  var base = def.basePath || "";

  var router = routington();
  Object.keys(paths).forEach(function eachRoute(route) {
    var node = router.define(base + route);
    node.methods = paths[route];
  });
  return router;
};

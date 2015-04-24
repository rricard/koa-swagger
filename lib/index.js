"use strict";

var deref = require("json-schema-deref-sync");
var routington = require("routington");

module.exports = function koaSwaggerFactory(swaggerDef, options) {
  // Default validator
  var validator;
  if(!options || !options.validator) {
    var JaySchema = require("jayschema");
    var jay = new JaySchema();
    validator = jay.validate;
  } else {
    validator = options.validator;
  }

  // Flatten the schema by resolving $ref values
  swaggerDef = deref(swaggerDef);

  // Check swagger version
  if(swaggerDef.swagger !== "2.0") {
    throw new Error("The swagger 2.0 spec is only supported");
  }

  var paths = swaggerDef.paths;
  var base = swaggerDef.basePath || "";

  // Construct the router
  var router = routington();
  Object.keys(paths).forEach(function eachRoute(route) {
    var node = router.define(base + route);
    node.methods = paths[route];
  });

  // Return the middleware
  return function* koaSwaggerMiddleware(next) {
    // Match a route
    var match = router.match(this.path);
    if(!match) {
      return this.throw(404);
    }
    // Resolve the method
    var methods = match.node.methods;
    var methodName = this.method.toLowerCase();
    if(!methods || !methods[methodName]) {
      return this.throw(405);
    }
    var definition = methods[methodName];

    // Check the parameters
    var parametersDefs = definition.parameters || [];
    parametersDefs.forEach(function eachParameterDef(def) {
      var location = def.in;
      delete def.in;
      var name = def.name;
      delete def.name;
      var required = def.required;
      delete def.required;
      delete def.description;
      // Get the parameter at the right place
      var param = null;
      switch(location) {
        case "query":
          param = this.query[name];
          break;
        case "header":
          param = this.header[name];
          break;
        case "formData":
          // TODO
          break;
        case "body":
          param = this.request.body[name];
          break;
        case "params":
          param = match.param[name];
          break;
      }
      // Check requirement
      if(required && !param) {
        return this.throw(name + " parameter required", 400);
      } else if(!param) {
        return true; // skip this one
      }
      // Select the right schema according to the spec
      var schema;
      if(def.in === "body") {
        schema = def.schema;
        // TODO: tail unknown attributes
      } else {
        schema = def;
      }
      // We have a schema to check
      var paramErr = validator(param, schema);
      if(paramErr) {
        return this.throw(name + " has an invalid format: " + paramErr, 400);
      }
      this.parameters[name] = param;
    }.bind(this));

    // If an error was thrown before this, stop the generator
    if(this.status >= 400) {
      return false;
    }

    // Let the implementation happen
    yield next;

    // Check the returned codes
    var responses = definition.responses || {};
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
};

"use strict";

var assert = require("assert");
var Jay = require("jayschema");

var check = require("../lib/checkers.js");

describe("check", function() {
  before(function* setValidator() {
    var jay = new Jay();
    this.validator = jay.validate.bind(jay);
  });

  describe(".swaggerVersion", function() {
    it("should accept 2.0", function*() {
      check.swaggerVersion({swagger: "2.0"});
    });

    it("should refuse anything else", function*() {
      assert.throws(function() {
        check.swaggerVersion({swagger: "1.0"});
        check.swaggerVersion({swagger: "3.0"});
        check.swaggerVersion({swagger: "2.1"});
      });
    });
  });

  describe(".parameter", function() {
    before(function* ctxSet() {
      this.ctx = {
        query: {
          thing: "hello"
        },
        header: {
          "x-test": "hello"
        },
        body: {
          myInt: 1,
          myList: [ { myStr: "hello", myDouble: 2.1 } ]
        },
        pathParam: {
          id: "hello"
        }
      };
    });

    it("should validate querystring-parameters", function*() {
      assert.equal("hello", check.parameter(this.validator, {
        name: "thing",
        in: "query",
        required: true,
        type: "string"
      }, this.ctx));

      assert.equal("default", check.parameter(this.validator, {
        name: "thingy",
        in: "query",
        default: "default"
      }, this.ctx));

      assert.equal("hello", check.parameter(this.validator, {
        name: "thing",
        in: "query",
        default: "default"
      }, this.ctx));

      assert.throws(function() {
        check.parameter(this.validator, {
          name: "thingy",
          in: "query",
          required: true
        }, this.ctx);
      });
    });

    it("should validate headers", function*() {
      assert.equal("hello", check.parameter(this.validator, {
        name: "x-test",
        in: "header",
        required: true,
        type: "string"
      }, this.ctx));

      assert.equal("default", check.parameter(this.validator, {
        name: "x-testy",
        in: "header",
        default: "default"
      }, this.ctx));

      assert.equal("hello", check.parameter(this.validator, {
        name: "x-test",
        in: "header",
        default: "default"
      }, this.ctx));

      assert.throws(function() {
        check.parameter(this.validator, {
          name: "x-testy",
          in: "header",
          required: true
        }, this.ctx);
      });
    });
    it("should validate body contents");
    it("should validate path-parameters");
    it("should validate form data"); // TODO
  });
});

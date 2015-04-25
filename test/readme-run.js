// We need to use evil in order to parse the js in the readme
// DON'T USE THAT THING ANYWHERE ELSE!
/*eslint-disable no-eval */
"use strict";

var fs = require("fs");
var path = require("path");
var request = require("supertest");
var Promise = require("bluebird");
Promise.promisifyAll(fs);
Promise.promisifyAll(request.Test.prototype);

describe("README's code example", function() {
  before(function* () {
    var readme = yield fs.readFileAsync(path.join(__dirname, "../README.md"),
      "utf8");
    var snippet = readme.match(/```js([\s\S]*?)```/)[1];
    this.app = eval(snippet.replace("koa-swagger", "../lib") + "app");
    this.request = request(this.app.listen());
    this.pt = "/api/hello/bob";
  });

  it("should 404 or 405 when accessing the wrong endpoint", function*() {
    yield Promise.all([
      this.request
        .get("/api/nope")
        .expect(404)
        .endAsync(),
      this.request
        .post("/api/hello/bob")
        .query({chk: true})
        .expect(405)
        .endAsync()
    ]);
  });

  it("should 400 when providing wrong parameters", function*() {
    yield this.request
      .get("/api/hello/bob")
      .query({chuk: true})
      .expect(400)
      .endAsync();
  });

  it("should 200 when providing the right parameters", function*() {
    yield Promise.all([
      this.request
        .get("/api/hello/bob")
        .query({punctuation: "!"})
        .expect(200)
        .expect(/Hello bob\!/)
        .endAsync(),
      this.request
        .get("/api/hello/bob")
        .query({punctuation: "."})
        .expect(200)
        .expect(/Hello bob\./)
        .endAsync()
    ]);
  });
});

# koa-swagger

[![Circle CI](https://circleci.com/gh/rricard/koa-swagger/tree/master.svg?style=svg)](https://circleci.com/gh/rricard/koa-swagger/tree/master)

request + response sanitation/validation against swagger specs

## Introduction

Creating APIs is often boring and repetitive because you need to ensure
that all the data flowing respects a certain format. Often we miss
something and a security flaw or a source of incoherence appears.

One solution is to test your API against a complete spec: either by testing
each combination of parameters & results by hand resulting in even more
boring tests than the actual implementation or by using a tool like
[swagger](http://swagger.io) to simplify checks. The second solution
is already a good step in the right direction.

But that's not enough!

If the spec can be used to check and sanitize requests and tail responses
to make them compliant with the spec, we can get rid of a lot of boilerplate
code. **koa-swagger** does that.

## Installation

```shell
$ npm install --save koa-swagger
```

## Dependencies

koa-swagger does not provide anything else than what he has been created for: 
check and sanitize. That's why you'll need to **provide other middleware** 
before injecting koa-swagger.

The choice of which middleware you put before is entirely up to you but all
you need should be [bodyparser](https://github.com/koajs/bodyparser) (it
depends on your API's needs actually):

```shell
$ npm install --save koa-bodyparser
```

You'll also need to implement the spec! For that, use what
you prefer, vanilla-koa or [route](https://github.com/koajs/route) for example:

```shell
$ npm install --save koa-route
```

Here's a one-liner:

```shell
$ npm i --save koa koa-bodyparser koa-swagger koa-route
```

## Usage

After that, it's really simple:

- Put your swagger spec in a JS object
- Add bodyparser as middleware
- Add koa-swagger as middleware
- Implement your routes

Here's an example:

```js
var SPEC = {
  swagger: "2.0",
  info: {
    title: "Hello API",
    version: "1.0.0"
  },
  basePath: "/api",
  paths: {
    "/hello/:name": {
      "get": {
        tags: [ "Hello" ],
        summary: "Says hello",
        parameters: [
          { name: "name",
            in: "path",
            type: "string",
            default: "World" },
          { name: "punctuation",
            in: "query",
            type: "string",
            required: true }
        ],
        responses: {
          "200": {
            description: "Everything went well :)",
            schema: { $ref: "#/definitions/Message" }
          },
          "400": {
            description: "Issue with the parameters"
          }
        }
      }
    }
  },
  definitions: {
    Message: {
      required: [ "message" ],
      properties: {
        message: {
          type: "string"
        }
      }
    }
  }
};

var app = require("koa")();
app.use(require("koa-bodyparser")());
app.use(require("koa-swagger")(SPEC));

var _ = require("koa-route");
app.use(_.get("/api/hello/:name", function* () {
  this.body = {
    message: "Hello " + this.parameter.name + this.parameter.punctuation
  };
}));
```

## Contributing

You have to write PRs if you want me to merge something into master.

I need to accept your feature or fix (not a problem usually!) although
the tests must pass (you should test new features) and the linter must pass too.

Here's a command to check everything at once (the CI will complain otherwise):

```shell
$ npm test && npm run lint && echo ok
```

If it outputs `ok`, that's usually a good sign!

## Author

[Robin Ricard](http://rricard.me)

## License

MIT

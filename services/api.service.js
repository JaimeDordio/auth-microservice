"use strict";

const _ = require("lodash");
const ApiGateway = require("moleculer-web");
const { UnAuthorizedError } = ApiGateway.Errors;

module.exports = {
  name: "api",
  mixins: [ApiGateway],

  settings: {
    port: process.env.PORT || 3000,

    routes: [
      {
        path: "/",
        authorization: true,
        autoAliases: true,
        cors: true,
        bodyParsers: {
          json: {
            strict: false,
          },
          urlencoded: {
            extended: false,
          },
        },
      },
    ],

    logLevel: "debug",
    logRequestParams: "info",
    // logResponseData: "info",

    onError(req, res, err) {
      res.setHeader("Content-type", "application/json");
      res.writeHead(err.code || 500);

      if (err.code == 422) {
        let allErrors = {};

        err.data.forEach((error) => {
          let field = error.field.split(".").pop();
          allErrors[field] = error.message;
        });

        res.end(JSON.stringify({ errors: allErrors }));
      } else {
        res.end(JSON.stringify(err, null, 2));
      }

      this.logResponse(req, res, err ? err.ctx : null);
    },
  },

  actions: {
    test: {
      auth: "required",
      rest: "GET /testing",
      async handler(ctx) {
        return "test";
      },
    },
  },

  methods: {
    async authorize(ctx, route, req) {
      let token;
      let user;

      if (req.headers.authorization) {
        let authType = req.headers.authorization.split(" ")[0];

        if (authType === "Token" || authType === "Bearer")
          token = req.headers.authorization.split(" ")[1];
      }

      if (token) {
        try {
          // Resolve JWT token
          user = await ctx.call("users.resolveToken", { token });

          if (user) {
            this.logger.info("User authenticated: ", user.username);

            ctx.meta.user = user;
            ctx.meta.token = token;
            ctx.meta.userID = user._id;
          }
        } catch (err) {
          this.logger.info("User not authenticated");
        }
      }

      if (req.$action.auth == "required" && !user)
        throw new UnAuthorizedError();
    },
  },
};

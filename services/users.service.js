"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const DbService = require("../mixins/db.mixin");

module.exports = {
  name: "users",
  mixins: [DbService("users")],

  settings: {
    rest: "/",

    // JWT secret
    JWT_SECRET: process.env.JWT_SECRET || "nebrija-2021",

    // User schema
    entityValidator: {
      username: { type: "string", min: 2 },
      password: { type: "string", min: 6 },
      email: { type: "email" },
      image: { type: "string", optional: true },
    },
  },

  actions: {
    /**
     * Create new user
     */
    signup: {
      rest: "POST /users",
      params: {
        user: { type: "object" },
      },
      async handler(ctx) {
        let user = ctx.params.user;
        await this.validateEntity(user);

        if (user.username) {
          const userExists = await this.adapter.findOne({
            username: user.username,
          });

          if (userExists)
            throw new MoleculerClientError(
              "Username already exists!",
              422,
              "",
              [{ field: "username", message: "already exist" }]
            );
        }

        if (user.email) {
          const userExists = await this.adapter.findOne({ email: user.email });

          if (userExists)
            throw new MoleculerClientError("Email already exists!", 422, "", [
              { field: "email", message: "already exist" },
            ]);
        }

        user.password = bcrypt.hashSync(user.password);
        user.createdAt = new Date();

        const insertedUser = await this.adapter.insert(user);
        const transformedUser = await this.transformUser(
          insertedUser,
          true,
          ctx.meta.token
        );

        return transformedUser;
      },
    },

    /**
     * Login with username & password
     */
    login: {
      rest: "POST /users/login",
      params: {
        user: {
          type: "object",
          props: {
            email: { type: "email" },
            password: { type: "string", min: 1 },
          },
        },
      },
      async handler(ctx) {
        const { email, password } = ctx.params.user;

        // Find user on DB
        const user = await this.adapter.findOne({ email });
        if (!user) {
          throw new MoleculerClientError(
            "Email or password invalid!",
            422,
            "",
            [{ field: "email", message: "is not found" }]
          );
        }

        // Check user password
        const res = await bcrypt.compare(password, user.password);
        if (!res)
          throw new MoleculerClientError("Wrong password!", 422, "", [
            { field: "password", message: "incorrect" },
          ]);

        const transformedUser = await this.transformUser(
          user,
          true,
          ctx.meta.token
        );

        return transformedUser;
      },
    },

    /**
     * Get user by JWT token (for API GW authentication)
     */
    resolveToken: {
      params: {
        token: "string",
      },
      async handler(ctx) {
        const decoded = await new Promise((resolve, reject) => {
          jwt.verify(
            ctx.params.token,
            this.settings.JWT_SECRET,
            (err, decoded) => {
              if (err) return reject(err);

              resolve(decoded);
            }
          );
        });

        if (decoded.id) return this.getById(decoded.id);
      },
    },

    /**
     * Get current user
     */
    profile: {
      auth: "required",
      rest: "GET /user",
      async handler(ctx) {
        const user = await this.getById(ctx.meta.user._id);
        if (!user) throw new MoleculerClientError("User not found", 400);

        return await this.transformUser(user, true, ctx.meta.token);
      },
    },

    /**
     * Update current user
     */
    updateProfile: {
      auth: "required",
      rest: "PUT /user",
      params: {
        user: {
          type: "object",
          props: {
            username: {
              type: "string",
              min: 2,
              optional: true,
            },
            password: { type: "string", min: 6, optional: true },
            email: { type: "email", optional: true },
            image: { type: "string", optional: true },
          },
        },
      },
      async handler(ctx) {
        const newUser = ctx.params.user;

        if (newUser.username) {
          const found = await this.adapter.findOne({
            username: newUser.username,
          });

          if (found && found._id.toString() !== ctx.meta.user._id.toString())
            throw new MoleculerClientError("Username already exists", 422, "", [
              { field: "username", message: "exists" },
            ]);
        }

        if (newUser.email) {
          const found = await this.adapter.findOne({ email: newUser.email });

          if (found && found._id.toString() !== ctx.meta.user._id.toString())
            throw new MoleculerClientError("Email already exists", 422, "", [
              { field: "email", message: "exists" },
            ]);
        }

        newUser.updatedAt = new Date();

        const updatedUser = await this.adapter.updateById(ctx.meta.user._id, {
          $set: newUser,
        });

        const transformedUser = await this.transformUser(
          updatedUser,
          true,
          ctx.meta.token
        );

        return transformedUser;
      },
    },

    list: {
      rest: "GET /users",
    },

    get: {
      rest: "GET /users/:id",
    },

    update: {
      rest: "PUT /users/:id",
    },

    remove: {
      rest: "DELETE /users/:id",
    },

    /**
     * Get a user by username
     */
    profile: {
      rest: "GET /profiles/:username",
      params: {
        username: { type: "string" },
      },
      async handler(ctx) {
        const user = await this.adapter.findOne({
          username: ctx.params.username,
        });

        if (!user) throw new MoleculerClientError("User not found", 404);

        return user;
      },
    },
  },

  /**
   * Methods
   */
  methods: {
    /**
     * Generate a JWT token from user
     */
    generateJWT(user) {
      return jwt.sign(
        {
          id: user._id,
          username: user.username,
        },
        this.settings.JWT_SECRET,
        { expiresIn: "1h" }
      );
    },

    /**
     * Transform user. Generate JWT token if neccessary.
     */
    transformUser(user, withToken, token) {
      if (user) {
        if (withToken) user.token = token || this.generateJWT(user);
      }

      return { user };
    },
  },
};

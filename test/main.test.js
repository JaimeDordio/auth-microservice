const { ServiceBroker } = require("moleculer");
const { MoleculerClientError } = require("moleculer").Errors;
const faker = require("faker");

const UsersSchema = require("../services/users.service.js");
const MailerSchema = require("../services/mailer.service.js");

const DEBUG = false;

/**
 * USERS SERVICE TESTS
 */
describe("Test 'users' actions", () => {
  const USER = {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
  };

  let broker = new ServiceBroker({ logger: false });
  broker.createService(UsersSchema);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  describe("Test 'signup' and 'login'", () => {
    DEBUG && console.log("[users] USER", USER);

    it("should register and login successfully", async () => {
      const signup_result = await broker.call("users.signup", {
        user: {
          email: USER.email,
          username: USER.username,
          password: USER.password,
        },
      });

      DEBUG && console.log("[users.auth] signup_result", signup_result);

      expect(signup_result).toBeTruthy();

      const login_result = await broker.call("users.login", {
        user: {
          email: USER.email,
          password: USER.password,
        },
      });

      DEBUG && console.log("[users.auth] login_result", login_result);

      expect(login_result).toBeTruthy();
    });
  });

  describe("Test JWT", () => {
    it("should return decoded user", async () => {
      const login_result = await broker.call("users.login", {
        user: {
          email: USER.email,
          password: USER.password,
        },
      });

      const resolve_token_result = await broker.call("users.resolveToken", {
        token: login_result.user.token,
      });

      DEBUG && console.log("resolve_token_result", resolve_token_result);

      expect(resolve_token_result).toBeTruthy();
    });
  });

  describe("Test 'profile' update", () => {
    it("should return updated user", async () => {
      const login_result = await broker.call("users.login", {
        user: {
          email: USER.email,
          password: USER.password,
        },
      });

      const update_user_result = await broker.call(
        "users.updateProfile",
        {
          user: {
            username: `${USER.password}-updated`,
          },
        },
        {
          meta: { user: { ...login_result.user } },
        }
      );

      DEBUG && console.log("update_ user_result", update_user_result);

      expect(update_user_result).toBeTruthy();
    });
  });

  describe("Test 'users.list' action", () => {
    it("should return all users", async () => {
      const result = await broker.call("users.list");

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Test get 'profile'", () => {
    it("should return user from ID", async () => {
      const login_result = await broker.call("users.login", {
        user: {
          email: USER.email,
          password: USER.password,
        },
      });

      const get_profile_result = await broker.call(`users.get`, {
        id: login_result.user._id,
      });

      DEBUG && console.log("get_profile_result", get_profile_result);

      expect(get_profile_result).toBeTruthy();
    });
  });

  describe("Test get 'profile' from username", () => {
    it("should return user", async () => {
      const login_result = await broker.call("users.login", {
        user: {
          email: USER.email,
          password: USER.password,
        },
      });

      const get_profile_result = await broker.call(`users.profile`, {
        username: login_result.user.username,
      });

      DEBUG && console.log("get_profile_result", get_profile_result);

      expect(get_profile_result).toBeTruthy();
    });
  });

  describe("Test delete 'profile'", () => {
    it("should delete user", async () => {
      const login_result = await broker.call("users.login", {
        user: {
          email: USER.email,
          password: USER.password,
        },
      });

      const delete_profile_result = await broker.call(`users.remove`, {
        id: login_result.user._id,
      });

      DEBUG && console.log("delete_profile_result", delete_profile_result);

      expect(delete_profile_result).toBeTruthy();
    });
  });
});

/**
 * MAILER SERVICE TESTS
 */
describe("Test 'mailer' actions", () => {
  let broker = new ServiceBroker({ logger: false });
  broker.createService(MailerSchema);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  describe("Test mail send", () => {
    it("should send email", async () => {
      const send_email_result = await broker.call(`mailer.send`, {
        recipient: "jaimedordio@gmail.com",
        subject: "Jest Testing",
        body: "Sent from Jest Test",
      });

      DEBUG && console.log("send_email_result", send_email_result);

      expect(send_email_result).toBeTruthy();
    });
  });
});

const { MoleculerError, MoleculerRetryableError } = require("moleculer").Errors;
const nodemailer = require("nodemailer");
require("dotenv").config();

module.exports = {
  name: "mailer",

  settings: {
    rest: "/",

    // Sender default e-mail address
    from: "jaimedordio@gmail.com",
  },

  actions: {
    send: {
      rest: "POST /mailer",
      params: {
        recipient: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      async handler(ctx) {
        const sent = await this.send(
          ctx.params.recipient,
          ctx.params.subject,
          ctx.params.body
        );

        return sent;
      },
    },
  },

  methods: {
    send(recipient, subject, body) {
      return new this.Promise((resolve, reject) => {
        this.logger.debug(
          `Sending email to ${recipient} with subject '${subject}'...`
        );

        if (this.transporter) {
          this.transporter.sendMail(
            {
              from: this.settings.from,
              to: recipient,
              subject,
              text: body,
            },
            (err, info) => {
              if (err) {
                this.logger.warn("Unable to send email: ", err);
                reject(
                  new MoleculerRetryableError(
                    "Unable to send email! " + err.message
                  )
                );
              } else {
                this.logger.info("Email message sent.", info);
                resolve(info);
              }
            }
          );
        } else
          return reject(
            new MoleculerError(
              "Unable to send email! Invalid transporter: " +
                JSON.stringify(this.transporter)
            )
          );
      });
    },
  },

  created() {
    nodemailer.createTestAccount((err, account) => {
      if (err) console.error("Error creating a test account: ", err.message);

      console.log("Ethereal account", account);

      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    });
  },
};

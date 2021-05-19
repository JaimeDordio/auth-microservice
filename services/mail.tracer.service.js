const { MoleculerClientError, MoleculerError, MoleculerRetryableError } =
  require("moleculer").Errors;
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");

module.exports = {
  name: "mailer",

  settings: {
    rest: "/",

    // Sender default e-mail address
    from: "jaimedordio@gmail.com",

    transport: {
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        api_key:
          "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",
      },
    },
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
              "Unable to send email! Invalid mailer transport: " +
                JSON.stringify(this.settings.transport)
            )
          );
      });
    },
  },

  created() {
    const { auth } = this.settings.transport;

    this.transporter = nodemailer.createTransport(
      sgTransport({
        auth,
      })
    );
  },
};

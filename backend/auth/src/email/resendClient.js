const { Resend } = require("resend");
const { config } = require("../config");

let resend = null;

if (config.EMAIL_ENABLED && config.RESEND_API_KEY) {
  resend = new Resend(config.RESEND_API_KEY);
}

module.exports = { resend };
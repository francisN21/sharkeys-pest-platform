const { resend } = require("./resendClient");
const { config } = require("../config");
const {
  buildWelcomeEmail,
  buildWelcomeVerificationEmail,
  buildPasswordResetEmail,
  buildEmployeeInviteEmail,
  buildBookingCreatedCustomerEmail,
  buildBookingCreatedOfficeEmail,
  buildBookingAssignedCustomerEmail,
  buildBookingCompletedCustomerEmail,
  buildLeadBookingInviteEmail,
} = require("./templates");

async function safeSendEmail({ to, subject, html, text, replyTo }) {
  try {
    if (!config.EMAIL_ENABLED) {
      return { ok: false, skipped: true, reason: "EMAIL_ENABLED is false" };
    }

    if (!resend) {
      return { ok: false, skipped: true, reason: "Resend is not configured" };
    }

    if (!config.EMAIL_FROM_BOOKINGS) {
      return { ok: false, skipped: true, reason: "EMAIL_FROM_BOOKINGS is missing" };
    }

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!recipients.length) {
      return { ok: false, skipped: true, reason: "No recipients" };
    }

    const result = await resend.emails.send({
      from: config.EMAIL_FROM_BOOKINGS,
      to: recipients,
      subject,
      html,
      text,
      reply_to: replyTo || undefined,
    });

    return { ok: true, result };
  } catch (error) {
    console.error("Email send failed:", {
      subject,
      to,
      error: error?.message || error,
    });
    return { ok: false, error };
  }
}

async function sendWelcomeEmail(payload) {
  const content = buildWelcomeEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendWelcomeVerificationEmail(payload) {
  const content = buildWelcomeVerificationEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendPasswordResetEmail(payload) {
  const content = buildPasswordResetEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendEmployeeInviteEmail(payload) {
  const content = buildEmployeeInviteEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendBookingCreatedCustomerEmail(payload) {
  const content = buildBookingCreatedCustomerEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendBookingCreatedOfficeEmail(payload) {
  const officeEmail = payload.to || config.EMAIL_TO_OFFICE;
  const content = buildBookingCreatedOfficeEmail(payload);
  return safeSendEmail({
    to: officeEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendBookingAssignedCustomerEmail(payload) {
  const content = buildBookingAssignedCustomerEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendBookingCompletedCustomerEmail(payload) {
  const content = buildBookingCompletedCustomerEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function sendLeadBookingInviteEmail(payload) {
  const content = buildLeadBookingInviteEmail(payload);
  return safeSendEmail({
    to: payload.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

module.exports = {
  safeSendEmail,
  sendWelcomeEmail,
  sendWelcomeVerificationEmail,
  sendPasswordResetEmail,
  sendEmployeeInviteEmail,
  sendBookingCreatedCustomerEmail,
  sendBookingCreatedOfficeEmail,
  sendBookingAssignedCustomerEmail,
  sendBookingCompletedCustomerEmail,
  sendLeadBookingInviteEmail,
};
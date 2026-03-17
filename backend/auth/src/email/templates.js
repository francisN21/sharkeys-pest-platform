function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "");
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(cents) {
  if (cents === null || cents === undefined || Number.isNaN(Number(cents))) return null;
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function wrapEmailHtml(title, bodyHtml) {
  return `
    <div style="background:#f8fafc;padding:24px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:#0f172a;color:#ffffff;">
          <h1 style="margin:0;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:24px;">
          ${bodyHtml}
        </div>
      </div>
    </div>
  `;
}

function lineItemHtml(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `
    <tr>
      <td style="padding:8px 0;font-weight:700;vertical-align:top;width:180px;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function lineItemText(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `${label}: ${value}`;
}

function buildWelcomeEmail(payload) {
  const firstName = payload.firstName || "there";
  const appBaseUrl = payload.appBaseUrl || "";

  return {
    subject: "Welcome to Sharky's Pest Control",
    html: wrapEmailHtml(
      "Welcome to Sharky's Pest Control",
      `
        <p style="margin-top:0;">Hi ${escapeHtml(firstName)},</p>
        <p>Welcome to Sharky's Pest Control. Your account has been created successfully.</p>
        ${
          appBaseUrl
            ? `<p>You can sign in here: <a href="${escapeHtml(appBaseUrl)}">${escapeHtml(appBaseUrl)}</a></p>`
            : ""
        }
        <p style="margin-bottom:0;">We’re glad to have you with us.</p>
      `
    ),
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to Sharky's Pest Control. Your account has been created successfully.",
      appBaseUrl ? `Sign in: ${appBaseUrl}` : "",
      "",
      "We’re glad to have you with us.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildWelcomeVerificationEmail(payload) {
  const firstName = payload.firstName || "there";
  const verifyUrl = payload.verifyUrl || "";
  const code = payload.code || "";

  return {
    subject: "Welcome to Sharky's Pest Control - Verify your email",
    html: wrapEmailHtml(
      "Verify Your Email",
      `
        <p style="margin-top:0;">Hi ${escapeHtml(firstName)},</p>
        <p>Welcome to Sharky's Pest Control. Your account has been created successfully.</p>
        <p>Please verify your email using the code below:</p>

        <div style="margin:20px 0;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-align:center;">
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;">
            ${escapeHtml(code)}
          </div>
        </div>

        ${
          verifyUrl
            ? `<p>You can also verify here: <a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>`
            : ""
        }

        <p>This code expires in 15 minutes.</p>
        <p style="margin-bottom:0;">We’re glad to have you with us.</p>
      `
    ),
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to Sharky's Pest Control. Your account has been created successfully.",
      "",
      `Verification code: ${code}`,
      verifyUrl ? `Verify here: ${verifyUrl}` : "",
      "",
      "This code expires in 15 minutes.",
      "",
      "We’re glad to have you with us.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildPasswordResetEmail(payload) {
  const firstName = payload.firstName || "there";
  const resetUrl = payload.resetUrl || "";

  return {
    subject: "Reset your password",
    html: wrapEmailHtml(
      "Reset Your Password",
      `
        <p style="margin-top:0;">Hi ${escapeHtml(firstName)},</p>
        <p>We received a request to reset your password.</p>
        ${
          resetUrl
            ? `<p>Use this link to reset it: <a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>`
            : ""
        }
        <p>This link expires in 1 hour.</p>
        <p style="margin-bottom:0;">If you did not request this, you can safely ignore this email.</p>
      `
    ),
    text: [
      `Hi ${firstName},`,
      "",
      "We received a request to reset your password.",
      resetUrl ? `Reset link: ${resetUrl}` : "",
      "",
      "This link expires in 1 hour.",
      "If you did not request this, you can safely ignore this email.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildBookingCreatedCustomerEmail(payload) {
  const customerName = payload.customerName || "there";
  const schedule =
    payload.startsAt && payload.endsAt
      ? `${formatDateTime(payload.startsAt)} to ${formatDateTime(payload.endsAt)}`
      : payload.startsAt
      ? formatDateTime(payload.startsAt)
      : "";

  return {
    subject: `Booking confirmation - ${payload.bookingPublicId}`,
    html: wrapEmailHtml(
      "Booking Confirmation",
      `
        <p style="margin-top:0;">Hi ${escapeHtml(customerName)},</p>
        <p>Your booking has been received successfully.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${lineItemHtml("Booking ID", payload.bookingPublicId)}
          ${lineItemHtml("Service", payload.serviceTitle)}
          ${lineItemHtml("Scheduled Time", schedule)}
          ${lineItemHtml("Address", payload.address)}
          ${lineItemHtml("Notes", payload.notes)}
        </table>
        <p>We’ll contact you if anything changes.</p>
      `
    ),
    text: [
      `Hi ${customerName},`,
      "",
      "Your booking has been received successfully.",
      lineItemText("Booking ID", payload.bookingPublicId),
      lineItemText("Service", payload.serviceTitle),
      lineItemText("Scheduled Time", schedule),
      lineItemText("Address", payload.address),
      lineItemText("Notes", payload.notes),
      "",
      "We’ll contact you if anything changes.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildBookingCreatedOfficeEmail(payload) {
  const schedule =
    payload.startsAt && payload.endsAt
      ? `${formatDateTime(payload.startsAt)} to ${formatDateTime(payload.endsAt)}`
      : payload.startsAt
      ? formatDateTime(payload.startsAt)
      : "";

  return {
    subject: `New booking received - ${payload.bookingPublicId}`,
    html: wrapEmailHtml(
      "New Booking Received",
      `
        <p style="margin-top:0;">A new booking has been created.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${lineItemHtml("Booking ID", payload.bookingPublicId)}
          ${lineItemHtml("Source", payload.source)}
          ${lineItemHtml("Customer", payload.customerName)}
          ${lineItemHtml("Email", payload.customerEmail)}
          ${lineItemHtml("Phone", payload.customerPhone)}
          ${lineItemHtml("Service", payload.serviceTitle)}
          ${lineItemHtml("Scheduled Time", schedule)}
          ${lineItemHtml("Address", payload.address)}
          ${lineItemHtml("Notes", payload.notes)}
        </table>
      `
    ),
    text: [
      "A new booking has been created.",
      "",
      lineItemText("Booking ID", payload.bookingPublicId),
      lineItemText("Source", payload.source),
      lineItemText("Customer", payload.customerName),
      lineItemText("Email", payload.customerEmail),
      lineItemText("Phone", payload.customerPhone),
      lineItemText("Service", payload.serviceTitle),
      lineItemText("Scheduled Time", schedule),
      lineItemText("Address", payload.address),
      lineItemText("Notes", payload.notes),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildBookingAssignedCustomerEmail(payload) {
  const customerName = payload.customerName || "there";
  const schedule =
    payload.startsAt && payload.endsAt
      ? `${formatDateTime(payload.startsAt)} to ${formatDateTime(payload.endsAt)}`
      : payload.startsAt
      ? formatDateTime(payload.startsAt)
      : "";

  return {
    subject: `Technician assigned - ${payload.bookingPublicId}`,
    html: wrapEmailHtml(
      "Technician Assigned",
      `
        <p style="margin-top:0;">Hi ${escapeHtml(customerName)},</p>
        <p>Your booking now has a technician assigned.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${lineItemHtml("Booking ID", payload.bookingPublicId)}
          ${lineItemHtml("Service", payload.serviceTitle)}
          ${lineItemHtml("Scheduled Time", schedule)}
          ${lineItemHtml("Address", payload.address)}
          ${lineItemHtml("Technician", payload.technicianName)}
          ${lineItemHtml("Technician Phone", payload.technicianPhone)}
        </table>
      `
    ),
    text: [
      `Hi ${customerName},`,
      "",
      "Your booking now has a technician assigned.",
      lineItemText("Booking ID", payload.bookingPublicId),
      lineItemText("Service", payload.serviceTitle),
      lineItemText("Scheduled Time", schedule),
      lineItemText("Address", payload.address),
      lineItemText("Technician", payload.technicianName),
      lineItemText("Technician Phone", payload.technicianPhone),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildBookingCompletedCustomerEmail(payload) {
  const customerName = payload.customerName || "there";
  const finalPrice = formatMoney(payload.finalPriceCents);
  const completedAt = payload.completedAt ? formatDateTime(payload.completedAt) : "";

  return {
    subject: `Booking completed - ${payload.bookingPublicId}`,
    html: wrapEmailHtml(
      "Booking Completed",
      `
        <p style="margin-top:0;">Hi ${escapeHtml(customerName)},</p>
        <p>Your service has been completed.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${lineItemHtml("Booking ID", payload.bookingPublicId)}
          ${lineItemHtml("Service", payload.serviceTitle)}
          ${lineItemHtml("Address", payload.address)}
          ${lineItemHtml("Technician", payload.technicianName)}
          ${lineItemHtml("Completed At", completedAt)}
          ${lineItemHtml("Final Price", finalPrice)}
        </table>
        <p style="margin-bottom:0;">Thank you for choosing Sharky's Pest Control.</p>
      `
    ),
    text: [
      `Hi ${customerName},`,
      "",
      "Your service has been completed.",
      lineItemText("Booking ID", payload.bookingPublicId),
      lineItemText("Service", payload.serviceTitle),
      lineItemText("Address", payload.address),
      lineItemText("Technician", payload.technicianName),
      lineItemText("Completed At", completedAt),
      lineItemText("Final Price", finalPrice),
      "",
      "Thank you for choosing Sharky's Pest Control.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

module.exports = {
  formatDateTime,
  formatMoney,
  buildWelcomeEmail,
  buildWelcomeVerificationEmail,
  buildPasswordResetEmail,
  buildBookingCreatedCustomerEmail,
  buildBookingCreatedOfficeEmail,
  buildBookingAssignedCustomerEmail,
  buildBookingCompletedCustomerEmail,
};
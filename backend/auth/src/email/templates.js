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
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
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

const BRAND = {
  logoUrl: "https://sharkyspestcontrolbayarea.com/main-logo.jpg",
  logoAlt: "Sharkys Pest Control",
  logoWidth: "160",
  companyName: "Sharkys Pest Control",
  phone: "(707) 361-5023",
  website: "https://sharkyspestcontrolbayarea.com",
  headerBg: "#0f172a",
  accentColor: "#0ea5e9",
  textColor: "#0f172a",
  mutedColor: "#64748b",
  borderColor: "#e2e8f0",
  cardBg: "#f8fafc",
};

function wrapEmailHtml(title, bodyHtml, ctaHtml = "") {
  return `
    <div style="background:#f1f5f9;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;color:${BRAND.textColor};">
      <div style="max-width:620px;margin:0 auto;">

        <!-- Header -->
        <div style="background:${BRAND.headerBg};border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
          <img
            src="${BRAND.logoUrl}"
            alt="${escapeHtml(BRAND.logoAlt)}"
            width="${BRAND.logoWidth}"
            style="display:block;margin:0 auto 16px;height:auto;"
          />
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">
            ${escapeHtml(title)}
          </h1>
        </div>

        <!-- Body -->
        <div style="background:#ffffff;padding:32px;border-left:1px solid ${BRAND.borderColor};border-right:1px solid ${BRAND.borderColor};">
          ${bodyHtml}
          ${ctaHtml}
        </div>

        <!-- Footer -->
        <div style="background:${BRAND.headerBg};border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">
            <a href="tel:${BRAND.phone.replace(/\D/g, "")}" style="color:#94a3b8;text-decoration:none;">${escapeHtml(BRAND.phone)}</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(BRAND.website)}" style="color:#94a3b8;text-decoration:none;">${escapeHtml(BRAND.website)}</a>
          </p>
          <p style="margin:0;font-size:12px;color:#475569;">
            © ${new Date().getFullYear()} ${escapeHtml(BRAND.companyName)}. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
}

function ctaButtonHtml(label, url) {
  if (!url) return "";
  return `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${escapeHtml(url)}"
         style="display:inline-block;background:${BRAND.accentColor};color:#ffffff;font-size:15px;font-weight:700;
                text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:0.2px;">
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function infoTableHtml(rows) {
  const rowsHtml = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;font-size:13px;font-weight:700;color:${BRAND.mutedColor};
                     text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;vertical-align:top;width:160px;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:10px 12px;font-size:14px;color:${BRAND.textColor};vertical-align:top;">
            ${escapeHtml(String(value))}
          </td>
        </tr>
      `
    )
    .join("");

  if (!rowsHtml) return "";

  return `
    <div style="background:${BRAND.cardBg};border:1px solid ${BRAND.borderColor};border-radius:10px;
                overflow:hidden;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        ${rowsHtml}
      </table>
    </div>
  `;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid ${BRAND.borderColor};margin:24px 0;" />`;
}

function p(text, style = "") {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;${style}">${text}</p>`;
}

function lineItemText(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `${label}: ${value}`;
}

function normalizeRoleLabel(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "superadmin" || role === "superuser") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "technician" || role === "worker") return "Technician";
  return role || "Team Member";
}

// ─── EMAIL BUILDERS ───────────────────────────────────────────────────────────

function buildWelcomeEmail(payload = {}) {
  const firstName = payload.firstName || "there";
  const appBaseUrl = payload.appBaseUrl || "";

  const body = `
    ${p(`Hi ${escapeHtml(firstName)},`)}
    ${p("Welcome to Sharkys Pest Control. Your account has been created successfully and you're all set to get started.")}
    ${appBaseUrl ? divider() + p("You can sign in to your account anytime using the button below.") : ""}
  `;

  return {
    subject: "Welcome to Sharkys Pest Control",
    html: wrapEmailHtml("Welcome to Sharkys Pest Control", body, ctaButtonHtml("Sign In to Your Account", appBaseUrl)),
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to Sharkys Pest Control. Your account has been created successfully.",
      appBaseUrl ? `Sign in: ${appBaseUrl}` : "",
      "",
      "We're glad to have you with us.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildLeadBookingInviteEmail(payload = {}) {
  const firstName = payload.firstName || "there";
  const signupUrl = payload.signupUrl || payload.setupUrl || payload.resetUrl || "";
  const bookingPublicId = payload.bookingPublicId || "";
  const serviceTitle = payload.serviceTitle || "";
  const startsAt = payload.startsAt || null;
  const endsAt = payload.endsAt || null;
  const address = payload.address || "";

  const schedule =
    startsAt && endsAt
      ? `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`
      : startsAt
      ? formatDateTime(startsAt)
      : "";

  const body = `
    ${p(`Hi ${escapeHtml(firstName)},`)}
    ${p("Thanks for booking with Sharkys Pest Control. Your request has been received successfully.")}
    ${infoTableHtml([
      ["Booking ID", bookingPublicId],
      ["Service", serviceTitle],
      ["Scheduled Time", schedule],
      ["Address", address],
    ])}
    ${divider()}
    ${p("Want to manage your appointments more easily? Create your account to track bookings, view service history, and message our team online.")}
    ${
      signupUrl
        ? p(
            `If the button does not work, copy and paste this link into your browser:<br /><a href="${escapeHtml(
              signupUrl
            )}" style="color:${BRAND.accentColor};word-break:break-all;">${escapeHtml(signupUrl)}</a>`,
            `font-size:14px;color:${BRAND.mutedColor};margin-bottom:0;`
          )
        : ""
    }
  `;

  return {
    subject: `Create your account – ${BRAND.companyName}`,
    html: wrapEmailHtml(
      "Complete Your Account Setup",
      body,
      ctaButtonHtml("Create My Account", signupUrl)
    ),
    text: [
      `Hi ${firstName},`,
      "",
      "Thanks for booking with Sharkys Pest Control.",
      lineItemText("Booking ID", bookingPublicId),
      lineItemText("Service", serviceTitle),
      lineItemText("Scheduled Time", schedule),
      lineItemText("Address", address),
      "",
      "Create your account to track bookings, view service history, and message our team:",
      signupUrl,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildWelcomeVerificationEmail(payload = {}) {
  const firstName = payload.firstName || "there";
  const verifyUrl = payload.verifyUrl || "";
  const code = payload.code || "";

  const body = `
    ${p(`Hi ${escapeHtml(firstName)},`)}
    ${p("Welcome to Sharkys Pest Control. Your account has been created — please verify your email address to get started.")}
    ${divider()}
    <div style="margin:24px 0;padding:24px;background:${BRAND.cardBg};border:1px solid ${BRAND.borderColor};
                border-radius:10px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.mutedColor};">
        Verification Code
      </p>
      <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:${BRAND.textColor};font-family:monospace;">
        ${escapeHtml(code)}
      </div>
      <p style="margin:12px 0 0;font-size:13px;color:${BRAND.mutedColor};">Expires in 15 minutes</p>
    </div>
    ${verifyUrl ? p("Prefer a link? Use the button below to verify your email directly.") : ""}
  `;

  return {
    subject: "Welcome to Sharkys Pest Control – Verify your email",
    html: wrapEmailHtml("Verify Your Email", body, ctaButtonHtml("Verify My Email", verifyUrl)),
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to Sharkys Pest Control. Please verify your email.",
      "",
      `Verification code: ${code}`,
      verifyUrl ? `Verify here: ${verifyUrl}` : "",
      "",
      "This code expires in 15 minutes.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildPasswordResetEmail(payload = {}) {
  const firstName = payload.firstName || "there";
  const resetUrl = payload.resetUrl || "";

  const body = `
    ${p(`Hi ${escapeHtml(firstName)},`)}
    ${p("We received a request to reset your Sharkys Pest Control password. Click the button below to choose a new one.")}
    ${divider()}
    ${p(`This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email — your password won't change.`)}
  `;

  return {
    subject: "Reset your password – Sharkys Pest Control",
    html: wrapEmailHtml("Reset Your Password", body, ctaButtonHtml("Reset My Password", resetUrl)),
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

function buildEmployeeInviteEmail(payload = {}) {
  const firstName = payload.firstName || "there";
  const roleLabel = normalizeRoleLabel(payload.roleLabel || payload.role);
  const setupUrl = payload.setupUrl || "";

  const body = `
    ${p(`Hi ${escapeHtml(firstName)},`)}
    ${p(`Welcome to ${escapeHtml(BRAND.companyName)}.`)}
    ${p(`You've been invited to join the team as a <strong>${escapeHtml(roleLabel)}</strong>. To activate your employee access, please complete your account setup using the secure link below.`)}
    ${infoTableHtml([
      ["Company", BRAND.companyName],
      ["Employee Role", roleLabel],
      ["Account Status", "Pending setup"],
      ["Invite Expires", "7 days from the time it was sent"],
    ])}
    ${divider()}
    ${p("Once setup is complete, your employee account will be activated and your email will be verified automatically.")}
    ${p("For security, this invitation link can only be used once. If it expires, please contact your system administrator or business owner for a new invite.", `color:${BRAND.mutedColor};font-size:14px;margin-bottom:0;`)}
  `;

  return {
    subject: `Employee invite – ${BRAND.companyName}`,
    html: wrapEmailHtml("Complete Your Employee Setup", body, ctaButtonHtml("Complete Employee Setup", setupUrl)),
    text: [
      `Hi ${firstName},`,
      "",
      `Welcome to ${BRAND.companyName}.`,
      `You've been invited to join as a ${roleLabel}.`,
      "",
      "Complete your employee setup using the secure link below:",
      setupUrl || "",
      "",
      "This invitation link can only be used once.",
      "It expires 7 days after it was sent.",
      "If it expires, please contact your administrator for a new invite.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildBookingCreatedCustomerEmail(payload = {}) {
  const customerName = payload.customerName || "there";
  const schedule =
    payload.startsAt && payload.endsAt
      ? `${formatDateTime(payload.startsAt)} – ${formatDateTime(payload.endsAt)}`
      : payload.startsAt
      ? formatDateTime(payload.startsAt)
      : "";

  const body = `
    ${p(`Hi ${escapeHtml(customerName)},`)}
    ${p("Your booking has been received. Here's a summary of what's scheduled:")}
    ${infoTableHtml([
      ["Booking ID", payload.bookingPublicId],
      ["Service", payload.serviceTitle],
      ["Scheduled Time", schedule],
      ["Address", payload.address],
      ["Notes", payload.notes],
    ])}
    ${divider()}
    ${p("We'll be in touch if anything changes. Thank you for choosing Sharkys Pest Control!", `color:${BRAND.mutedColor};font-size:14px;margin-bottom:0;`)}
  `;

  return {
    subject: `Booking confirmation – ${payload.bookingPublicId}`,
    html: wrapEmailHtml("Booking Confirmation", body),
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
      "We'll contact you if anything changes.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildBookingCreatedOfficeEmail(payload = {}) {
  const schedule =
    payload.startsAt && payload.endsAt
      ? `${formatDateTime(payload.startsAt)} – ${formatDateTime(payload.endsAt)}`
      : payload.startsAt
      ? formatDateTime(payload.startsAt)
      : "";

  const body = `
    ${p("A new booking has just been submitted. Review the details below:")}
    ${infoTableHtml([
      ["Booking ID", payload.bookingPublicId],
      ["Source", payload.source],
      ["Customer", payload.customerName],
      ["Email", payload.customerEmail],
      ["Phone", payload.customerPhone],
      ["Service", payload.serviceTitle],
      ["Scheduled Time", schedule],
      ["Address", payload.address],
      ["Notes", payload.notes],
    ])}
  `;

  return {
    subject: `New booking received – ${payload.bookingPublicId}`,
    html: wrapEmailHtml("New Booking Received", body),
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

function buildBookingAssignedCustomerEmail(payload = {}) {
  const customerName = payload.customerName || "there";
  const schedule =
    payload.startsAt && payload.endsAt
      ? `${formatDateTime(payload.startsAt)} – ${formatDateTime(payload.endsAt)}`
      : payload.startsAt
      ? formatDateTime(payload.startsAt)
      : "";

  const body = `
    ${p(`Hi ${escapeHtml(customerName)},`)}
    ${p("Great news — a technician has been assigned to your booking and is ready to help.")}
    ${infoTableHtml([
      ["Booking ID", payload.bookingPublicId],
      ["Service", payload.serviceTitle],
      ["Scheduled Time", schedule],
      ["Address", payload.address],
      ["Technician", payload.technicianName],
      ["Tech Phone", payload.technicianPhone],
    ])}
    ${divider()}
    ${p("Feel free to reach out if you have any questions before your appointment.", `color:${BRAND.mutedColor};font-size:14px;margin-bottom:0;`)}
  `;

  return {
    subject: `Technician assigned – ${payload.bookingPublicId}`,
    html: wrapEmailHtml("Technician Assigned", body),
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

function buildBookingCompletedCustomerEmail(payload = {}) {
  const customerName = payload.customerName || "there";
  const finalPrice = formatMoney(payload.finalPriceCents);
  const completedAt = payload.completedAt ? formatDateTime(payload.completedAt) : "";

  const body = `
    ${p(`Hi ${escapeHtml(customerName)},`)}
    ${p("Your service has been completed. Here's a summary for your records:")}
    ${infoTableHtml([
      ["Booking ID", payload.bookingPublicId],
      ["Service", payload.serviceTitle],
      ["Address", payload.address],
      ["Technician", payload.technicianName],
      ["Completed At", completedAt],
      ["Final Price", finalPrice],
    ])}
    ${divider()}
    ${p("Thank you for choosing Sharkys Pest Control. We appreciate your business and look forward to serving you again!", `color:${BRAND.mutedColor};font-size:14px;margin-bottom:0;`)}
  `;

  return {
    subject: `Service completed – ${payload.bookingPublicId}`,
    html: wrapEmailHtml("Service Completed", body),
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
      "Thank you for choosing Sharkys Pest Control.",
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
  buildEmployeeInviteEmail,
  buildBookingCreatedCustomerEmail,
  buildBookingCreatedOfficeEmail,
  buildBookingAssignedCustomerEmail,
  buildBookingCompletedCustomerEmail,
  buildLeadBookingInviteEmail,
};
// middleware/errorHandler.js
const pino = require("pino");

const logger = pino();

function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === "production";

  // -----------------------------
  // Postgres error normalization
  // -----------------------------

  const pgCode = err?.code;

  // Default status/message if not recognized
  let status = Number(err?.status || 500);
  let message = err?.message || "Something went wrong";
  let errorName = err?.name || "Error";

  if (pgCode) {
    // Do not override explicitly set status unless it's still 500-ish
    const canOverride = !err?.status || Number(err.status) === 500;

    if (canOverride) {
      switch (pgCode) {
        case "23505": {
          // unique_violation
          status = 409;
          errorName = "Conflict";

          // Give friendlier messages for common constraints
          const c = String(err.constraint || "");
          if (c.includes("users_email") || c.includes("leads_email")) {
            message = "Email already in use";
          } else if (c) {
            message = "Duplicate value violates a unique constraint";
          } else {
            message = "Duplicate value";
          }
          break;
        }

        case "23503": {
          // foreign_key_violation
          status = 409;
          errorName = "Conflict";
          message = "Related record not found (foreign key constraint)";
          break;
        }

        case "23514": {
          // check_violation
          status = 400;
          errorName = "BadRequest";
          message = "Invalid value (check constraint)";
          break;
        }

        case "22001": {
          // string_data_right_truncation
          status = 400;
          errorName = "BadRequest";
          message = "Value too long for column";
          break;
        }

        case "22P02": {
          // invalid_text_representation (e.g., bad UUID/int cast)
          status = 400;
          errorName = "BadRequest";
          message = "Invalid input format";
          break;
        }

        default: {
          // keep default status/message
          // you can optionally map more codes later
          break;
        }
      }
    }
  }

  // -----------------------------
  // Response
  // -----------------------------
  const payload = {
    ok: false,
    error: errorName,
    message,
  };

  // Add stack in non-prod (keep your current behavior)
  if (!isProd && err?.stack) payload.stack = err.stack;

  // Optional: include pg details in non-prod for faster debugging
  if (!isProd && pgCode) {
    payload.pg = {
      code: pgCode,
      constraint: err.constraint,
      detail: err.detail,
    };
  }

  if (status >= 500) {
    logger.error(
      {
        err: { message: err.message, stack: err.stack, code: err.code },
        req: { method: req.method, url: req.url, ip: req.ip },
      },
      "Server error"
    );
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };
// src/db.js
const { Pool } = require("pg");

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

// Prefer DATABASE_URL (Railway injects this automatically for linked Postgres services).
// Fall back to individual PG* vars for local dev.
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: isTest ? process.env.PGTESTDATABASE : process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ...(isProd && { ssl: { rejectUnauthorized: false } }),
    };

const pool = new Pool(connectionConfig);

module.exports = { pool };

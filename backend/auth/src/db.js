// src/db.js
const { Pool } = require("pg");

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: isTest ? process.env.PGTESTDATABASE : process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ...(isProd && {
    ssl: { rejectUnauthorized: false },
  }),
});

module.exports = { pool };

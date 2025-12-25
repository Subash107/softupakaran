const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = process.env.DATABASE_FILE || path.join(__dirname, "..", "data", "softupakaran.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect to SQLite:", err.message);
  } else {
    console.log("✅ SQLite database ready at", dbPath);
  }
});

module.exports = db;

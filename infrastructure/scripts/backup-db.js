#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");
const fsPromises = fs.promises;

const repoRoot = path.resolve(__dirname, "..", "..");
const DEFAULT_DB_PATH = path.join(repoRoot, "services", "backend", "data", "softupakaran.db");

function printHelp() {
  console.log(`
Usage: node backup-db.js [options]

Options:
  --db-path <file>   Source sqlite database (default: ${DEFAULT_DB_PATH})
  --out-dir <dir>    Folder to place backups (default: infrastructure/backups)
  --prefix <text>    Prefix for the backup filename (default: softupakaran)
  --gzip             Compress backup to .gz
  --help             Show this help
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dbPath: "",
    outDir: path.join(__dirname, "..", "backups"),
    prefix: "softupakaran",
    gzip: false,
  };
  for (let idx = 0; idx < args.length; idx++) {
    switch (args[idx]) {
      case "--help":
        printHelp();
        process.exit(0);
      case "--db-path":
        opts.dbPath = args[idx + 1];
        idx++;
        break;
      case "--out-dir":
        opts.outDir = args[idx + 1];
        idx++;
        break;
      case "--prefix":
        opts.prefix = args[idx + 1];
        idx++;
        break;
      case "--gzip":
        opts.gzip = true;
        break;
      default:
        throw new Error(`Unknown option ${args[idx]}`);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const dbPath = path.resolve(opts.dbPath || process.env.DATABASE_FILE || DEFAULT_DB_PATH);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`);
  }

  const backupDir = path.resolve(opts.outDir);
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${opts.prefix}-db-${timestamp}.db`;
  const destName = opts.gzip ? `${baseName}.gz` : baseName;
  const destPath = path.join(backupDir, destName);

  const HISTORY_FILE = path.join(backupDir, "backup-records.json");
  async function appendHistory(record) {
    const limit = 40;
    try {
      const existing = await fsPromises.readFile(HISTORY_FILE, "utf-8");
      const parsed = JSON.parse(existing);
      const rows = Array.isArray(parsed) ? parsed : [];
      const updated = [record, ...rows].slice(0, limit);
      await fsPromises.writeFile(HISTORY_FILE, JSON.stringify(updated, null, 2), "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") {
        await fsPromises.writeFile(HISTORY_FILE, JSON.stringify([record], null, 2), "utf-8");
      } else {
        console.error("Failed to update backup history:", err.message);
      }
    }
  }

  if (opts.gzip) {
    await pipeline(fs.createReadStream(dbPath), zlib.createGzip(), fs.createWriteStream(destPath));
  } else {
    fs.copyFileSync(dbPath, destPath);
  }

  const stats = fs.statSync(destPath);
  await appendHistory({
    file: destName,
    path: destPath,
    created_at: new Date().toISOString(),
    gzip: opts.gzip,
    prefix: opts.prefix,
    size: stats.size,
    env: process.env.NODE_ENV || "development",
  });

  console.log(`Backup created at ${destPath}`);
}

main().catch((err) => {
  console.error("backup-db.js failed:", err.message);
  process.exit(1);
});

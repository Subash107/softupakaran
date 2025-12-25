require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const { google } = require("googleapis");

const db = require("./db");
const initDb = require("./init-db");

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure correct protocol/host when behind a proxy (Render, etc.)
app.set("trust proxy", 1);

// healthcheck
app.get("/healthz", (req, res) => res.json({ status: "ok" }));
const FRONTEND_URL = process.env.FRONTEND_URL || "https://lamasubash107.gitlab.io/softupakaran/";
app.get("/", (_req, res) => res.redirect(302, FRONTEND_URL));
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const BACKUP_TOKEN = process.env.BACKUP_TOKEN || "";

// Init DB schema + seed demo data
initDb();

const corsOptions = {
  origin: (origin, cb) => cb(null, true), // dev: allow all; harden in prod
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// ---------- uploads (eSewa QR, etc.) ----------
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));
const dbPath = process.env.DATABASE_FILE || path.join(__dirname, "..", "data", "softupakaran.db");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `esewa-qr-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
// Product image uploads
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `product-${Date.now()}${ext}`);
  },
});
const uploadProductImage = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});


// ---------- helpers ----------
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function getSetting(key) {
  const row = await dbGet("SELECT value FROM settings WHERE key = ?", [key]).catch(() => null);
  return row ? row.value : "";
}
async function setSetting(key, value) {
  await dbRun(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [key, value]
  );
}

async function getAdminTotpSecret() {
  return await getSetting("admin_totp_secret");
}
async function getAdminTotpPending() {
  return await getSetting("admin_totp_pending");
}
async function setAdminTotpSecret(secret) {
  await setSetting("admin_totp_secret", secret || "");
}
async function setAdminTotpPending(secret) {
  await setSetting("admin_totp_pending", secret || "");
}

function signToken(user) {
  // include email/name so the frontend can show "Signed in as ..." without an extra call
  const payload = {
    userId: user.id,
    role: user.role || "user",
    email: user.email || undefined,
    name: user.name || undefined,
    totp: !!user.totp,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

function getAdminToken(req) {
  return req.query.token || req.headers["x-admin-token"];
}
function hasLegacyAdminToken(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return getAdminToken(req) === expected;
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    // ignore invalid token
  }
  next();
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function adminRequired(req, res, next) {
  const totpEnabled = !!(await getAdminTotpSecret().catch(() => ""));
  if (hasLegacyAdminToken(req)) {
    if (totpEnabled) return res.status(401).json({ error: "2FA required" });
    return next();
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin only" });
    if (totpEnabled && payload.totp !== true) {
      return res.status(401).json({ error: "2FA required" });
    }
    req.user = payload;
    next();
  } catch (_) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function backupAllowed(req) {
  if (!BACKUP_TOKEN) return false;
  const token = req.headers["x-backup-token"] || req.query.backup_token || "";
  return token && token === BACKUP_TOKEN;
}

function backupAuth(req, res, next) {
  if (backupAllowed(req)) return next();
  return adminRequired(req, res, next);
}

function loadServiceAccount() {
  const raw = process.env.GDRIVE_SA_JSON || "";
  if (!raw) return null;
  if (raw.trim().startsWith("{")) {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }
  return null;
}

async function uploadBackupToDrive(filePath) {
  const folderId = process.env.GDRIVE_FOLDER_ID || "";
  if (!folderId) throw new Error("Missing GDRIVE_FOLDER_ID");
  const creds = loadServiceAccount();
  if (!creds) throw new Error("Missing GDRIVE_SA_JSON");

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const drive = google.drive({ version: "v3", auth });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `softupakaran-backup-${ts}.db`;
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: { name, parents: [folderId] },
    media: {
      mimeType: "application/x-sqlite3",
      body: fs.createReadStream(filePath),
    },
    fields: "id,name,createdTime",
  });
  return res.data;
}

function publicUrl(req, pathname) {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

// ---------- bootstrap admin user ----------
async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@softupakaran.local";
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  try {
    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [email]).catch(() => null);
    if (existing) return;

    const hash = await bcrypt.hash(password, 10);
    await dbRun(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ["Admin", email, hash]
    );

    console.log("👤 Admin user ready:", email);
  } catch (err) {
    console.error("❌ Failed to ensure admin user:", err.message);
  }
}
ensureAdminUser();

// ---------- basic ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---------- auth & users ----------
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, phone, whatsapp } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [email]).catch(() => null);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const result = await dbRun(
      "INSERT INTO users (name, email, password_hash, phone, whatsapp, role) VALUES (?, ?, ?, ?, ?, 'user')",
      [name || "", email, hash, phone || "", whatsapp || ""]
    );

    const user = { id: result.lastID, role: "user", email, name: name || "" };
    res.json({ token: signToken(user) });
  } catch (err) {
    console.error("Register failed:", err.message);
    res.status(500).json({ error: "Register failed" });
  }
});

// ---------- admin: create users ----------
app.post("/api/admin/users", adminRequired, async (req, res) => {
  const { name, email, password, phone, whatsapp, role } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanRole = String(role || "user").trim() || "user";
  if (!cleanEmail || !password) return res.status(400).json({ error: "Email and password are required" });
  if (!["user", "admin"].includes(cleanRole)) return res.status(400).json({ error: "role must be user or admin" });

  try {
    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [cleanEmail]).catch(() => null);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(String(password), 10);
    const result = await dbRun(
      "INSERT INTO users (name, email, password_hash, phone, whatsapp, role) VALUES (?, ?, ?, ?, ?, ?)",
      [String(name || ""), cleanEmail, hash, String(phone || ""), String(whatsapp || ""), cleanRole]
    );

    const row = await dbGet(
      "SELECT id, name, email, phone, whatsapp, role, created_at, updated_at FROM users WHERE id = ?",
      [result.lastID]
    ).catch(() => null);

    res.status(201).json({ ok: true, user: row || { id: result.lastID, email: cleanEmail, role: cleanRole } });
  } catch (err) {
    console.error("Create user failed:", err.message);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, otp } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const user = await dbGet(
      "SELECT id, email, password_hash, role, name, whatsapp, phone, created_at FROM users WHERE email = ?",
      [email]
    ).catch(() => null);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    if (String(user.role || "").toLowerCase() === "admin") {
      const secret = await getAdminTotpSecret();
      if (secret) {
        const token = String(otp || "").trim();
        if (!token) return res.status(401).json({ error: "2FA required" });
        const valid = speakeasy.totp.verify({
          secret,
          encoding: "base32",
          token,
          window: 1,
        });
        if (!valid) return res.status(401).json({ error: "Invalid 2FA code" });
        return res.json({ token: signToken({ ...user, totp: true }), totp_enabled: true });
      }
      return res.json({
        token: signToken({ ...user, totp: false }),
        totp_enabled: false,
        needs_2fa_setup: true,
      });
    }

    res.json({ token: signToken({ ...user, totp: false }), totp_enabled: false });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/me", authRequired, async (req, res) => {
  try {
    const row = await dbGet(
      "SELECT id, name, email, phone, whatsapp, role, created_at, updated_at FROM users WHERE id = ?",
      [req.user.userId]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

app.patch("/api/me/whatsapp", authRequired, async (req, res) => {
  const { whatsapp } = req.body || {};
  try {
    await dbRun("UPDATE users SET whatsapp = ?, updated_at = datetime('now') WHERE id = ?", [
      whatsapp || "",
      req.user.userId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update WhatsApp" });
  }
});

// ---------- public settings (customer side) ----------
app.get("/api/public/settings", async (req, res) => {
  try {
    const whatsapp = await getSetting("whatsapp_number");
    const qr = await getSetting("esewa_qr_filename");
    res.json({
      whatsapp_number: whatsapp || "",
      esewa_qr_url: qr ? publicUrl(req, `/uploads/${qr}`) : "",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// ---------- admin settings ----------
app.put("/api/admin/settings/whatsapp", adminRequired, async (req, res) => {
  const { whatsapp } = req.body || {};
  try {
    await setSetting("whatsapp_number", whatsapp || "");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update WhatsApp number" });
  }
});

app.post("/api/admin/settings/esewa-qr", adminRequired, upload.single("qr"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  try {
    await setSetting("esewa_qr_filename", req.file.filename);
    res.json({
      ok: true,
      filename: req.file.filename,
      esewa_qr_url: publicUrl(req, `/uploads/${req.file.filename}`),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save QR" });
  }
});

// ---------- public proxy: ilovemithila store (avoid CORS issues) ----------
async function proxyIlm(req, res, path) {
  const url = `https://store.ilovemithila.com/wp-json/wc/store${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: "ILM proxy failed", detail: err.message });
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/public/ilm/categories", (req, res) => {
  proxyIlm(req, res, "/products/categories?per_page=100");
});

app.get("/api/public/ilm/products", (req, res) => {
  proxyIlm(req, res, "/products?per_page=100&_fields=id,name,prices,images,categories");
});

// ---------- admin: backups ----------
app.post("/api/admin/backup", backupAuth, async (_req, res) => {
  try {
    if (!fs.existsSync(dbPath)) return res.status(404).json({ error: "Database file not found" });
    const info = await uploadBackupToDrive(dbPath);
    res.json({ ok: true, file: info });
  } catch (err) {
    res.status(500).json({ error: "Backup failed", detail: err.message });
  }
});

app.get("/api/admin/backup/download", backupAuth, (_req, res) => {
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: "Database file not found" });
  res.download(dbPath, "softupakaran-backup.db", (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: "Backup download failed" });
    }
  });
});

// ---------- feedback ----------
app.post("/api/feedback", authOptional, async (req, res) => {
  const { name, email, rating, message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message is required" });

  const userId = req.user?.userId || null;
  // If the user is logged in (profile page), we can publish instantly.
  // Anonymous feedback stays as 'new' (admin can review later).
  const status = userId ? "published" : "new";

  try {
    const result = await dbRun(
      "INSERT INTO feedback (user_id, name, email, rating, message, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        name || "",
        email || "",
        (rating === undefined || rating === null || rating === "")
          ? null
          : (isNaN(parseInt(rating, 10)) ? null : parseInt(rating, 10)),
        message,
        status,
      ]
    );
    res.json({ ok: true, id: result.lastID });
  } catch (err) {
    console.error("Feedback failed:", err.message);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// Public testimonials (homepage)
app.get("/api/public/feedback", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "6", 10) || 6, 20);
  try {
    const rows = await dbAll(
      `SELECT id, created_at, name, rating, message
       FROM feedback
       WHERE status = 'published'
         AND message IS NOT NULL
         AND TRIM(message) <> ''
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

app.get("/api/admin/feedback", adminRequired, async (req, res) => {
  try {
    const status = String(req.query.status || "all").trim().toLowerCase();
    const q = String(req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10) || 20, 1), 200);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (status && status !== "all") {
      where.push("f.status = ?");
      params.push(status === "approved" ? "published" : status);
    }
    if (q) {
      where.push("(LOWER(f.name) LIKE ? OR LOWER(f.email) LIKE ? OR LOWER(f.message) LIKE ? OR LOWER(u.email) LIKE ?)");
      const like = `%${q.toLowerCase()}%`;
      params.push(like, like, like, like);
    }

    const whereSql = where.length ? ("WHERE " + where.join(" AND ")) : "";
    const totalRow = await dbGet(
      `SELECT COUNT(*) AS cnt FROM feedback f LEFT JOIN users u ON u.id = f.user_id ${whereSql}`,
      params
    );
    const total = totalRow?.cnt ?? 0;

    const rows = await dbAll(
      `SELECT f.*, u.email AS user_email
       FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ${whereSql}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      params.concat([limit, offset])
    );

    res.json({ feedback: rows, total });
  } catch (err) {
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

app.patch("/api/admin/feedback/:id", adminRequired, async (req, res) => {
  const { status } = req.body || {};
  const id = Number(req.params.id);
  try {
    await dbRun("UPDATE feedback SET status = ? WHERE id = ?", [status || "new", id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

app.delete("/api/admin/feedback/:id", adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const result = await dbRun("DELETE FROM feedback WHERE id = ?", [id]);
    if (!result.changes) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

// ---------- admin users ----------
app.get("/api/admin/users", adminRequired, async (_req, res) => {
  try {
    const rows = await dbAll(
      "SELECT id, name, email, phone, whatsapp, role, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 300"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ---------- admin 2FA (TOTP) ----------
app.get("/api/admin/2fa/status", adminRequired, async (_req, res) => {
  try {
    const secret = await getAdminTotpSecret();
    const pending = await getAdminTotpPending();
    res.json({ enabled: !!secret, pending: !!pending });
  } catch (err) {
    res.status(500).json({ error: "Failed to load 2FA status" });
  }
});

app.post("/api/admin/2fa/setup/start", adminRequired, async (req, res) => {
  try {
    const secret = await getAdminTotpSecret();
    if (secret) return res.status(409).json({ error: "2FA already enabled" });

    const email = String(req.user?.email || "admin");
    const name = `Softupakaran Admin (${email})`;
    const generated = speakeasy.generateSecret({ name, issuer: "Softupakaran" });
    const pendingSecret = generated.base32;
    await setAdminTotpPending(pendingSecret);

    const qrDataUrl = await qrcode.toDataURL(generated.otpauth_url);
    res.json({
      otpauth_url: generated.otpauth_url,
      secret: pendingSecret,
      qr_data_url: qrDataUrl,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to start 2FA setup" });
  }
});

app.post("/api/admin/2fa/setup/verify", adminRequired, async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Missing token" });
  try {
    const pending = await getAdminTotpPending();
    if (!pending) return res.status(400).json({ error: "No pending setup" });
    const valid = speakeasy.totp.verify({
      secret: pending,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid) return res.status(400).json({ error: "Invalid code" });
    await setAdminTotpSecret(pending);
    await setAdminTotpPending("");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify 2FA setup" });
  }
});

app.delete("/api/admin/users/:id", adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const user = await dbGet("SELECT id FROM users WHERE id = ?", [id]).catch(() => null);
    if (!user) return res.status(404).json({ error: "Not found" });
    const result = await dbRun("DELETE FROM users WHERE id = ?", [id]);
    if (!result.changes) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ---------- admin: categories ----------
app.get("/api/admin/categories", adminRequired, async (_req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM categories ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load categories" });
  }
});

app.post("/api/admin/categories", adminRequired, express.json(), async (req, res) => {
  const body = req.body || {};
  const id = String(body.id || "").trim();
  const name = String(body.name || "").trim();
  const tag = String(body.tag || "").trim();
  const icon = String(body.icon || "").trim();

  if (!id) return res.status(400).json({ error: "id is required" });
  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    const existing = await dbGet("SELECT id FROM categories WHERE id = ?", [id]).catch(() => null);
    if (existing) return res.status(409).json({ error: "Category already exists" });
    await dbRun(
      "INSERT INTO categories (id, name, tag, icon) VALUES (?, ?, ?, ?)",
      [id, name, tag || null, icon || null]
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.patch("/api/admin/categories/:id", adminRequired, express.json(), async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const body = req.body || {};
  const fields = [];
  const params = [];

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    fields.push("name = ?");
    params.push(name);
  }
  if (body.tag !== undefined) {
    const tag = String(body.tag || "").trim();
    fields.push("tag = ?");
    params.push(tag || null);
  }
  if (body.icon !== undefined) {
    const icon = String(body.icon || "").trim();
    fields.push("icon = ?");
    params.push(icon || null);
  }

  if (!fields.length) return res.status(400).json({ error: "No changes provided" });

  try {
    const result = await dbRun(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`, params.concat([id]));
    if (!result.changes) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/admin/categories/:id", adminRequired, async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const row = await dbGet("SELECT COUNT(*) AS cnt FROM products WHERE category_id = ?", [id]).catch(() => null);
    if ((row?.cnt || 0) > 0) {
      return res.status(409).json({ error: "Category has products; reassign them first" });
    }
    const result = await dbRun("DELETE FROM categories WHERE id = ?", [id]);
    if (!result.changes) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ---------- store data ----------
app.get("/api/categories", (req, res) => {
  db.all("SELECT * FROM categories", (err, rows) => {
    if (err) {
      console.error("Failed to load categories:", err.message);
      return res.status(500).json({ error: "Failed to load categories" });
    }
    res.json(rows);
  });
});

app.get("/api/products", (req, res) => {
  const { category, q, minPrice, maxPrice, sort } = req.query;
  const limit = Math.min(parseInt(req.query.limit || "200", 10) || 200, 500);
  const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);

  let sql = "SELECT * FROM products";
  const where = [];
  const params = [];

  if (category) {
    where.push("category_id = ?");
    params.push(String(category));
  }
  if (q) {
    where.push("(name LIKE ? OR note LIKE ?)");
    const like = `%${String(q)}%`;
    params.push(like, like);
  }
  if (minPrice !== undefined && minPrice !== null && String(minPrice).trim() !== "") {
    const v = parseInt(minPrice, 10);
    if (!Number.isNaN(v)) {
      where.push("price_npr >= ?");
      params.push(v);
    }
  }
  if (maxPrice !== undefined && maxPrice !== null && String(maxPrice).trim() !== "") {
    const v = parseInt(maxPrice, 10);
    if (!Number.isNaN(v)) {
      where.push("price_npr <= ?");
      params.push(v);
    }
  }

  if (where.length) sql += " WHERE " + where.join(" AND ");

  const sortMap = {
    name_asc: "name ASC",
    name_desc: "name DESC",
    price_asc: "price_npr ASC",
    price_desc: "price_npr DESC",
    newest: "rowid DESC",
  };
  sql += " ORDER BY " + (sortMap[sort] || sortMap.name_asc);
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Failed to load products:", err.message);
      return res.status(500).json({ error: "Failed to load products" });
    }
    res.json(rows);
  });
});


app.get("/api/products/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Failed to load product:", err.message);
      return res.status(500).json({ error: "Failed to load product" });
    }
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});


// ---------- admin: products CRUD + search ----------

// ---------- admin: products CRUD + search ----------
app.get("/api/admin/products", adminRequired, (req, res) => {
  const { category, q, minPrice, maxPrice, sort } = req.query;
  const limit = Math.min(parseInt(req.query.limit || "20", 10) || 20, 200);
  const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);

  const where = [];
  const params = [];

  if (category) {
    where.push("category_id = ?");
    params.push(String(category));
  }
  if (q) {
    where.push("(name LIKE ? OR note LIKE ?)");
    const like = `%${String(q)}%`;
    params.push(like, like);
  }
  if (minPrice !== undefined && minPrice !== null && String(minPrice).trim() !== "") {
    const v = parseInt(minPrice, 10);
    if (!Number.isNaN(v)) {
      where.push("price_npr >= ?");
      params.push(v);
    }
  }
  if (maxPrice !== undefined && maxPrice !== null && String(maxPrice).trim() !== "") {
    const v = parseInt(maxPrice, 10);
    if (!Number.isNaN(v)) {
      where.push("price_npr <= ?");
      params.push(v);
    }
  }

  const whereSql = where.length ? (" WHERE " + where.join(" AND ")) : "";

  const sortMap = {
    name_asc: "name ASC",
    name_desc: "name DESC",
    price_asc: "price_npr ASC",
    price_desc: "price_npr DESC",
    newest: "rowid DESC",
  };
  const orderBy = sortMap[sort] || sortMap.name_asc;

  db.get(`SELECT COUNT(*) as total FROM products${whereSql}`, params, (e1, row) => {
    if (e1) {
      console.error("Failed to count products:", e1.message);
      return res.status(500).json({ error: "Failed to load products" });
    }
    db.all(
      `SELECT * FROM products${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (e2, rows) => {
        if (e2) {
          console.error("Failed to load products:", e2.message);
          return res.status(500).json({ error: "Failed to load products" });
        }
        res.json({ items: rows, total: row?.total || 0, limit, offset });
      }
    );
  });
});

app.post("/api/admin/products", adminRequired, express.json(), (req, res) => {
  const body = req.body || {};
  const id = (body.id && String(body.id).trim()) ? String(body.id).trim() : `p${Date.now().toString(36)}`;
  const name = String(body.name || "").trim();
  const category_id = String(body.category_id || body.category || "").trim();
  const price_npr = parseInt(body.price_npr ?? body.price ?? "0", 10);

  if (!name) return res.status(400).json({ error: "Product name is required" });
  if (!category_id) return res.status(400).json({ error: "category_id is required" });
  if (Number.isNaN(price_npr) || price_npr < 0) return res.status(400).json({ error: "price_npr must be a number" });

  const image = (body.image || body.img || "").trim() || null;
  const note = (body.note || "").trim() || null;

  db.run(
    "INSERT INTO products (id, name, category_id, price_npr, image, note) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, category_id, price_npr, image, note],
    function (err) {
      if (err) {
        console.error("Failed to create product:", err.message);
        return res.status(500).json({ error: "Failed to create product" });
      }
      res.status(201).json({ ok: true, id });
    }
  );
});

app.patch("/api/admin/products/:id", adminRequired, express.json(), (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const fields = [];
  const params = [];

  if (body.name !== undefined) { fields.push("name = ?"); params.push(String(body.name).trim()); }
  if (body.category_id !== undefined || body.category !== undefined) {
    fields.push("category_id = ?"); params.push(String(body.category_id || body.category).trim());
  }
  if (body.price_npr !== undefined || body.price !== undefined) {
    const v = parseInt(body.price_npr ?? body.price, 10);
    if (Number.isNaN(v) || v < 0) return res.status(400).json({ error: "price_npr must be a number" });
    fields.push("price_npr = ?"); params.push(v);
  }
  if (body.image !== undefined || body.img !== undefined) { fields.push("image = ?"); params.push((String(body.image || body.img || "").trim()) || null); }
  if (body.note !== undefined) { fields.push("note = ?"); params.push((String(body.note || "").trim()) || null); }

  if (!fields.length) return res.status(400).json({ error: "No changes provided" });

  params.push(id);
  db.run(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, params, function (err) {
    if (err) {
      console.error("Failed to update product:", err.message);
      return res.status(500).json({ error: "Failed to update product" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });
});

app.delete("/api/admin/products/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Failed to delete product:", err.message);
      return res.status(500).json({ error: "Failed to delete product" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });
});

// Upload a product image (returns URL). Use multipart/form-data with field name: image
app.post("/api/admin/uploads/product-image", adminRequired, uploadProductImage.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing image" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url, absoluteUrl: `${req.protocol}://${req.get("host")}${url}` });
});


// ---------- orders ----------
app.post("/api/orders", (req, res) => {
  const body = req.body || {};
  const lines = Array.isArray(body.items) ? body.items : [];
  const total = body.totalNpr || null;
  const note = body.extraNote || null;
  const source = body.source || null;

  const firstLine = lines[0] || {};
  const quantity = lines.reduce((sum, l) => sum + (l.qty || 0), 0) || null;

  const sql = `
    INSERT INTO orders (
      customer_name,
      game_uid,
      product_id,
      quantity,
      total_npr,
      payment_method,
      status,
      whatsapp,
      raw_cart_json,
      source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    body.customerName || null,
    body.gameUid || null,
    firstLine.id || body.productId || null,
    quantity,
    total,
    body.paymentMethod || body.method || null,
    body.status || "created",
    body.whatsapp || null,
    JSON.stringify(body) || null,
    source || null,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Failed to insert order:", err.message);
      return res.status(500).json({ error: "Failed to create order" });
    }
    res.json({ ok: true, id: this.lastID });
  });
});

// Legacy admin token still supported; also supports admin JWT now.
app.get("/api/orders", adminRequired, (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200", (err, rows) => {
    if (err) {
      console.error("Failed to load orders:", err.message);
      return res.status(500).json({ error: "Failed to load orders" });
    }
    res.json(rows);
  });
});



// ---------- Google sign-in (lightweight) ----------
// Accepts Google credential JWT (from GIS). Verifies issuer and optional audience.
app.post("/api/auth/google", async (req, res) => {
  try {
    const cred = (req.body && req.body.credential) || "";
    if (!cred) return res.status(400).json({ error: "Missing credential" });
    // decode without verifying signature (demo); basic checks:
    const parts = String(cred).split(".");
    if (parts.length < 2) return res.status(400).json({ error: "Invalid credential" });
    function b64uToStr(s){ return Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'); }
    let payload;
    try { payload = JSON.parse(b64uToStr(parts[1])); } catch (_) { return res.status(400).json({ error: "Bad payload" }); }
    const iss = String(payload.iss || "");
    if (!iss.includes("accounts.google.com")) return res.status(400).json({ error: "Invalid issuer" });
    const allowAny = /^true$/i.test(String(process.env.ALLOW_ANY_GOOGLE_AUD || "")) || process.env.NODE_ENV !== "production";
    const allowedAudiences = String(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
      .split(/[,\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    const tokenAud = String(payload.aud || "");
    if (allowedAudiences.length && !allowAny && !allowedAudiences.includes(tokenAud)) {
      return res.status(400).json({ error: "Invalid audience", expected: allowedAudiences, got: tokenAud });
    }

    const email = String(payload.email || "").trim().toLowerCase();
    const name = String(payload.name || "").trim() || "";
    if (!email) return res.status(400).json({ error: "No email in credential" });

    // find or create user
    const existing = await dbGet("SELECT id, email, role, name FROM users WHERE email = ?", [email]).catch(() => null);
    let userRow = existing;
    if (!existing) {
      const fallbackPassword = crypto.randomBytes(32).toString("hex");
      const hash = await bcrypt.hash(fallbackPassword, 10);
      const result = await dbRun(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
        [name, email, hash]
      );
      userRow = { id: result.lastID, email, role: "user", name };
    }
    return res.json({ token: signToken(userRow) });
  } catch (err) {
    console.error("Google auth failed:", err);
    res.status(500).json({ error: "Google auth failed" });
  }
});

app.listen(PORT, () => {
  console.log("dYs? SoftUpakaran API running on http://localhost:" + PORT);
});




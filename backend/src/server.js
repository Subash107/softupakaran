require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const db = require("./db");
const initDb = require("./init-db");

const app = express();
const PORT = process.env.PORT || 4000;


// healthcheck
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Init DB schema + seed demo data
initDb();

app.use(cors());
app.use(express.json());

// ---------- uploads (eSewa QR, etc.) ----------
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

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

function signToken(user) {
  // include email/name so the frontend can show "Signed in as ..." without an extra call
  return jwt.sign(
    {
      userId: user.id,
      role: user.role || "user",
      email: user.email || undefined,
      name: user.name || undefined,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
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

function adminRequired(req, res, next) {
  if (hasLegacyAdminToken(req)) return next();
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin only" });
    req.user = payload;
    next();
  } catch (_) {
    return res.status(401).json({ error: "Unauthorized" });
  }
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
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const user = await dbGet(
      "SELECT id, email, password_hash, role, name, whatsapp, phone, created_at FROM users WHERE email = ?",
      [email]
    ).catch(() => null);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ token: signToken(user) });
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

app.get("/api/admin/feedback", adminRequired, async (_req, res) => {
  try {
    const rows = await dbAll(
      `SELECT f.*, u.email AS user_email
       FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC
       LIMIT 300`
    );
    res.json(rows);
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

app.listen(PORT, () => {
  console.log(`🚀 SoftUpakaran API running on http://localhost:${PORT}`);
});

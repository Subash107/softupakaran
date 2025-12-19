const db = require("./db");

function ensureColumn(table, column, type) {
  db.all(`PRAGMA table_info(${table})`, (err, cols) => {
    if (err) {
      console.error(`❌ Failed to read schema for ${table}:`, err.message);
      return;
    }
    const exists = (cols || []).some((c) => c.name === column);
    if (!exists) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (e) => {
        if (e) console.error(`❌ Failed to add column ${table}.${column}:`, e.message);
      });
    }
  });
}

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tag TEXT,
        icon TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category_id TEXT NOT NULL,
        price_npr INTEGER NOT NULL,
        image TEXT,
        note TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        customer_name TEXT,
        game_uid TEXT,
        product_id TEXT,
        quantity INTEGER,
        total_npr INTEGER,
        payment_method TEXT,
        status TEXT,
        whatsapp TEXT,
        raw_cart_json TEXT,
        source TEXT
      )
    `);

    // Backward compatible: add columns if an old DB exists
    ensureColumn("orders", "whatsapp", "TEXT");
    ensureColumn("orders", "raw_cart_json", "TEXT");
    ensureColumn("orders", "source", "TEXT");

    // Users & admin
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        whatsapp TEXT,
        role TEXT DEFAULT 'user'
      )
    `);

    // Customer feedback
    db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        user_id INTEGER,
        name TEXT,
        email TEXT,
        rating INTEGER,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Simple key/value settings store
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Default settings (safe to re-run)
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_number', '')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('esewa_qr_filename', '')`);

    // Seed demo data (categories & products) - keep your original demo store
    db.get("SELECT COUNT(*) AS count FROM categories", (err, row) => {
      if (err) {
        console.error("❌ Failed to check categories count:", err.message);
        return;
      }

      if (row.count > 0) {
        console.log("ℹ️ Categories already seeded.");
        return;
      }

      console.log("🌱 Seeding demo categories & products...");

      const categories = [
        { id: "freefire", name: "Free Fire Top Up", tag: "Top up diamonds instantly", icon: "🔥" },
        { id: "pubg", name: "PUBG UC", tag: "UC pins & UID top-up", icon: "🎮" },
        { id: "gift", name: "Gift Cards", tag: "Steam, Google Play & more", icon: "🎁" },
        { id: "subs", name: "Subscriptions", tag: "Netflix, Spotify, Prime", icon: "⭐" },
        { id: "social", name: "Social Media Boost", tag: "Coins, credits & boosts", icon: "📣" },
        { id: "gears", name: "Gaming Gears", tag: "Mice, headsets, keyboards", icon: "🖱️" }
      ];

      const products = [
        { id: "p1", name: "PUBG 60 UC (Global)", category: "pubg", price: 140, img: "assets/product-1.svg", note: "Instant delivery • UID" },
        { id: "p2", name: "Free Fire Diamonds (Direct UID)", category: "freefire", price: 80, img: "assets/product-2.svg", note: "Fast top-up • Secure" },
        { id: "p3", name: "Steam Wallet Code $10", category: "gift", price: 1500, img: "assets/product-3.svg", note: "Digital code • Global" },
        { id: "p4", name: "Netflix Subscription (1 Month)", category: "subs", price: 999, img: "assets/product-4.svg", note: "Easy activation" },
        { id: "p5", name: "Google Play Gift Card $5", category: "gift", price: 750, img: "assets/product-5.svg", note: "US region" },
        { id: "p6", name: "MLBB Diamonds (1000+)", category: "pubg", price: 800, img: "assets/product-6.svg", note: "UID + Zone" },
        { id: "p7", name: "TikTok Coins Pack", category: "social", price: 350, img: "assets/product-7.svg", note: "Quick processing" },
        { id: "p8", name: "RGB Gaming Mouse (Budget)", category: "gears", price: 1200, img: "assets/product-8.svg", note: "1 year warranty" }
      ];

      const catStmt = db.prepare("INSERT INTO categories (id, name, tag, icon) VALUES (?, ?, ?, ?)");
      categories.forEach((c) => catStmt.run(c.id, c.name, c.tag, c.icon));
      catStmt.finalize();

      const prodStmt = db.prepare("INSERT INTO products (id, name, category_id, price_npr, image, note) VALUES (?, ?, ?, ?, ?, ?)");
      products.forEach((p) =>
        prodStmt.run(p.id, p.name, p.category, p.price, p.img, p.note)
      );
      prodStmt.finalize();
    });
  });
}

module.exports = initDb;


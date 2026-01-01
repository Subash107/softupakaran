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

    // Admin login audit trail
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_login_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ip TEXT,
        country_code TEXT,
        country_name TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category_id TEXT NOT NULL,
        price_npr INTEGER NOT NULL,
        price_usd INTEGER,
        tier TEXT,
        availability TEXT,
        note TEXT,
        note_ne TEXT,
        image TEXT,
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
    ensureColumn("products", "price_usd", "INTEGER");
    ensureColumn("products", "tier", "TEXT");
    ensureColumn("products", "availability", "TEXT");
    ensureColumn("products", "note_ne", "TEXT");

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

    // Blog posts
    db.run(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        featured_image TEXT,
        published_at TEXT,
        status TEXT DEFAULT 'published',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.get("SELECT COUNT(*) AS count FROM blog_posts", (err, row) => {
      if (err) {
        console.error("⚠️ Failed to check blog posts count:", err.message);
        return;
      }

      if (row.count > 0) {
        console.log("ℹ️ Blog posts already seeded.");
        return;
      }

      console.log("🌱 Seeding demo blog posts...");
      const now = new Date().toISOString();
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const posts = [
        {
          slug: "how-to-order-digital-plans",
          title: "How to order digital plans with SoftUpakaran",
          summary: "Quick steps to browse, select, and secure a Netflix or VPN plan for Nepal.",
          content: "Pick a category, add your desired items to the cart, then check out via WhatsApp or eSewa QR. We deliver within minutes with clear instructions.",
          featured_image: "assets/product-4.svg",
          published_at: yesterday,
          status: "published"
        },
        {
          slug: "whatsapp-support-tips",
          title: "WhatsApp support tips for instant delivery",
          summary: "Use automated replies, share receipts, and confirm your order via WhatsApp.",
          content: "After checkout, send a screenshot of your payment on WhatsApp. We reply with activation details including proofs saved under backend logs.",
          featured_image: "assets/product-3.svg",
          published_at: now,
          status: "published"
        }
      ];

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO blog_posts (slug, title, summary, content, featured_image, published_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      posts.forEach(p => {
        const publishedAt = p.published_at || now;
        stmt.run(p.slug, p.title, p.summary, p.content, p.featured_image, publishedAt, p.status || "published", publishedAt, publishedAt);
      });
      stmt.finalize();
    });

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
        { id: "subscriptions", name: "Subscriptions", tag: "Premium tools and streaming", icon: "SUB" },
        { id: "spotify", name: "Spotify", tag: "Premium plans & top-ups", icon: "SP" },
        { id: "social", name: "Social Media Boost", tag: "Coins, credits & boosts", icon: "📣" },
        { id: "gears", name: "Gaming Gears", tag: "Mice, headsets, keyboards", icon: "🖱️" }
      ];

    const products = [
        { id: "p1", name: "Free Fire 530 Diamonds", category: "freefire", price: 999, img: "assets/product-2.svg", note: "Direct UID - Instant delivery" },
        { id: "p2", name: "PUBG UC 600 (Global)", category: "pubg", price: 1300, img: "assets/product-1.svg", note: "UID top-up - 5-10 min" },
        { id: "p3", name: "Google Play Gift Card $10", category: "gift", price: 1550, img: "assets/product-5.svg", note: "US region - Digital code" },
        { id: "p4", name: "Steam Wallet Code $20", category: "gift", price: 3100, img: "assets/product-3.svg", note: "Global/US - Instant code" },
        { id: "p5", name: "Netflix Premium (1 Month)", category: "subscriptions", price: 1299, img: "assets/product-4.svg", note: "Shared profile - 4K" },
        { id: "p6", name: "Spotify Premium (3 Months)", category: "spotify", price: 1199, img: "assets/product-3.svg", note: "Activation within 1 hour" },
        { id: "p7", name: "TikTok Coins 350", category: "social", price: 650, img: "assets/product-7.svg", note: "Nepal payment - Quick delivery" },
        { id: "p8", name: "Gaming Mouse RGB (Budget)", category: "gears", price: 1499, img: "assets/product-8.svg", note: "2-year warranty - DPI 6400" }
      ];

      const catStmt = db.prepare("INSERT INTO categories (id, name, tag, icon) VALUES (?, ?, ?, ?)");
      categories.forEach((c) => catStmt.run(c.id, c.name, c.tag, c.icon));
      catStmt.finalize();

      const prodStmt = db.prepare("INSERT INTO products (id, name, category_id, price_npr, price_usd, tier, availability, note, note_ne, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      products.forEach((p) =>
        prodStmt.run(p.id, p.name, p.category, p.price, p.price_usd || null, p.tier || null, p.availability || null, p.note, p.note_ne || "", p.img)
      );
      prodStmt.finalize();
    });
  });
}

module.exports = initDb;




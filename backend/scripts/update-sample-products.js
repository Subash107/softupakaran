const db = require("../src/db");

const categories = [
  { id: "freefire", name: "Free Fire Top Up", tag: "Top up diamonds instantly", icon: "FF" },
  { id: "pubg", name: "PUBG UC", tag: "UC pins & UID top-up", icon: "PG" },
  { id: "gift", name: "Gift Cards", tag: "Steam, Google Play & more", icon: "GC" },
  { id: "subs", name: "Subscriptions", tag: "Netflix, Spotify, Prime", icon: "NS" },
  { id: "spotify", name: "Spotify", tag: "Premium plans & top-ups", icon: "SP" },
  { id: "social", name: "Social Media Boost", tag: "Coins, credits & boosts", icon: "SM" },
  { id: "gears", name: "Gaming Gears", tag: "Mice, headsets, keyboards", icon: "GG" }
];

const products = [
  { id: "p1", name: "Free Fire 530 Diamonds", category: "freefire", price: 999, img: "assets/product-2.svg", note: "Direct UID - Instant delivery" },
  { id: "p2", name: "PUBG UC 600 (Global)", category: "pubg", price: 1300, img: "assets/product-1.svg", note: "UID top-up - 5-10 min" },
  { id: "p3", name: "Google Play Gift Card $10", category: "gift", price: 1550, img: "assets/product-5.svg", note: "US region - Digital code" },
  { id: "p4", name: "Steam Wallet Code $20", category: "gift", price: 3100, img: "assets/product-3.svg", note: "Global/US - Instant code" },
  { id: "p5", name: "Netflix Premium (1 Month)", category: "subs", price: 1299, img: "assets/product-4.svg", note: "Shared profile - 4K" },
  { id: "p6", name: "Spotify Premium (3 Months)", category: "spotify", price: 1199, img: "assets/product-3.svg", note: "Activation within 1 hour" },
  { id: "p7", name: "TikTok Coins 350", category: "social", price: 650, img: "assets/product-7.svg", note: "Nepal payment - Quick delivery" },
  { id: "p8", name: "Gaming Mouse RGB (Budget)", category: "gears", price: 1499, img: "assets/product-8.svg", note: "2-year warranty - DPI 6400" }
];

db.serialize(() => {
  const catStmt = db.prepare(
    "INSERT OR REPLACE INTO categories (id, name, tag, icon) VALUES (?, ?, ?, ?)"
  );
  categories.forEach((c) => catStmt.run(c.id, c.name, c.tag, c.icon));
  catStmt.finalize();

  const prodStmt = db.prepare(
    "INSERT OR REPLACE INTO products (id, name, category_id, price_npr, image, note) VALUES (?, ?, ?, ?, ?, ?)"
  );
  products.forEach((p) =>
    prodStmt.run(p.id, p.name, p.category, p.price, p.img, p.note)
  );
  prodStmt.finalize();

  db.close(() => {
    console.log("Updated sample products in the database.");
  });
});

const db = require("../src/db");

const categories = [
  { id: "freefire", name: "Free Fire Top Up", tag: "Top up diamonds instantly", icon: "FF" },
  { id: "pubg", name: "PUBG UC", tag: "UC pins & UID top-up", icon: "PG" },
  { id: "gift", name: "Gift Cards", tag: "Steam, Google Play & more", icon: "GC" },
  { id: "subscriptions", name: "Subscriptions", tag: "Premium tools and streaming", icon: "SUB" },
  { id: "spotify", name: "Spotify", tag: "Premium plans & top-ups", icon: "SP" },
  { id: "social", name: "Social Media Boost", tag: "Coins, credits & boosts", icon: "SM" },
  { id: "gears", name: "Gaming Gears", tag: "Mice, headsets, keyboards", icon: "GG" }
];

const products = [
  {
    id: "netflix-mobile",
    name: "Netflix Mobile (1 Month)",
    category: "netflix",
    price: 450,
    price_usd: 3,
    tier: "Mobile Plan",
    availability: "In stock",
    note: "480p • Mobile only • Nepal ready",
    note_ne: "४८०प • मोबाइल मात्र • नेपाल डेलिभरी",
    img: "assets/product-2.svg"
  },
  {
    id: "netflix-basic",
    name: "Netflix Basic (1 Month)",
    category: "netflix",
    price: 650,
    price_usd: 4.5,
    tier: "Basic Plan",
    availability: "Limited",
    note: "720p • 1 screen • Shared profiles",
    note_ne: "७२०प • १ स्क्रिन • शेयर प्रोफाइल",
    img: "assets/product-4.svg"
  },
  {
    id: "netflix-standard",
    name: "Netflix Standard (1 Month)",
    category: "netflix",
    price: 1050,
    price_usd: 7,
    tier: "Standard Plan",
    availability: "In stock",
    note: "1080p • 2 screens • Instant code",
    note_ne: "१०८०प • २ स्क्रिन • द्रुत डेलिभरी",
    img: "assets/product-1.svg"
  },
  {
    id: "netflix-premium",
    name: "Netflix Premium (1 Month)",
    category: "netflix",
    price: 1450,
    price_usd: 9.7,
    tier: "Premium Plan",
    availability: "In stock",
    note: "4K + HDR • 4 screens • Private profile",
    note_ne: "४के + एचडीआर • ४ स्क्रिन • निजी प्रोफाइल",
    img: "assets/product-5.svg"
  },
  {
    id: "netflix-premium-3",
    name: "Premium - 3 Months",
    category: "subscriptions",
    price: 4200,
    price_usd: 28,
    tier: "Long term savings",
    availability: "Promo stock",
    note: "Save more • Delivery within 24h",
    note_ne: "थोरै भुक्तानी • २४ घण्टामा डेलिभरी",
    img: "assets/product-3.svg"
  },
  {
    id: "netflix-premium-6",
    name: "Premium - 6 Months",
    category: "subscriptions",
    price: 8200,
    price_usd: 55,
    tier: "Long term savings",
    availability: "Pre-order",
    note: "Best value • Rs. +280 dependency",
    note_ne: "सबैभन्दा आर्थिक • रु. +२८० निर्भरता",
    img: "assets/product-6.svg"
  },
  {
    id: "spotify-premium-3",
    name: "Spotify Premium (3 Months)",
    category: "spotify",
    price: 1199,
    price_usd: 8,
    tier: "Music bundle",
    availability: "In stock",
    note: "Unlimited downloads • Verified account",
    note_ne: "असीमित डाउनलोड • पुष्टिदृष्टि",
    img: "assets/product-2.svg"
  },
  {
    id: "gift-google-play",
    name: "Google Play Gift Card $10",
    category: "gift",
    price: 1550,
    price_usd: 10,
    tier: "Gift card",
    availability: "Global stock",
    note: "US region • Instant code",
    note_ne: "यूएस क्षेत्र • तुरुन्त कोड",
    img: "assets/product-7.svg"
  }
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

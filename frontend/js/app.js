/* === Banner Config (edit later easily) === */
const BANNERS = [
  {
    title: "Premium subscriptions in Nepal",
    sub: "Netflix, Canva, ChatGPT, and more",
    link: "category.html?c=subscriptions"
  },
  {
    title: "WordPress plugins and SEO tools",
    sub: "Speed, security, and conversion upgrades",
    link: "category.html?c=wp-plugins"
  },
  {
    title: "Modern WordPress themes",
    sub: "Blog, news, and store-ready templates",
    link: "category.html?c=wp-themes"
  },
  {
    title: "Netflix plans and profiles",
    sub: "Affordable access with instant activation",
    link: "category.html?c=netflix"
  },
  {
    title: "Web development packages",
    sub: "Custom builds for businesses",
    link: "category.html?c=web-development"
  }
];

// --- Checkout config (replace with your real details) ---
// WhatsApp number must include country code, no + or spaces. Example Nepal: 97798XXXXXXXX
let WHATSAPP_NUMBER = "9779800000000";
// Replace this with your real QR image path (put your QR inside /assets)
let ESEWA_QR_IMAGE = "assets/esewa-qr-placeholder.svg";

const API_BASE = (localStorage.getItem("SPK_API_BASE") || window.API_BASE || "").trim().replace(/\/$/, "");
  const ILM_STORE_API = "https://store.ilovemithila.com/wp-json/wc/store";
  const ILM_PROXY_BASE = API_BASE ? `${API_BASE}/api/public/ilm` : "";

const CATEGORY_ORDER = [
  "freefire",
  "pubg",
  "gift",
  "subscriptions",
  "spotify",
  "social",
  "gears",
  "netflix",
  "wp-plugins",
  "wp-themes",
  "ecommerce",
  "vpn",
  "web-development"
];

const CATEGORY_NOTES = {
  "freefire": "Top up diamonds instantly with instant delivery.",
  "pubg": "Global PUBG UC pins and fast UID top-ups.",
  "gift": "Gift cards, credits, and promo codes for apps.",
  "subscriptions": "Premium subscriptions with instant activation.",
  "spotify": "Spotify Premium, family, and student plans.",
  "social": "Social media coins, boosters, and growth packs.",
  "gears": "Gaming gears, mice, headsets, and keyboards.",
  "netflix": "Netflix profiles and streaming bundles.",
  "wp-plugins": "GPL plugins for SEO, caching, and security.",
  "wp-themes": "Themes ready for news, blogs, and shops.",
  "ecommerce": "WooCommerce-ready templates and bundles.",
  "vpn": "VPN services for private browsing and streaming.",
  "web-development": "Turnkey web development toolkits."
};

const ILM_CATEGORY_SLUG_MAP = {
  "subscription": "subscriptions",
  "wordpress-plugins": "wp-plugins",
  "wordpress-themes": "wp-themes",
  "ecommerce-themes-plugins": "ecommerce",
  "vpn-in-nepal": "vpn",
  "web-development": "web-development"
};

const DEFAULT_CATEGORIES = [
  { id:"freefire", name:"Free Fire Top Up", tag:"Top up diamonds instantly", icon:"FF" },
  { id:"pubg", name:"PUBG UC", tag:"UC pins & UID top-up", icon:"PG" },
  { id:"gift", name:"Gift Cards", tag:"Steam, Google Play & more", icon:"GC" },
  { id:"subscriptions", name:"Subscriptions", tag:"Premium tools and streaming", icon:"SUB" },
  { id:"spotify", name:"Spotify", tag:"Premium plans & top-ups", icon:"SP" },
  { id:"social", name:"Social Media Boost", tag:"Coins, credits & boosts", icon:"SM" },
  { id:"gears", name:"Gaming Gears", tag:"Mice, headsets, keyboards", icon:"GG" },
  { id:"netflix", name:"Netflix", tag:"Plans and profiles", icon:"NF" },
  { id:"wp-plugins", name:"WP Plugins", tag:"SEO, cache, security tools", icon:"PL" },
  { id:"wp-themes", name:"WP Themes", tag:"Blog, news, and shop themes", icon:"TH" },
  { id:"ecommerce", name:"eCommerce", tag:"WooCommerce-ready package", icon:"EC" },
  { id:"vpn", name:"VPN", tag:"Secure browsing plans", icon:"VPN" },
  { id:"web-development", name:"Web Development", tag:"Custom website builds", icon:"WEB" }
];

const DEFAULT_PRODUCTS = [];

const LAZY_IMAGE_PLACEHOLDER = "assets/product-1.svg";
const LAZY_IMAGE_MARGIN = "140px";

const lazyObserver = typeof IntersectionObserver !== "undefined"
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadLazyImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: LAZY_IMAGE_MARGIN })
  : null;

function loadLazyImage(img) {
  if (!img || img.dataset.loaded) return;
  const src = img.dataset.src;
  if (src) img.src = src;
  const srcset = img.dataset.srcset;
  if (srcset) img.srcset = srcset;
  img.dataset.loaded = "1";
  img.classList.add("loaded");
}

function initLazyImages(root = document) {
  const images = Array.from((root || document).querySelectorAll("img.lazy[data-src]"));
  images.forEach((img) => {
    if (img.dataset.loaded) return;
    if (!img.getAttribute("src")) img.src = LAZY_IMAGE_PLACEHOLDER;
    if (lazyObserver) {
      lazyObserver.observe(img);
    } else {
      loadLazyImage(img);
    }
  });
}

function lazyImage(src, alt = "", extraCls = "") {
  const safeSrc = escapeHtml(src || LAZY_IMAGE_PLACEHOLDER);
  const safeAlt = escapeHtml(alt || "");
  const classes = ["lazy", extraCls].filter(Boolean).join(" ");
  return `<img class="${classes}" loading="lazy" decoding="async" src="${LAZY_IMAGE_PLACEHOLDER}" data-src="${safeSrc}" alt="${safeAlt}">`;
}

function decodeHtmlEntities(value){
  let s = String(value || "");
  s = s.replace(/&amp;/g, "&")
       .replace(/&#038;/g, "&")
       .replace(/&#8211;/g, "-")
       .replace(/&#8212;/g, "-")
       .replace(/&#8217;/g, "'")
       .replace(/&#8220;/g, "\"")
       .replace(/&#8221;/g, "\"")
       .replace(/\u2013/g, "-")
       .replace(/\u2014/g, "-")
       .replace(/\u2018/g, "'")
       .replace(/\u2019/g, "'")
       .replace(/\u201C/g, "\"")
       .replace(/\u201D/g, "\"");
  return s;
}

function isAscii(value){
  return /^[\x20-\x7E]*$/.test(String(value || ""));
}
async function loadPublicSettings(){
  try{
    const res = await fetch(`${API_BASE}/api/public/settings`);
    if(!res.ok) return;
    const s = await res.json();
    if(s.whatsapp_number) WHATSAPP_NUMBER = String(s.whatsapp_number).trim();
    if(s.esewa_qr_url){
      ESEWA_QR_IMAGE = s.esewa_qr_url.startsWith("http") ? s.esewa_qr_url : `${API_BASE}${s.esewa_qr_url}`;
    }
    // If QR already rendered, update it
    document.querySelectorAll(".qrWrap img").forEach(img => { img.src = ESEWA_QR_IMAGE; });
  }catch(e){
    // silent
  }
}

// ---------- Testimonials (homepage) ----------
function fmtDateShort(iso){
  if(!iso) return "";
  try{
    // SQLite datetime('now') format: YYYY-MM-DD HH:MM:SS
    const d = new Date(String(iso).replace(" ", "T") + "Z");
    if(isNaN(d.getTime())) return String(iso);
    return d.toISOString().slice(0,10);
  }catch(_){
    return String(iso);
  }
}

function starsHtml(rating){
  const r = parseInt(rating,10);
  if(!r || r < 1 || r > 5) return "";
  const filled = "?".repeat(r);
  const empty = "?".repeat(5-r);
  return `<span class="stars" aria-label="${r} out of 5">`+
         `${[...filled].map(()=>`<span class="star">?</span>`).join("")}`+
         `${[...empty].map(()=>`<span class="star" style="opacity:.35">?</span>`).join("")}`+
         `</span>`;
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadTestimonials(){
  const host = document.getElementById("testimonialsList");
  if(!host) return;
  try{
    const res = await fetch(`${API_BASE}/api/public/feedback?limit=3`);
    if(!res.ok) return;
    const rows = await res.json();
    if(!Array.isArray(rows) || rows.length === 0) return;

    host.innerHTML = rows.map(r => {
      const who = (r.name && String(r.name).trim()) ? String(r.name).trim() : "Customer";
      const msg = escapeHtml(r.message || "");
      const when = fmtDateShort(r.created_at);
      const meta = `${starsHtml(r.rating)}${when ? `<span class="when">${escapeHtml(when)}</span>` : ""}`;
      return `
        <div class="quote">
          <p>"${msg}"</p>
          <div class="who">- ${escapeHtml(who)}</div>
          ${meta ? `<div class="metaLine">${meta}</div>` : ""}
        </div>
      `;
    }).join("");
  }catch(e){
    // silent
  }
}

const STORE_KEY = "softupakaran_cart_v1";

let categories = DEFAULT_CATEGORIES.slice();

let products = DEFAULT_PRODUCTS.slice();

function formatNPR(n){
  // simple format: Rs. 1,234
  const s = String(Math.round(n));
  return "Rs. " + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function loadCart(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }catch{ return []; }
}
function saveCart(items){
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
  updateCartCount();
}
function cartCount(){
  return loadCart().reduce((sum, it) => sum + (it.qty || 0), 0);
}
function updateCartCount(){
  const el = document.querySelector("[data-cart-count]");
  if(el) el.textContent = cartCount();
}

function addToCart(productId, qty=1){
  const cart = loadCart();
  const existing = cart.find(x => x.id === productId);
  if(existing) existing.qty += qty;
  else cart.push({ id: productId, qty });
  saveCart(cart);
}

function setQty(productId, qty){
  const cart = loadCart().map(x => x.id === productId ? ({...x, qty}) : x).filter(x => x.qty > 0);
  saveCart(cart);
}

function cartLines(){
  const cart = loadCart();
  return cart
    .map(line => {
      const p = products.find(x => x.id === line.id);
      if(!p) return null;
      return { ...p, qty: line.qty, lineTotal: p.price * line.qty };
    })
    .filter(Boolean);
}

function cartTotal(){
  return cartLines().reduce((sum, l) => sum + l.lineTotal, 0);
}

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function ensureVisible(root=document){
  $all(".card, .product-card, .product-item", root)
    .forEach(el => el.classList.add("in-view"));
  initLazyImages(root);
}


function renderCategories(){
  const root = document.querySelector("[data-categories]");
  if(!root) return;
  root.innerHTML = categories.map(c => `
    <a class="card" href="category.html?c=${encodeURIComponent(c.id)}" aria-label="${c.name}">
      <div class="pad">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:14px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:18px">${c.icon}</div>
          <div>
            <p class="cardTitle">${c.name}</p>
            <p class="cardMeta">${c.tag}</p>
          </div>
        </div>
      </div>
    </a>
  `).join("");
  ensureVisible(root);
}

function productCard(p){
  return `
  <div class="card">
    <a href="product.html?id=${encodeURIComponent(p.id)}" class="thumb">
      ${lazyImage(p.img, p.name)}
    </a>
    <div class="pad">
      <p class="cardTitle">${p.name}</p>
      <p class="cardMeta">${p.note}</p>
      <div class="price">
        <span>${formatNPR(p.price)}</span>
        <button class="btn primary" data-add="${p.id}">Add</button>
      </div>
    </div>
  </div>
  `;
}

function wireAddButtons(root=document){
  $all("[data-add]", root).forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      addToCart(btn.getAttribute("data-add"), 1);
      openCart();
    });
  });
}

const CURATED_CONFIG = [
  {
    attr: "subscriptions",
    categories: ["subscriptions", "netflix"],
    fallback: "More subscriptions arriving soon.",
  },
  {
    attr: "wp-plugins",
    categories: ["wp-plugins", "wp-themes"],
    fallback: "More tools and themes loading shortly.",
  },
];

function renderCuratedSections(){
  CURATED_CONFIG.forEach((cfg) => {
    const root = document.querySelector(`[data-curated="${cfg.attr}"]`);
    if(!root) return;
    const items = products.filter(p => cfg.categories.includes(p.category)).slice(0, 6);
    if(items.length){
      root.innerHTML = items.map(productCard).join("");
      wireAddButtons(root);
      ensureVisible(root);
    } else {
      root.innerHTML = `
        <div class="card" style="grid-column:1/-1">
          <div class="pad">
            <p class="cardTitle">Loading curated picks</p>
            <p class="cardMeta">${cfg.fallback}</p>
          </div>
        </div>
      `;
    }
  });
}

function refreshHomeSections(){
  renderCuratedSections();
  renderPopular();
  renderCategoryPage();
  renderProductPage();
}

function renderPopular(){
  const root = document.querySelector("[data-popular]");
  if(!root) return;
  const items = products.slice(0, 8);
  root.innerHTML = items.map(productCard).join("");
  wireAddButtons(root);
  ensureVisible(root);
}

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function renderCategoryPage(){
  const root = document.querySelector("[data-category-products]");
  if(!root) return;
  const id = getParam("c") || "subscriptions";
  const cat = categories.find(x => x.id === id);
  document.title = `${cat ? cat.name : "Category"} - SoftUpakaran`;
  const header = document.querySelector("[data-category-title]");
  if(header) header.textContent = cat ? cat.name : "Category";
  const filtered = products.filter(p => p.category === id);
  root.innerHTML = filtered.length ? filtered.map(productCard).join("") : `
    <div class="card"><div class="pad">
      <p class="cardTitle">No items yet</p>
      <p class="cardMeta">Add your real products later in <span class="small">js/app.js</span>.</p>
    </div></div>`;
  wireAddButtons(root);
  ensureVisible(root);
}

function renderProductPage(){
  const root = document.querySelector("[data-product]");
  if(!root) return;
  const id = getParam("id") || "p1";
  const p = products.find(x => x.id === id) || products[0];
  if(!p){
    root.innerHTML = `
      <div class="card"><div class="pad">
        <p class="cardTitle">Loading product...</p>
        <p class="cardMeta">Fetching details from the catalog.</p>
      </div></div>`;
    loadProductById(id).then((result) => {
      if(result) renderProductPage();
    });
    return;
  }
  document.title = `${p.name} - SoftUpakaran`;
  const heroContent = `
    <div class="heroGrid">
      <div class="heroCard">
        <div class="thumb" style="aspect-ratio: 16/11">
          ${lazyImage(p.img, p.name, "hero-img")}
        </div>
      </div>
      <div class="heroCard">
        <div class="inner">
          <div class="kicker">Digital Delivery</div>
          <div class="h1" style="margin-top:10px">${p.name}</div>
          <p class="sub">${p.note}. After payment, share your account email/ID or site URL on WhatsApp. We deliver within 5-30 minutes.</p>
          <div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div class="badge">${formatNPR(p.price)}</div>
            <div class="small">Secure checkout - Support chat</div>
          </div>
          <div class="heroActions">
            <button class="btn primary" id="buyNow">Add to cart</button>
            <a class="btn" href="category.html?c=${encodeURIComponent(p.category)}">Back to category</a>
          </div>
          <div style="margin-top:18px">
            <div class="feature">
              <h3>Steps</h3>
              <p>1) Choose plan - 2) Share details - 3) Pay - 4) Get delivery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  root.innerHTML = heroContent + renderRelatedSection(p);
  $("#buyNow")?.addEventListener("click", () => { addToCart(p.id, 1); openCart(); });
  ensureVisible(root);
  initLazyImages(root);
}

function relatedCard(p){
  return `
    <a class="related-card" href="product.html?id=${encodeURIComponent(p.id)}">
      <div class="thumb">
        ${lazyImage(p.img, p.name)}
      </div>
      <p class="title">${escapeHtml(p.name)}</p>
      <p class="price">${formatNPR(p.price)}</p>
    </a>
  `;
}

function renderRelatedSection(current){
  if(!current) return "";
  const related = products
    .filter(p => p.category === current.category && p.id !== current.id)
    .slice(0, 4);
  if(!related.length) return "";
  return `
    <section class="related-section">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <h3>You may also like</h3>
        <a class="btn icon" href="category.html?c=${encodeURIComponent(current.category)}">View category</a>
      </div>
      <div class="related-grid">
        ${related.map(relatedCard).join("")}
      </div>
    </section>
  `;
}

const backendProductCache = new Map();

function transformBackendProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category_id,
    price: row.price_npr,
    img: row.image || "assets/product-1.svg",
    note: row.note || "Instant delivery"
  };
}

async function loadProductById(id) {
  if (!id || !API_BASE) return null;
  if (backendProductCache.has(id)) return backendProductCache.get(id);

  const promise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const row = await res.json();
      const product = transformBackendProduct(row);
      if (!product) return null;
      const existing = products.findIndex((p) => p.id === product.id);
      if (existing >= 0) {
        products[existing] = product;
      } else {
        products.push(product);
      }
      return product;
    } catch (_) {
      return null;
    } finally {
      backendProductCache.delete(id);
    }
  })();

  backendProductCache.set(id, promise);
  return promise;
}

function buildCartModal(){
  const backdrop = document.querySelector("[data-cart-modal]");
  if(!backdrop) return;
  const closeBtns = backdrop.querySelectorAll("[data-cart-close]");
  closeBtns.forEach(b => b.addEventListener("click", closeCart));
  backdrop.addEventListener("click", (e) => { if(e.target === backdrop) closeCart(); });

  // allow ESC
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeCart(); });
}

function openCart(){
  const backdrop = document.querySelector("[data-cart-modal]");
  if(!backdrop) return;
  renderCart();
  backdrop.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeCart(){
  const backdrop = document.querySelector("[data-cart-modal]");
  if(!backdrop) return;
  backdrop.style.display = "none";
  document.body.style.overflow = "";
}

function renderCart(){
  const backdrop = document.querySelector("[data-cart-modal]");
  if(!backdrop) return;
  const body = backdrop.querySelector("[data-cart-body]");
  const footer = backdrop.querySelector("[data-cart-footer]");
  const lines = cartLines();

  if(!lines.length){
    body.innerHTML = `<div class="card"><div class="pad">
      <p class="cardTitle">Your cart is empty</p>
      <p class="cardMeta">Add some products to continue.</p>
    </div></div>`;
    footer.innerHTML = `<div class="notice">Tip: click Add on any product.</div>
      <button class="btn primary" data-cart-close>Continue shopping</button>`;
    footer.querySelector("[data-cart-close]")?.addEventListener("click", closeCart);
    updateCartCount();
    return;
  }

  body.innerHTML = lines.map(l => `
    <div class="cartRow">
      ${lazyImage(l.img, l.name, "cart-thumb")}
      <div>
        <p class="name">${l.name}</p>
        <p class="desc">${formatNPR(l.price)} - ${l.note}</p>
      </div>
      <div class="qty">
        <button aria-label="Decrease" data-dec="${l.id}">-</button>
        <span>${l.qty}</span>
        <button aria-label="Increase" data-inc="${l.id}">+</button>
      </div>
    </div>
  `).join("") + `

    <div class="payGrid" style="margin-top:14px">
      <div class="payCard">
        <h4>Pay via eSewa QR</h4>
        <p>Scan the QR to pay. Then click <b>Checkout</b> to send proof on WhatsApp.</p>
        <div class="qrWrap">
          <img src="${ESEWA_QR_IMAGE}" alt="eSewa QR" loading="lazy" decoding="async">
        </div>
      </div>

      <div class="payCard">
        <h4>WhatsApp Support</h4>
        <p>Send your cart details to WhatsApp. We will confirm price and deliver instantly.</p>
        <button class="btn" data-inline-wa>Open WhatsApp</button>
        <div class="small" style="margin-top:10px">Number: <span class="mono">${WHATSAPP_NUMBER}</span></div>
      </div>
    </div>
  `;

  initLazyImages(body);

  footer.innerHTML = `
    <div>
      <div class="tot">Total: ${formatNPR(cartTotal())}</div>
      <div class="notice">Demo checkout only (no payment). Replace later with real gateway.</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
      <button class="btn" data-clear>Clear</button>
      <button class="btn primary" data-checkout>Checkout</button>
    </div>
  `;

  body.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
    const id = b.getAttribute("data-inc");
    const line = loadCart().find(x => x.id === id);
    setQty(id, (line?.qty || 0) + 1);
    renderCart();
  }));
  body.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
    const id = b.getAttribute("data-dec");
    const line = loadCart().find(x => x.id === id);
    setQty(id, Math.max(0, (line?.qty || 0) - 1));
    renderCart();
  }));

  
  body.querySelector("[data-inline-wa]")?.addEventListener("click", async () => {
    await sendOrderToBackend("User opened WhatsApp checkout from cart");
    const msg = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    window.open(url, "_blank");
  });

footer.querySelector("[data-clear]")?.addEventListener("click", () => { saveCart([]); renderCart(); });
  footer.querySelector("[data-checkout]")?.addEventListener("click", () => {
    openPayModal();
  });

updateCartCount();
}

function wireCartButtons(){
  document.querySelectorAll("[data-open-cart]").forEach(b => b.addEventListener("click", (e) => {
    e.preventDefault();
    openCart();
  }));
}

function wireSearch(){
  document.querySelectorAll("[data-search]").forEach((input) => {
    if(!input) return;
    const dropdown = input.closest(".search")?.querySelector("[data-search-dropdown]");
    let suggestions = [];
    let activeIndex = -1;
    let blurTimer = null;
    const root = document.querySelector("[data-popular]");

    const hideDropdown = () => {
      if(!dropdown) return;
      dropdown.classList.remove("visible");
      activeIndex = -1;
    };

    const setActive = (index) => {
      if(index < 0) index = -1;
      if(!dropdown) return;
      activeIndex = index;
      const buttons = dropdown.querySelectorAll(".search-dropdown-item");
      buttons.forEach((btn, i) => btn.classList.toggle("active", i === index));
    };

    const renderDropdown = (items, query) => {
      if(!dropdown) return;
      if(!query){
        dropdown.innerHTML = "";
        hideDropdown();
        return;
      }
      if(!items.length){
        dropdown.innerHTML = `<div class="search-dropdown-empty">No results for "${escapeHtml(query)}"</div>`;
        dropdown.classList.add("visible");
        suggestions = [];
        activeIndex = -1;
        return;
      }
      suggestions = items;
      activeIndex = -1;
      dropdown.innerHTML = items.map((p, idx) => `
        <button type="button" class="search-dropdown-item" data-search-id="${encodeURIComponent(p.id)}" data-search-index="${idx}">
          <span>${escapeHtml(p.name)}</span>
          <small>${formatNPR(p.price)}</small>
        </button>
      `).join("");
      dropdown.classList.add("visible");
    };

    const updateResults = () => {
      const q = input.value.trim().toLowerCase();
      if(!root) return;
      const filtered = q ? products.filter(p => p.name.toLowerCase().includes(q)) : [];
      const gridItems = filtered.slice(0, 8);
      root.innerHTML = gridItems.length ? gridItems.map(productCard).join("") : `
        <div class="card" style="grid-column:1/-1"><div class="pad">
          <p class="cardTitle">No matches</p>
          <p class="cardMeta">Try a different keyword.</p>
        </div></div>
      `;
      wireAddButtons(root);
      ensureVisible(root);
      renderDropdown(filtered.slice(0, 6), q);
    };

    input.addEventListener("input", updateResults);
    input.addEventListener("focus", () => {
      if(blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      if(suggestions.length && dropdown){
        dropdown.classList.add("visible");
      }
    });
    input.addEventListener("blur", () => {
      blurTimer = setTimeout(() => hideDropdown(), 180);
    });

    input.addEventListener("keydown", (e) => {
      if(!dropdown || !dropdown.classList.contains("visible") || !suggestions.length) return;
      if(e.key === "ArrowDown"){
        e.preventDefault();
        setActive((activeIndex + 1) % suggestions.length);
      } else if(e.key === "ArrowUp"){
        e.preventDefault();
        setActive((activeIndex + suggestions.length - 1) % suggestions.length);
      } else if(e.key === "Enter"){
        if(activeIndex >= 0 && activeIndex < suggestions.length){
          e.preventDefault();
          const target = suggestions[activeIndex];
          if(target){
            window.location.href = `product.html?id=${encodeURIComponent(target.id)}`;
          }
        }
      } else if(e.key === "Escape"){
        hideDropdown();
      }
    });

    document.addEventListener("click", (e) => {
      if(!dropdown) return;
      if(!e.target.closest(".search")){
        hideDropdown();
      }
    });

    dropdown?.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    dropdown?.addEventListener("click", (e) => {
      const btn = (e.target.closest ? e.target.closest("[data-search-id]") : null);
      if(btn){
        const id = btn.getAttribute("data-search-id");
        if(id){
          window.location.href = `product.html?id=${encodeURIComponent(id)}`;
        }
      }
    });
  });
}

// --- Payment / Checkout ---

async function sendOrderToBackend(extraNote){
  try{
    const lines = cartLines();
    if(!lines || !lines.length) return;

    const total = cartTotal();
    const payload = {
      source: "softupakaran-web",
      items: lines.map(l => ({
        id: l.id,
        name: l.name,
        qty: l.qty,
        lineTotal: l.lineTotal
      })),
      totalNpr: total,
      extraNote: extraNote || null
    };

    // If your backend is on another host/port, change this URL.
    await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }catch(err){
    console.error("Failed to send order to backend:", err);
  }
}


function buildWhatsAppMessage(){
  const lines = cartLines();
  const total = cartTotal();
  const items = lines.map(l => `- ${l.name} x${l.qty} = ${formatNPR(l.lineTotal)}`).join("\\n");
  return `Hello SoftUpakaran,\n\nI want to order:\n${items}\n\nTotal: ${formatNPR(total)}\n\nPlease guide me for payment & delivery.`;
}

function openPayModal(){
  const backdrop = document.querySelector("[data-pay-modal]");
  if(!backdrop) return;

  const body = backdrop.querySelector("[data-pay-body]");
  const footer = backdrop.querySelector("[data-pay-footer]");
  const total = cartTotal();

  body.innerHTML = `
    <div class="payGrid">
      <div class="payCard">
        <h4>Pay via WhatsApp</h4>
        <p>Send your cart details to WhatsApp. We can confirm price and deliver instantly.</p>
        <button class="btn primary" data-pay-wa>Open WhatsApp</button>
        <div class="small" style="margin-top:10px">Tip: replace number in <span class="small">js/app.js</span></div>
      </div>

      <div class="payCard">
        <h4>Pay via eSewa QR</h4>
        <p>Scan the QR and then send the payment screenshot on WhatsApp.</p>
        <div class="qrWrap">
          <img src="${ESEWA_QR_IMAGE}" alt="eSewa QR">
        </div>
        <div class="heroActions" style="margin-top:12px">
          <button class="btn" data-pay-copy>Total: ${formatNPR(total)}</button>
          <button class="btn" data-pay-after>Paid (send proof)</button>
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <div class="notice">This is a demo checkout flow. Replace with real gateway/API when ready.</div>
    <button class="btn" data-pay-close>Close</button>
  `;

  backdrop.querySelectorAll("[data-pay-close]").forEach(b => b.addEventListener("click", closePayModal));

  backdrop.querySelector("[data-pay-wa]")?.addEventListener("click", async () => {
    await sendOrderToBackend("User opened WhatsApp checkout from pay modal");
    const msg = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    window.open(url, "_blank");
  });

  backdrop.querySelector("[data-pay-copy]")?.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(`Total: ${formatNPR(total)}`);
      alert("Total copied.");
    }catch{
      alert(`Total: ${formatNPR(total)}`);
    }
  });

  backdrop.querySelector("[data-pay-after]")?.addEventListener("click", async () => {
    await sendOrderToBackend("User clicked Paid (eSewa QR)");
    const msg = encodeURIComponent(buildWhatsAppMessage() + "\n\nI have paid via eSewa QR. Here is my proof.");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    window.open(url, "_blank");
  });

  backdrop.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closePayModal(){
  const backdrop = document.querySelector("[data-pay-modal]");
  if(!backdrop) return;
  backdrop.style.display = "none";
  document.body.style.overflow = "";
}

function wirePayModal(){
  const backdrop = document.querySelector("[data-pay-modal]");
  if(!backdrop) return;
  backdrop.addEventListener("click", (e) => { if(e.target === backdrop) closePayModal(); });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closePayModal(); });
  backdrop.querySelectorAll("[data-pay-close]").forEach(b => b.addEventListener("click", closePayModal));
}



async function loadCatalogFromApi(){
  let didLoadProducts = false;
  try{
    const [catsRes, prodsRes] = await Promise.all([
      fetch(`${API_BASE}/api/categories`),
      fetch(`${API_BASE}/api/products?limit=500&offset=0&sort=name_asc`)
    ]);

    if (catsRes.ok){
      const cats = await catsRes.json();
      if(Array.isArray(cats) && cats.length){
        categories = cats;
      }
    }

    if (prodsRes.ok){
      const rows = await prodsRes.json();
    if(Array.isArray(rows) && rows.length){
      products = rows.map(transformBackendProduct);
      didLoadProducts = true;
    }
  }
  }catch(e){
    // fallback to static arrays
  }
  return didLoadProducts;
}

  async function loadCatalogFromIlmStore(){
    async function tryBase(base){
      const [catsRes, prodsRes] = await Promise.all([
        fetch(`${base}/products/categories?per_page=100`),
        fetch(`${base}/products?per_page=100&_fields=id,name,prices,images,categories`)
      ]);
      if (!catsRes.ok || !prodsRes.ok) return null;
      const rawCats = await catsRes.json();
      const rawProds = await prodsRes.json();
      return { rawCats, rawProds };
    }

    const bases = [];
    if (ILM_PROXY_BASE) bases.push(ILM_PROXY_BASE);
    bases.push(ILM_STORE_API);

    try{
      let payload = null;
      for (const base of bases){
        try {
          payload = await tryBase(base);
          if (payload) break;
        } catch (_) {
          // try next base
        }
      }
      if (!payload) return false;

      const rawCats = payload.rawCats;
      const rawProds = payload.rawProds;
    const byId = {};

    DEFAULT_CATEGORIES.forEach(c => { byId[c.id] = { ...c }; });

    if(Array.isArray(rawCats)){
      rawCats.forEach(c => {
        const mappedId = ILM_CATEGORY_SLUG_MAP[c.slug];
        if(!mappedId || !byId[mappedId]) return;
        const decodedName = decodeHtmlEntities(c.name);
        if(decodedName && isAscii(decodedName)) byId[mappedId].name = decodedName.trim();
        if(c.description){
          const desc = decodeHtmlEntities(c.description).replace(/\s+/g, " ").trim();
          if(desc && isAscii(desc)) byId[mappedId].tag = desc;
        }
      });
    }

    categories = CATEGORY_ORDER.map(id => byId[id]).filter(Boolean);

    if(Array.isArray(rawProds) && rawProds.length){
      products = rawProds.map(p => {
        const catSlug = (p.categories && p.categories[0]) ? p.categories[0].slug : "subscription";
        let categoryId = ILM_CATEGORY_SLUG_MAP[catSlug] || "subscriptions";
        const decodedName = decodeHtmlEntities(p.name);
        if (/netflix/i.test(decodedName)) categoryId = "netflix";
        const priceMinor = Number(p.prices && p.prices.price) || 0;
        const price = Math.round(priceMinor / 100);
        return {
          id: `ilm-${p.id}`,
          name: decodedName,
          category: categoryId,
          price: price,
          img: (p.images && p.images[0] && p.images[0].src) ? p.images[0].src : "assets/product-1.svg",
          note: CATEGORY_NOTES[categoryId] || "Instant delivery"
        };
      });
    }
    return true;
  }catch(e){
    return false;
  }
}

async function init(){
  renderCategories();
  refreshHomeSections();
  await loadPublicSettings();
  const loaded = await loadCatalogFromApi();
  if(!loaded){
    await loadCatalogFromIlmStore();
  }
  if(!Array.isArray(categories) || !categories.length){
    categories = DEFAULT_CATEGORIES.slice();
  }
  if(!Array.isArray(products) || !products.length){
    products = DEFAULT_PRODUCTS.slice();
  }
  await loadTestimonials();
  updateCartCount();
  renderCategories();
  refreshHomeSections();
  buildCartModal();
  wirePayModal();
  wireCartButtons();
  wireSearch();

  // pills dynamic
  const pills = document.querySelector("[data-pills]");
  if(pills){
    pills.innerHTML = categories.map(c => `<a class="pill" href="category.html?c=${encodeURIComponent(c.id)}">${c.name}</a>`).join("");
  }

  // hero CTA
  document.querySelectorAll("[data-go-popular]").forEach(b => b.addEventListener("click", () => {
    document.querySelector("#popular")?.scrollIntoView({behavior:"smooth"});
  }));
}

document.addEventListener("DOMContentLoaded", init);


/* === HERO SLIDER (Clickable + Text) === */
(function(){
  const slider=document.querySelector("[data-hero-slider]");
  if(!slider) return;

  const track=slider.querySelector(".heroSliderTrack");
  const slides=[...track.children];
  const dots=slider.querySelector(".heroDots");
  const title=document.querySelector("[data-banner-title]");
  const sub=document.querySelector("[data-banner-sub]");
  let i=0;

  slides.forEach((slide,idx)=>{
    slide.style.cursor="pointer";
    slide.onclick=()=>location.href=BANNERS[idx]?.link || "#";
    const d=document.createElement("div");
    d.className="heroDot"+(idx===0?" active":"");
    d.onclick=(e)=>{ e.stopPropagation(); go(idx); };
    dots.appendChild(d);
  });

  function updateText(){
    if(!BANNERS[i]) return;
    title.textContent=BANNERS[i].title;
    sub.textContent=BANNERS[i].sub;
  }

  function go(n){
    i=n;
    track.style.transform=`translateX(${-i*100}%)`;
    dots.querySelectorAll(".heroDot").forEach((d,di)=>d.classList.toggle("active",di===i));
    updateText();
  }

  updateText();
  setInterval(()=>go((i+1)%slides.length),4500);
})();


/* === Feedback Widget === */
function mountFeedback(){
  const btn = document.createElement("button");
  btn.className = "feedbackButton";
  btn.setAttribute("type","button");
  btn.innerHTML = "?? Feedback";
  document.body.appendChild(btn);

  const overlay = document.createElement("div");
  overlay.className = "feedbackOverlay";
  overlay.innerHTML = `
    <div class="feedbackCard">
      <div class="feedbackHeader">
        <div class="feedbackTitle">Share your feedback</div>
        <button class="feedbackClose" aria-label="Close">x</button>
      </div>
      <div class="feedbackForm" role="form">
        <label>Rating</label>
        <div class="starRow" data-stars="">
          ${[1,2,3,4,5].map(i => `<span class="star" data-val="${i}">?</span>`).join("")}
        </div>
        <label>Message</label>
        <textarea rows="4" placeholder="What can we improve?" data-fb-msg=""></textarea>
        <div class="feedbackActions">
          <button class="btn secondary" type="button" data-fb-cancel="">Cancel</button>
          <button class="btn primary" type="button" data-fb-submit="">Send</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let rating = 0;
  function setRating(n){
    rating = n;
    overlay.querySelectorAll(".star").forEach(s => {
      s.dataset.active = Number(Number(s.dataset.val) <= n);
    });
  }
  overlay.querySelectorAll(".star").forEach(s => s.addEventListener("click", () => setRating(Number(s.dataset.val))));
  const open = () => { overlay.dataset.open = "1"; setRating(0); };
  const close = () => { overlay.dataset.open = "0"; };

  btn.addEventListener("click", open);
  overlay.querySelector(".feedbackClose").addEventListener("click", close);
  overlay.querySelector("[data-fb-cancel]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if(e.target === overlay) close(); });

  async function postJSON(url, data){
    try{
      const res = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) });
      return res.ok;
    }catch(_){ return false; }
  }

  overlay.querySelector("[data-fb-submit]").addEventListener("click", async () => {
    const msg = overlay.querySelector("[data-fb-msg]").value.trim();
    if(!msg && !rating){ alert("Please add a message or a rating."); return; }

    const payload = { rating, message: msg, page: location.pathname, ua: navigator.userAgent };
    // Try optional API endpoint (if available), otherwise fallback to WhatsApp
    let ok = false;
    if(typeof API_BASE === "string" && API_BASE){
      ok = await postJSON(`${API_BASE}/api/public/feedback`, payload);
    }
    if(!ok && typeof WHATSAPP_NUMBER === "string" && WHATSAPP_NUMBER){
      const text = `Feedback%0A${location.href}%0A?: ${rating}%0A${encodeURIComponent(msg)}`;
      const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g,"")}?text=${text}`;
      window.open(url, "_blank");
      ok = true; // treat as sent
    }
    try{ localStorage.setItem("SPK_LAST_FEEDBACK", JSON.stringify(payload)); }catch(_){}
    alert(ok ? "Thanks! Your feedback has been sent." : "Saved locally. Could not send right now.");
    close();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try{ mountFeedback(); }catch(e){ console.warn("Feedback widget failed:", e); }
});
/* === end Feedback Widget === */














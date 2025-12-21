/* === Banner Config (edit later easily) === */
const BANNERS = [
  {
    title: "Top up Steam Wallet instantly",
    sub: "Fast Steam gift cards • Secure payments",
    link: "category.html?c=gift"
  },
  {
    title: "Pay with eSewa • Instant Delivery",
    sub: "Official Nepal payments • Trusted service",
    link: "category.html?c=subs"
  },
  {
    title: "Free Fire Pins available",
    sub: "UID top-up • Fast processing: Nepal",
    link: "category.html?c=freefire"
  },
  {
    title: "UC Top Up for PUBG",
    sub: "Global UC • Secure & instant",
    link: "category.html?c=pubg"
  },
  {
    title: "Netflix & Subscriptions",
    sub: "Premium plans • Easy activation",
    link: "category.html?c=subs"
  }
];

// --- Checkout config (replace with your real details) ---
// WhatsApp number must include country code, no + or spaces. Example Nepal: 97798XXXXXXXX
let WHATSAPP_NUMBER = "9779800000000";
// Replace this with your real QR image path (put your QR inside /assets)
let ESEWA_QR_IMAGE = "assets/esewa-qr-placeholder.svg";

const API_BASE = (localStorage.getItem("SPK_API_BASE") || window.API_BASE).trim().replace(/\/$/, "");

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
  const filled = "★".repeat(r);
  const empty = "☆".repeat(5-r);
  return `<span class="stars" aria-label="${r} out of 5">`+
         `${[...filled].map(()=>`<span class="star">★</span>`).join("")}`+
         `${[...empty].map(()=>`<span class="star" style="opacity:.35">☆</span>`).join("")}`+
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
          <p>“${msg}”</p>
          <div class="who">— ${escapeHtml(who)}</div>
          ${meta ? `<div class="metaLine">${meta}</div>` : ""}
        </div>
      `;
    }).join("");
  }catch(e){
    // silent
  }
}

const STORE_KEY = "softupakaran_cart_v1";

let categories = [
  { id:"freefire", name:"Free Fire Top Up", tag:"Top up diamonds instantly", icon:"🔥" },
  { id:"pubg", name:"PUBG UC", tag:"UC pins & UID top-up", icon:"🎮" },
  { id:"gift", name:"Gift Cards", tag:"Steam, Google Play & more", icon:"🎁" },
  { id:"subs", name:"Subscriptions", tag:"Netflix, Spotify, Prime", icon:"⭐" },
  { id:"social", name:"Social Media Boost", tag:"Coins, credits & boosts", icon:"📣" },
  { id:"gears", name:"Gaming Gears", tag:"Mice, headsets, keyboards", icon:"🖱️" },
];

let products = [
  { id:"p1", name:"PUBG 60 UC (Global)", category:"pubg", price:157, img:"assets/product-1.svg", note:"Instant delivery • UID" },
  { id:"p2", name:"Free Fire Diamonds (Direct UID)", category:"freefire", price:80, img:"assets/product-2.svg", note:"Fast top-up • Secure" },
  { id:"p3", name:"Steam Wallet Code $10", category:"gift", price:1500, img:"assets/product-3.svg", note:"Digital code • US/Global" },
  { id:"p4", name:"Netflix Subscription (1 Month)", category:"subs", price:999, img:"assets/product-4.svg", note:"Easy activation" },
  { id:"p5", name:"Google Play Gift Card $5", category:"gift", price:750, img:"assets/product-5.svg", note:"US region" },
  { id:"p6", name:"MLBB Diamonds (1000+)", category:"pubg", price:800, img:"assets/product-6.svg", note:"UID + Zone" },
  { id:"p7", name:"TikTok Coins Pack", category:"social", price:350, img:"assets/product-7.svg", note:"Quick processing" },
  { id:"p8", name:"RGB Gaming Mouse (Budget)", category:"gears", price:1200, img:"assets/product-8.svg", note:"1 year warranty" },
];

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
}

function productCard(p){
  return `
  <div class="card">
    <a href="product.html?id=${encodeURIComponent(p.id)}" class="thumb">
      <img src="${p.img}" alt="${p.name}">
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

function renderPopular(){
  const root = document.querySelector("[data-popular]");
  if(!root) return;
  const items = products.slice(0, 8);
  root.innerHTML = items.map(productCard).join("");
  wireAddButtons(root);
}

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function renderCategoryPage(){
  const root = document.querySelector("[data-category-products]");
  if(!root) return;
  const id = getParam("c") || "gift";
  const cat = categories.find(x => x.id === id);
  document.title = `${cat ? cat.name : "Category"} • SoftUpakaran`;
  const header = document.querySelector("[data-category-title]");
  if(header) header.textContent = cat ? cat.name : "Category";
  const filtered = products.filter(p => p.category === id);
  root.innerHTML = filtered.length ? filtered.map(productCard).join("") : `
    <div class="card"><div class="pad">
      <p class="cardTitle">No items yet</p>
      <p class="cardMeta">Add your real products later in <span class="small">app.js</span>.</p>
    </div></div>`;
  wireAddButtons(root);
}

function renderProductPage(){
  const root = document.querySelector("[data-product]");
  if(!root) return;
  const id = getParam("id") || "p1";
  const p = products.find(x => x.id === id) || products[0];
  document.title = `${p.name} • SoftUpakaran`;
  root.innerHTML = `
    <div class="heroGrid">
      <div class="heroCard">
        <div class="thumb" style="aspect-ratio: 16/11">
          <img src="${p.img}" alt="${p.name}">
        </div>
      </div>
      <div class="heroCard">
        <div class="inner">
          <div class="kicker">Digital Delivery</div>
          <div class="h1" style="margin-top:10px">${p.name}</div>
          <p class="sub">${p.note}. Replace the text with your exact instructions (UID, region restrictions, etc.).</p>
          <div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div class="badge">${formatNPR(p.price)}</div>
            <div class="small">Secure checkout • Support chat</div>
          </div>
          <div class="heroActions">
            <button class="btn primary" id="buyNow">Add to cart</button>
            <a class="btn" href="category.html?c=${encodeURIComponent(p.category)}">Back to category</a>
          </div>
          <div style="margin-top:18px">
            <div class="feature">
              <h3>Steps</h3>
              <p>1) Select denomination • 2) Enter Player ID • 3) Pay • 4) Get delivery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  $("#buyNow")?.addEventListener("click", () => { addToCart(p.id, 1); openCart(); });
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
    footer.innerHTML = `<div class="notice">Tip: click “Add” on any product.</div>
      <button class="btn primary" data-cart-close>Continue shopping</button>`;
    footer.querySelector("[data-cart-close]")?.addEventListener("click", closeCart);
    updateCartCount();
    return;
  }

  body.innerHTML = lines.map(l => `
    <div class="cartRow">
      <img src="${l.img}" alt="${l.name}">
      <div>
        <p class="name">${l.name}</p>
        <p class="desc">${formatNPR(l.price)} • ${l.note}</p>
      </div>
      <div class="qty">
        <button aria-label="Decrease" data-dec="${l.id}">−</button>
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
          <img src="${ESEWA_QR_IMAGE}" alt="eSewa QR">
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
  const input = document.querySelector("[data-search]");
  if(!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const root = document.querySelector("[data-popular]");
    if(!root) return;
    const items = products.filter(p => p.name.toLowerCase().includes(q)).slice(0,8);
    root.innerHTML = items.length ? items.map(productCard).join("") : `
      <div class="card" style="grid-column:1/-1"><div class="pad">
        <p class="cardTitle">No matches</p>
        <p class="cardMeta">Try a different keyword.</p>
      </div></div>
    `;
    wireAddButtons(root);
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
    await fetch("window.API_BASE/api/orders", {
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
  const items = lines.map(l => `• ${l.name} x${l.qty} = ${formatNPR(l.lineTotal)}`).join("\n");
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
        <div class="small" style="margin-top:10px">Tip: replace number in <span class="small">app.js</span></div>
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
  try{
    const [catsRes, prodsRes] = await Promise.all([
      fetch(`${API_BASE}/api/categories`),
      fetch(`${API_BASE}/api/products?limit=500&offset=0&sort=name_asc`)
    ]);

    if (catsRes.ok){
      const cats = await catsRes.json();
      if(Array.isArray(cats) && cats.length) categories = cats;
    }

    if (prodsRes.ok){
      const rows = await prodsRes.json();
      if(Array.isArray(rows) && rows.length){
        products = rows.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category_id,
          price: r.price_npr,
          img: r.image || "assets/product-1.svg",
          note: r.note || "Instant delivery"
        }));
      }
    }
  }catch(e){
    // fallback to static arrays
  }
}
async function init(){
  await loadPublicSettings();
  await loadCatalogFromApi();
  await loadTestimonials();
  updateCartCount();
  renderCategories();
  renderPopular();
  renderCategoryPage();
  renderProductPage();
  buildCartModal();
  wirePayModal();
  wireCartButtons();
  wireSearch();
  loadTestimonials();

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
  btn.innerHTML = "✉️ Feedback";
  document.body.appendChild(btn);

  const overlay = document.createElement("div");
  overlay.className = "feedbackOverlay";
  overlay.innerHTML = `
    <div class="feedbackCard">
      <div class="feedbackHeader">
        <div class="feedbackTitle">Share your feedback</div>
        <button class="feedbackClose" aria-label="Close">×</button>
      </div>
      <div class="feedbackForm" role="form">
        <label>Rating</label>
        <div class="starRow" data-stars="">
          ${[1,2,3,4,5].map(i => `<span class="star" data-val="${i}">⭐</span>`).join("")}
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
    if(typeof API_BASE === "string" && API_BASE && API_BASE !== window.API_BASE){
      ok = await postJSON(`${API_BASE}/api/public/feedback`, payload);
    }
    if(!ok && typeof WHATSAPP_NUMBER === "string" && WHATSAPP_NUMBER){
      const text = `Feedback%0A${location.href}%0A⭐: ${rating}%0A${encodeURIComponent(msg)}`;
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

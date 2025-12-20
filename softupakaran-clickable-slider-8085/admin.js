(() => {
  const $ = (id) => document.getElementById(id);

  function setMsg(el, text, type = "info") {
    if (!el) return;
    el.className = "msg " + type;
    el.textContent = text || "";
  }

  function getApiBase() {
    const saved = localStorage.getItem("SPK_API_BASE");
    return (saved && saved.trim()) ? saved.trim().replace(/\/$/, "") : window.API_BASE;
  }

  function setApiBase(v) {
    localStorage.setItem("SPK_API_BASE", (v || "").trim().replace(/\/$/, ""));
  }

  function parseJwtPayload(token) {
    try {
      const part = String(token || "").split(".")[1];
      if (!part) return null;
      const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(atob(b64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function isAdminJwt(token) {
    const payload = parseJwtPayload(token);
    return payload && String(payload.role || "").toLowerCase() === "admin";
  }

  function getToken() {
    const adminToken = localStorage.getItem("SPK_ADMIN_TOKEN") || "";
    if (adminToken) return adminToken;
    const shared = localStorage.getItem("token") || "";
    return isAdminJwt(shared) ? shared : "";
  }

  function setToken(t) {
    if (t) {
      localStorage.setItem("SPK_ADMIN_TOKEN", t);
      // keep one shared key so admin link gate can work across pages
      localStorage.setItem("token", t);
    } else {
      const adminToken = localStorage.getItem("SPK_ADMIN_TOKEN") || "";
      localStorage.removeItem("SPK_ADMIN_TOKEN");
      // only clear shared token if it matches the admin token
      // (avoids wiping a customer session accidentally)
      const cur = localStorage.getItem("token") || "";
      if (adminToken && cur === adminToken) localStorage.removeItem("token");
    }
  }

  async function api(path, opts = {}) {
    const base = getApiBase();
    const url = base + path;
    const headers = opts.headers || {};
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(url, { ...opts, headers });
  }

  function showLoggedIn(isIn) {
    $("loginCard").classList.toggle("hidden", isIn);
    $("appCard").classList.toggle("hidden", !isIn);
  }

  function setActiveTab(name) {
    document.querySelectorAll(".tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    document.querySelectorAll(".pane").forEach(p => {
      p.classList.toggle("active", p.id === "pane-" + name);
    });
  }

  async function loadPublicSettings() {
    const res = await fetch(getApiBase() + "/api/public/settings");
    if (!res.ok) throw new Error("Failed to load public settings");
    return res.json();
  }

  async function refreshDashboard() {
    // Settings (public)
    try {
      const s = await loadPublicSettings();
      $("whatsappInput").value = s.whatsapp_number || "";
      if (s.esewa_qr_url) {
        const base = getApiBase();
        const src = s.esewa_qr_url.startsWith("http") ? s.esewa_qr_url : (base + s.esewa_qr_url);
        $("qrPreview").src = src;
        $("qrPreview").style.display = "block";
        $("qrHint").textContent = "Current QR: " + s.esewa_qr_url;
      } else {
        $("qrPreview").removeAttribute("src");
        $("qrPreview").style.display = "none";
        $("qrHint").textContent = "No QR uploaded yet.";
      }
      setMsg($("whatsappMsg"), "");
      setMsg($("qrMsg"), "");
    } catch (e) {
      setMsg($("qrMsg"), String(e.message || e), "error");
    }

    // Users
    try {
      const r = await api("/api/admin/users");
      if (!r.ok) throw new Error("Users fetch failed: " + r.status);
      const data = await r.json();
      const rows = Array.isArray(data) ? data : (data.users || []);
      const tbody = $("usersTable").querySelector("tbody");
      tbody.innerHTML = "";
      rows.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${u.id ?? ""}</td>
          <td>${escapeHtml(u.name ?? "")}</td>
          <td>${escapeHtml(u.email ?? "")}</td>
          <td>${escapeHtml(u.whatsapp ?? u.whatsapp_number ?? "")}</td>
          <td>${escapeHtml(u.role ?? "")}</td>
          <td>${formatDate(u.createdAt || u.created_at)}</td>
        `;
        tbody.appendChild(tr);
      });
      setMsg($("usersMsg"), rows.length ? "" : "No users found.");
    } catch (e) {
      setMsg($("usersMsg"), String(e.message || e), "error");
    }

    // Feedback (moderation)
    try {
      await refreshFeedback({ resetPage: false });
    } catch (e) {
      setMsg($("fbMsg"), String(e.message || e), "error");
    }

// Products
    if ($("prodTable")) {
      try { await refreshProducts(); } catch (e) { /* ignore */ }
    }
}

  async function login() {
    setMsg($("loginMsg"), "");
    const email = $("email").value.trim();
    const password = $("password").value;
    const apiBase = $("apiBase").value.trim() || window.API_BASE;
    setApiBase(apiBase);

    if (!email || !password) {
      setMsg($("loginMsg"), "Please enter email + password.", "warn");
      return;
    }

    const res = await fetch(getApiBase() + "/api/auth/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const txt = await safeText(res);
      setMsg($("loginMsg"), "Login failed: " + txt, "error");
      return;
    }

    const data = await res.json();
    if (!data.token) {
      setMsg($("loginMsg"), "Login response missing token.", "error");
      return;
    }

    setToken(data.token);
    showLoggedIn(true);
    await refreshDashboard();
  }

  async function logout() {
    setToken("");
    showLoggedIn(false);
    setMsg($("loginMsg"), "Logged out.", "info");
  }

  async function saveWhatsapp() {
    setMsg($("whatsappMsg"), "");
    const number = $("whatsappInput").value.trim();
    if (!number) {
      setMsg($("whatsappMsg"), "Enter a WhatsApp number first.", "warn");
      return;
    }
    const res = await api("/api/admin/settings/whatsapp", {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ whatsapp: number })
    });
    if (!res.ok) {
      const txt = await safeText(res);
      setMsg($("whatsappMsg"), "Save failed: " + txt, "error");
      return;
    }
    setMsg($("whatsappMsg"), "Saved WhatsApp number âœ…", "success");
    await refreshDashboard();
  }

  async function uploadQr() {
    setMsg($("qrMsg"), "");
    const file = $("qrFile").files && $("qrFile").files[0];
    if (!file) {
      setMsg($("qrMsg"), "Choose an image file first.", "warn");
      return;
    }
    const fd = new FormData();
    fd.append("qr", file);
    const res = await api("/api/admin/settings/esewa-qr", { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await safeText(res);
      setMsg($("qrMsg"), "Upload failed: " + txt, "error");
      return;
    }
    setMsg($("qrMsg"), "QR uploaded âœ…", "success");
    $("qrFile").value = "";
    await refreshDashboard();
  }

  async function createUser() {
    if (!$("btnCreateUser")) return;
    setMsg($("createUserMsg"), "");

    const payload = {
      name: $("newUserName")?.value?.trim() || "",
      email: $("newUserEmail")?.value?.trim() || "",
      password: $("newUserPassword")?.value || "",
      role: $("newUserRole")?.value || "user",
      phone: $("newUserPhone")?.value?.trim() || "",
      whatsapp: $("newUserWhatsapp")?.value?.trim() || "",
    };

    if (!payload.email || !payload.password) {
      setMsg($("createUserMsg"), "Email and password are required.", "warn");
      return;
    }

    const btn = $("btnCreateUser");
    btn.disabled = true;
    try {
      const r = await api("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const txt = await safeText(r);
        setMsg($("createUserMsg"), "Create failed: " + txt, "error");
        return;
      }
      setMsg($("createUserMsg"), "User created âœ…", "success");
      // clear form
      ["newUserName","newUserEmail","newUserPassword","newUserPhone","newUserWhatsapp"].forEach(id => {
        if ($(id)) $(id).value = "";
      });
      if ($("newUserRole")) $("newUserRole").value = "user";
      await refreshDashboard();
    } catch (e) {
      setMsg($("createUserMsg"), String(e.message || e), "error");
    } finally {
      btn.disabled = false;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  
function csvEscape(v){
  if(v === null || v === undefined) return "";
  const s = String(v).replace(/\r\n|\r|\n/g, " ").trim();
  const q = s.replace(/"/g, '""');
  return `"${q}"`;
}

function toCsv(rows, columns){
  const header = columns.map(c => csvEscape(c.label)).join(",");
  const lines = rows.map(r => columns.map(c => csvEscape(c.get(r))).join(","));
  return [header, ...lines].join("\n");
}

function downloadCsv(filename, csvText){
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportUsersCsv(){
  setMsg($("usersMsg"), "Preparing CSVâ€¦", "info");
  try{
    const r = await api("/api/admin/users");
    if(!r.ok) throw new Error("Users fetch failed: " + r.status);
    const data = await r.json();
    const rows = Array.isArray(data) ? data : (data.users || []);
    const csv = toCsv(rows, [
      { label: "ID", get: (u) => u.id },
      { label: "Name", get: (u) => u.name },
      { label: "Email", get: (u) => u.email },
      { label: "WhatsApp", get: (u) => (u.whatsapp ?? u.whatsapp_number ?? "") },
      { label: "Role", get: (u) => u.role },
      { label: "Created", get: (u) => (u.createdAt || u.created_at) },
      { label: "Updated", get: (u) => (u.updatedAt || u.updated_at) },
    ]);
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    downloadCsv("users-" + ts + ".csv", csv);
    setMsg($("usersMsg"), "CSV downloaded.", "success");
  }catch(e){
    setMsg($("usersMsg"), String(e.message || e), "error");
  }
}

async function exportFeedbackCsv(){
  setMsg($("fbMsg"), "Preparing CSVâ€¦", "info");
  try{
    const { status, q } = getFbFilters();
    let page = 1;
    const limit = 100;
    let all = [];
    let total = null;

    while(true){
      const qs = new URLSearchParams({ status, q, page: String(page), limit: String(limit) });
      const r = await api("/api/admin/feedback?" + qs.toString());
      if(!r.ok) throw new Error("Feedback fetch failed: " + r.status);
      const data = await r.json();
      const rows = (data && data.feedback) ? data.feedback : [];
      total = data && typeof data.total === "number" ? data.total : total;
      all = all.concat(rows);
      if(rows.length < limit) break;
      if(total !== null && all.length >= total) break;
      page += 1;
      if(page > 200) break;
    }

    const csv = toCsv(all, [
      { label: "ID", get: (f) => f.id },
      { label: "User ID", get: (f) => f.user_id },
      { label: "User Email", get: (f) => f.user_email },
      { label: "Name", get: (f) => f.name },
      { label: "Email", get: (f) => f.email },
      { label: "Rating", get: (f) => f.rating },
      { label: "Status", get: (f) => f.status },
      { label: "Created", get: (f) => f.created_at },
      { label: "Message", get: (f) => f.message },
    ]);

    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    downloadCsv("feedback-" + ts + ".csv", csv);
    setMsg($("fbMsg"), "CSV downloaded.", "success");
  }catch(e){
    setMsg($("fbMsg"), String(e.message || e), "error");
  }
}

function formatDate(v) {
    if (!v) return "";
    const d = new Date(v);
    if (String(d) === "Invalid Date") return String(v);
    return d.toLocaleString();
  }

  async function safeText(res) {
    try { return (await res.text()) || (res.status + " " + res.statusText); }
    catch { return res.status + " " + res.statusText; }
  }

  // init
  
  

  // ---------- Feedback (Moderation + Search + Filter) ----------
  let fbPage = 1;
  const fbLimit = 20;
  let fbTotal = 0;
  let fbLastCount = 0;
  let fbSearchTimer = null;

  function uiStatusFromDb(s) {
    const v = String(s || "").toLowerCase();
    if (v === "published" || v === "approved") return "Approved";
    if (v === "rejected") return "Rejected";
    return "Pending";
  }

  function badgeClassFromDb(s) {
    const v = String(s || "").toLowerCase();
    if (v === "published" || v === "approved") return "ok";
    if (v === "rejected") return "bad";
    return "warn";
  }

  function renderStars(n) {
    const r = parseInt(n, 10);
    if (!r || r < 1) return "â€”";
    const clamped = Math.max(1, Math.min(5, r));
    return "â˜…".repeat(clamped) + "â˜†".repeat(5 - clamped);
  }

  function getFbFilters() {
    const status = ($("fbStatus")?.value || "all").trim();
    const q = ($("fbSearch")?.value || "").trim();
    return { status, q };
  }

  function setFbMeta() {
    const meta = $("fbMeta");
    if (!meta) return;
    if (!fbTotal) {
      meta.textContent = "No feedback found.";
      return;
    }
    const start = (fbPage - 1) * fbLimit + 1;
    const end = Math.min((fbPage - 1) * fbLimit + fbLastCount, fbTotal);
    meta.textContent = `Showing ${start}-${end} of ${fbTotal}`;
  }

  async function refreshFeedback({ resetPage = false } = {}) {
    const { status, q } = getFbFilters();
    if (resetPage) fbPage = 1;

    setMsg($("fbMsg"), "");
    const qs = new URLSearchParams({
      status: status || "all",
      q: q || "",
      page: String(fbPage),
      limit: String(fbLimit),
    }).toString();

    const r = await api(`/api/admin/feedback?${qs}`);
    if (!r.ok) throw new Error("Feedback fetch failed: " + r.status);
    const data = await r.json();
    const rows = Array.isArray(data) ? data : (data.feedback || []);
    fbTotal = data?.total ?? rows.length ?? 0;
    fbLastCount = rows.length;

    const tbody = $("fbTable")?.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    rows.forEach((f) => {
      const tr = document.createElement("tr");
      const name = (f.name || "").trim();
      const email = (f.email || f.user_email || "").trim();
      const user = [name || "â€”", email ? `(${email})` : ""].join(" ").trim();

      const statusLabel = uiStatusFromDb(f.status);
      const badgeCls = badgeClassFromDb(f.status);

      tr.innerHTML = `
        <td>${f.id ?? ""}</td>
        <td>${escapeHtml(user)}</td>
        <td>${escapeHtml(renderStars(f.rating))}</td>
        <td style="max-width:520px;white-space:normal">${escapeHtml(f.message ?? "")}</td>
        <td><span class="badge ${badgeCls}">${escapeHtml(statusLabel)}</span></td>
        <td>${formatDate(f.createdAt || f.created_at)}</td>
        <td>
          <div class="actions" style="padding:0; justify-content:flex-start; gap:8px; flex-wrap:wrap;">
            <button class="btn sm primary" data-fb-action="approve" data-fb-id="${f.id}">Approve</button>
            <button class="btn sm" data-fb-action="reject" data-fb-id="${f.id}">Reject</button>
            <button class="btn sm danger" data-fb-action="delete" data-fb-id="${f.id}">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const prev = $("fbPrev");
    const next = $("fbNext");
    if (prev) prev.disabled = fbPage <= 1;
    if (next) next.disabled = (fbPage * fbLimit) >= fbTotal;

    setFbMeta();
    setMsg($("fbMsg"), rows.length ? "" : "No feedback found.");
  }

  async function fbSetStatus(id, status) {
    const r = await api(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) throw new Error("Failed to update feedback: " + r.status);
  }

  async function fbDelete(id) {
    const r = await api(`/api/admin/feedback/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("Failed to delete feedback: " + r.status);
  }

  // ---------- Products (CRUD + Search + Pagination) ----------
  let prodEditingMode = "new"; // "new" | "edit"
  let prodEditingId = null;

  let prodLimit = parseInt(localStorage.getItem("SPK_PROD_PAGE_SIZE") || "20", 10) || 20;
  let prodOffset = 0;
  let prodTotal = 0;
  let categoriesCache = [];

  function showProdEditor(show) {
    const el = $("prodEditor");
    if (!el) return;
    el.classList.toggle("hidden", !show);
  }

  function clearProdEditor() {
    prodEditingMode = "new";
    prodEditingId = null;
    $("prodEditorTitle").textContent = "Add product";
    $("editId").value = "";
    $("editCategory").value = "";
    $("editName").value = "";
    $("editPrice").value = "";
    $("editImage").value = "";
    $("editNote").value = "";
    const f = $("editImageFile");
    if (f) f.value = "";
    $("editId").removeAttribute("disabled");
  }

  function fillProdEditor(p) {
    prodEditingMode = "edit";
    prodEditingId = p.id;
    $("prodEditorTitle").textContent = "Edit product: " + (p.name || p.id);
    $("editId").value = p.id || "";
    $("editCategory").value = p.category_id || "";
    $("editName").value = p.name || "";
    $("editPrice").value = (p.price_npr ?? "") + "";
    $("editImage").value = p.image || "";
    $("editNote").value = p.note || "";
    const f = $("editImageFile");
    if (f) f.value = "";
    $("editId").setAttribute("disabled", "disabled"); // ID should not change when editing
  }

  function escapeAttr(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function getProdFilters() {
    const q = ($("prodSearch")?.value || "").trim();
    const category = ($("prodCategory")?.value || "").trim();
    const minPrice = ($("prodMinPrice")?.value || "").trim();
    const maxPrice = ($("prodMaxPrice")?.value || "").trim();
    const sort = ($("prodSort")?.value || "name_asc").trim();
    return { q, category, minPrice, maxPrice, sort };
  }

  function setProdPageSize(v) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    prodLimit = n;
    localStorage.setItem("SPK_PROD_PAGE_SIZE", String(n));
    prodOffset = 0;
  }

  function updateProdPager() {
    const prev = $("btnProdPrev");
    const next = $("btnProdNext");
    const info = $("prodPageInfo");
    const totalInfo = $("prodTotalInfo");
    const pageSize = $("prodPageSize");

    const page = Math.floor(prodOffset / prodLimit) + 1;
    const pages = Math.max(1, Math.ceil((prodTotal || 0) / prodLimit));
    const from = (prodTotal === 0) ? 0 : (prodOffset + 1);
    const to = Math.min(prodOffset + prodLimit, prodTotal);

    if (info) info.textContent = `Page ${page} / ${pages} â€¢ Showing ${from}-${to}`;
    if (totalInfo) totalInfo.textContent = `Total: ${prodTotal}`;
    if (prev) prev.disabled = prodOffset <= 0;
    if (next) next.disabled = (prodOffset + prodLimit) >= prodTotal;

    if (pageSize) pageSize.value = String(prodLimit);
  }

  async function loadCategoriesForAdmin() {
    try {
      const res = await fetch(getApiBase() + "/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const cats = await res.json();
      categoriesCache = Array.isArray(cats) ? cats : [];
      populateCategorySelects();
    } catch (_) {
      // ok to ignore
    }
  }

  function populateCategorySelects() {
    const filterSel = $("prodCategory");
    const editSel = $("editCategory");
    if (!filterSel && !editSel) return;

    const currentFilter = filterSel ? filterSel.value : "";
    const currentEdit = editSel ? editSel.value : "";

    const optionsHtml = [
      `<option value="">All categories</option>`,
      ...categoriesCache.map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name || c.id)}</option>`)
    ].join("");

    if (filterSel) {
      filterSel.innerHTML = optionsHtml;
      filterSel.value = currentFilter;
    }
    if (editSel) {
      editSel.innerHTML = `<option value="">Select category</option>` + categoriesCache
        .map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name || c.id)}</option>`)
        .join("");
      editSel.value = currentEdit;
    }
  }

  async function refreshProducts({ resetPaging = false } = {}) {
    try {
      if (resetPaging) prodOffset = 0;

      // sync page size from UI if present
      const sizeSel = $("prodPageSize");
      if (sizeSel && sizeSel.value) setProdPageSize(sizeSel.value);

      const { q, category, minPrice, maxPrice, sort } = getProdFilters();
      const qs = new URLSearchParams();
      qs.set("limit", String(prodLimit));
      qs.set("offset", String(prodOffset));
      if (q) qs.set("q", q);
      if (category) qs.set("category", category);
      if (minPrice) qs.set("minPrice", minPrice);
      if (maxPrice) qs.set("maxPrice", maxPrice);
      if (sort) qs.set("sort", sort);

      const r = await api("/api/admin/products?" + qs.toString());
      if (!r.ok) throw new Error("Products fetch failed: " + r.status);
      const data = await r.json();

      prodTotal = data.total || 0;

      const tbody = $("prodTable")?.querySelector("tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      (data.items || []).forEach(p => {
        const tr = document.createElement("tr");
        const img = p.image ? `<a href="${escapeAttr(p.image)}" target="_blank" rel="noreferrer">${escapeHtml(p.image)}</a>` : "";
        tr.innerHTML = `
          <td>${escapeHtml(p.id)}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.category_id)}</td>
          <td>${escapeHtml(String(p.price_npr ?? ""))}</td>
          <td style="max-width:260px; word-break:break-all;">${img}</td>
          <td style="max-width:260px; word-break:break-word;">${escapeHtml(p.note ?? "")}</td>
          <td>
            <button class="btn" data-prod-edit="${escapeAttr(p.id)}">Edit</button>
            <button class="btn danger" data-prod-del="${escapeAttr(p.id)}" data-prod-del-name="${escapeAttr(p.name || p.id)}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // wire buttons
      tbody.querySelectorAll("[data-prod-edit]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-prod-edit");
          const r2 = await api("/api/products/" + encodeURIComponent(id));
          if (!r2.ok) { setMsg($("prodMsg"), "Failed to load product for edit", "error"); return; }
          const p = await r2.json();
          showProdEditor(true);
          fillProdEditor(p);
          try { $("prodEditor")?.scrollIntoView({behavior:"smooth", block:"start"}); } catch(_) {}
          setMsg($("prodMsg"), "");
        });
      });
      tbody.querySelectorAll("[data-prod-del]").forEach(btn => {
        btn.addEventListener("click", () => deleteProduct(
          btn.getAttribute("data-prod-del"),
          btn.getAttribute("data-prod-del-name")
        ));
      });

      updateProdPager();
      setMsg($("prodMsg"), (data.items && data.items.length) ? "" : "No products found.");
    } catch (e) {
      updateProdPager();
      setMsg($("prodMsg"), String(e.message || e), "error");
    }
  }

  async function uploadProductImageIfSelected() {
    const fileInput = $("editImageFile");
    if (!fileInput || !fileInput.files || !fileInput.files.length) return null;

    const fd = new FormData();
    fd.append("image", fileInput.files[0]);

    const res = await api("/api/admin/uploads/product-image", {
      method: "POST",
      body: fd
    });

    if (!res.ok) {
      const txt = await safeText(res);
      throw new Error("Image upload failed: " + txt);
    }
    const data = await res.json();
    return data.absoluteUrl || (getApiBase() + (data.url || ""));
  }

  async function saveProduct() {
    try {
      setMsg($("prodMsg"), "");

      const uploadedUrl = await uploadProductImageIfSelected().catch(() => null);
      if (uploadedUrl) $("editImage").value = uploadedUrl;

      const payload = {
        id: ($("editId")?.value || "").trim(),
        category_id: ($("editCategory")?.value || "").trim(),
        name: ($("editName")?.value || "").trim(),
        price_npr: parseInt(($("editPrice")?.value || "0"), 10),
        image: ($("editImage")?.value || "").trim(),
        note: ($("editNote")?.value || "").trim(),
      };

      if (!payload.name) { setMsg($("prodMsg"), "Name is required", "error"); return; }
      if (!payload.category_id) { setMsg($("prodMsg"), "Category is required", "error"); return; }
      if (Number.isNaN(payload.price_npr) || payload.price_npr < 0) { setMsg($("prodMsg"), "Price must be a valid number", "error"); return; }

      if (prodEditingMode === "new") {
        // allow auto id by sending empty
        if (!payload.id) delete payload.id;
        const r = await api("/api/admin/products", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          const txt = await safeText(r);
          setMsg($("prodMsg"), "Create failed: " + txt, "error");
          return;
        }
        setMsg($("prodMsg"), "Product created âœ…", "success");
      } else {
        const id = prodEditingId || payload.id;
        delete payload.id; // do not change id on edit
        const r = await api("/api/admin/products/" + encodeURIComponent(id), {
          method: "PATCH",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          const txt = await safeText(r);
          setMsg($("prodMsg"), "Update failed: " + txt, "error");
          return;
        }
        setMsg($("prodMsg"), "Product updated âœ…", "success");
      }

      clearProdEditor();
      showProdEditor(false);
      await refreshProducts(); // keep current filters/paging
    } catch (e) {
      setMsg($("prodMsg"), String(e.message || e), "error");
    }
  }

  async function deleteProduct(id, name) {
    if (!id) return;
    if (!confirm("Delete product " + (name ? (name + " (" + id + ")") : id) + " ?")) return;

    try {
      const r = await api("/api/admin/products/" + encodeURIComponent(id), { method: "DELETE" });
      if (!r.ok) {
        const txt = await safeText(r);
        setMsg($("prodMsg"), "Delete failed: " + txt, "error");
        return;
      }
      setMsg($("prodMsg"), "Deleted âœ…", "success");

      // if we deleted the last item on a page, go back one page
      if (prodOffset > 0 && ($("prodTable")?.querySelector("tbody")?.children?.length || 1) === 1) {
        prodOffset = Math.max(0, prodOffset - prodLimit);
      }
      await refreshProducts();
    } catch (e) {
      setMsg($("prodMsg"), String(e.message || e), "error");
    }
  }


document.addEventListener("DOMContentLoaded", async () => {
    $("apiBase").value = getApiBase();

    // tabs
    document.querySelectorAll(".tab").forEach(b => {
      b.addEventListener("click", () => setActiveTab(b.dataset.tab));
    });

    $("btnLogin").addEventListener("click", login);
    $("btnClear").addEventListener("click", () => {
      $("email").value = "";
      $("password").value = "";
      setMsg($("loginMsg"), "");
    });

    $("btnLogout").addEventListener("click", logout);
    $("btnRefresh").addEventListener("click", refreshDashboard);
    $("btnSaveWhatsapp").addEventListener("click", saveWhatsapp);
    $("btnUploadQr").addEventListener("click", uploadQr);
    $("btnCreateUser")?.addEventListener("click", createUser);

    // Feedback moderation controls
    $("btnFbRefresh")?.addEventListener("click", () => refreshFeedback({ resetPage: false }));
    $("fbStatus")?.addEventListener("change", () => refreshFeedback({ resetPage: true }));

    $("fbSearch")?.addEventListener("input", () => {
      if (fbSearchTimer) clearTimeout(fbSearchTimer);
      fbSearchTimer = setTimeout(() => refreshFeedback({ resetPage: true }), 250);
    });

    $("fbPrev")?.addEventListener("click", () => {
      fbPage = Math.max(1, fbPage - 1);
      refreshFeedback({ resetPage: false });
    });
    $("fbNext")?.addEventListener("click", () => {
      fbPage = fbPage + 1;
      refreshFeedback({ resetPage: false });
    });

    // Row actions (event delegation)
    $("fbTable")?.addEventListener("click", async (e) => {
      const btn = e.target?.closest?.("button[data-fb-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-fb-id");
      const action = btn.getAttribute("data-fb-action");
      try {
        if (action === "approve") await fbSetStatus(id, "approved");
        else if (action === "reject") await fbSetStatus(id, "rejected");
        else if (action === "delete") {
          if (!confirm("Delete this feedback permanently?")) return;
          await fbDelete(id);
        }
        await refreshFeedback({ resetPage: false });
      } catch (err) {
        setMsg($("fbMsg"), String(err.message || err), "error");
      }
    });


    // Products
    // Load categories into dropdowns (public endpoint)
    await loadCategoriesForAdmin();
    updateProdPager();

    const doSearch = () => refreshProducts({ resetPaging: true });

    $("btnProdRefresh")?.addEventListener("click", () => refreshProducts());
    $("btnProdSearch")?.addEventListener("click", doSearch);

    $("prodSearch")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
    $("prodMinPrice")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
    $("prodMaxPrice")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

    $("prodCategory")?.addEventListener("change", doSearch);
    $("prodSort")?.addEventListener("change", doSearch);

    $("btnProdClear")?.addEventListener("click", () => {
      if ($("prodSearch")) $("prodSearch").value = "";
      if ($("prodCategory")) $("prodCategory").value = "";
      if ($("prodMinPrice")) $("prodMinPrice").value = "";
      if ($("prodMaxPrice")) $("prodMaxPrice").value = "";
      if ($("prodSort")) $("prodSort").value = "name_asc";
      setMsg($("prodMsg"), "");
      refreshProducts({ resetPaging: true });
    });

    $("prodPageSize")?.addEventListener("change", () => refreshProducts({ resetPaging: true }));

    $("btnProdPrev")?.addEventListener("click", () => {
      prodOffset = Math.max(0, prodOffset - prodLimit);
      refreshProducts();
    });
    $("btnProdNext")?.addEventListener("click", () => {
      prodOffset = prodOffset + prodLimit;
      refreshProducts();
    });

    $("btnProdNew")?.addEventListener("click", () => {
      clearProdEditor();
      showProdEditor(true);
      setMsg($("prodMsg"), "");
    });

    $("btnProdSave")?.addEventListener("click", saveProduct);
    $("btnProdCancel")?.addEventListener("click", () => {
      clearProdEditor();
      showProdEditor(false);
    });
    
$("btnUsersExport")?.addEventListener("click", exportUsersCsv);
$("btnFbExport")?.addEventListener("click", exportFeedbackCsv);

// auto-show if token exists
    if (getToken()) {
      showLoggedIn(true);
      try { await refreshDashboard(); }
      catch (e) { /* ignore */ }
    } else {
      showLoggedIn(false);
    }
  });
})();

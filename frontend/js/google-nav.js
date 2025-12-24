// why: render Google button, exchange credential with backend, store JWT
(function(){
  function normalizeBase(url){ return String(url || "").trim().replace(/\/$/, ""); }
  function isLocalHost(){
    var host = window.location && window.location.hostname ? window.location.hostname : "";
    return host === "localhost" || host === "127.0.0.1";
  }
  function getApiBases(){
    var bases = [];
    try {
      var saved = localStorage.getItem("SPK_API_BASE");
      if (saved) bases.push(saved);
    } catch(_) {}
    if (window.API_BASE) bases.push(window.API_BASE);
    if (isLocalHost()) bases.push("http://localhost:4000");
    var seen = {};
    return bases
      .map(normalizeBase)
      .filter(function(base){
        if (!base || seen[base]) return false;
        seen[base] = true;
        return true;
      });
  }
  function clientId(){
    return (window.GOOGLE_CLIENT_ID || "").trim();
  }
  function setToken(t){ if(!t) return; localStorage.setItem('token', t); }
  function isLoggedIn(){ return !!(localStorage.getItem('token') || sessionStorage.getItem('token')); }
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function parseJwtPayload(token){
    try {
      var base = String(token || "").split('.')[1] || "";
      base = base.replace(/-/g, '+').replace(/_/g, '/');
      while (base.length % 4) base += '=';
      var json = decodeURIComponent(atob(base).split('').map(function(c){
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch(_) { return null; }
  }

  function setLocalSession(payload){
    if(!payload || !payload.email) return false;
    var now = new Date().toISOString();
    var profile = {
      name: payload.name || payload.given_name || "",
      email: payload.email || "",
      picture: payload.picture || "",
      created_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : now,
      updated_at: now
    };
    try {
      localStorage.setItem("SPK_LOCAL_PROFILE", JSON.stringify(profile));
      localStorage.setItem("SPK_AUTH_SOURCE", "google-local");
      localStorage.setItem("token", "local-google");
      return true;
    } catch(_) { return false; }
  }

  function showError(msg){
    try { alert(msg); } catch(_) {}
  }

  function mountButton(){
    var nav = document.querySelector('.nav .navlinks');
    if (!nav) return;

    var holder = document.getElementById('googleNavBtn');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'googleNavBtn';
      holder.className = 'google-nav-btn';
      nav.appendChild(holder);
    }

    var mobileHolder = document.getElementById('mobileGoogleNavBtn');
    var holders = [holder];
    if (mobileHolder) holders.push(mobileHolder);

    if (!holders.length) return;

    function renderUserChip(target){
      target.classList.add('user-chip');
      target.innerHTML = '<a href="profile.html" class="user-chip-link" aria-label="Profile">👤</a>';
    }

    if (isLoggedIn()) {
      holders.forEach(renderUserChip);
      return;
    }
    // Ensure GIS loaded
    function init(){
      var cid = clientId();
      if (!cid){
        console.error("Missing GOOGLE_CLIENT_ID");
        showError("Google Sign-in not configured. Set GOOGLE_CLIENT_ID.");
        return;
      }
      var bases = getApiBases();
      google.accounts.id.initialize({
        client_id: cid,
        ux_mode: "popup",
        callback: async (response) => {
          var lastErr = null;
          var lastMsg = null;
          var sawNetwork = false;
          for (var i = 0; i < bases.length; i++) {
            var base = bases[i];
            try {
              const res = await fetch(base + "/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data.token) {
                var msg = data && data.error ? String(data.error) : ("HTTP " + res.status);
                console.error("Google exchange failed:", data);
                if (res.status === 404 || res.status === 405) {
                  lastMsg = "Google sign-in failed. Configure API base URL.";
                } else {
                  lastMsg = "Google sign-in failed: " + msg;
                }
                continue;
              }
              setToken(data.token);
              window.location.href = 'index.html';
              return;
            } catch (e) {
              lastErr = e;
              sawNetwork = true;
            }
          }
          var localOk = false;
          var payload = response && response.credential ? parseJwtPayload(response.credential) : null;
          if (payload) localOk = setLocalSession(payload);
          if (localOk) {
            window.location.href = 'index.html';
            return;
          }
          console.error('Google login failed', lastErr);
          if (!lastMsg) {
            lastMsg = sawNetwork
              ? 'Google sign-in failed. Backend unreachable.'
              : 'Google sign-in failed. Check backend.';
          }
          showError(lastMsg);
        }
      });
      var renderOpts = { theme: 'filled_black', type: 'icon', size: 'medium', shape: 'circle', logo_alignment: 'center' };
      holders.forEach(function(h){
        google.accounts.id.renderButton(h, renderOpts);
      });
    }

    if (window.google && google.accounts && google.accounts.id) init();
    else {
      // Wait for script
      var tries = 0;
      var t = setInterval(function(){
        tries++;
        if (window.google && google.accounts && google.accounts.id){ clearInterval(t); init(); }
        if (tries > 100) { clearInterval(t); console.error("GIS script not loaded"); }
      }, 50);
    }
  }

  ready(mountButton);
})();

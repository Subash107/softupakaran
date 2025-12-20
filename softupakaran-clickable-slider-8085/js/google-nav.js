// why: render Google button, exchange credential with backend, store JWT
(function(){
  function normalizeBase(url){ return String(url || "").trim().replace(/\/$/, ""); }
  function getApiBases(){
    var bases = [];
    try {
      var saved = localStorage.getItem("SPK_API_BASE");
      if (saved) bases.push(saved);
    } catch(_) {}
    if (window.API_BASE) bases.push(window.API_BASE);
    bases.push("http://localhost:4000");
    if (window.location && window.location.origin) bases.push(window.location.origin);
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

    if (isLoggedIn()) {
      holder.classList.add('user-chip');
      holder.innerHTML = '<a href="profile.html" class="user-chip-link" aria-label="Profile">👤</a>';
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
      google.accounts.id.initialize({
        client_id: cid,
        ux_mode: "popup",
        callback: async (response) => {
          var bases = getApiBases();
          var lastErr = null;
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
                const msg = data && data.error ? String(data.error) : ("HTTP " + res.status);
                console.error("Google exchange failed:", data);
                showError("Google sign-in failed: " + msg);
                return;
              }
              setToken(data.token);
              window.location.href = 'index.html';
              return;
            } catch (e) {
              lastErr = e;
            }
          }
          console.error('Google login failed', lastErr);
          showError('Google sign-in failed. Check backend.');
        }
      });
      google.accounts.id.renderButton(holder, { theme: 'filled_black', type: 'icon', size: 'medium', shape: 'circle', logo_alignment: 'center' });
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

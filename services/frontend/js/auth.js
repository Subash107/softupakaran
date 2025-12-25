// why: simple real auth flow for demo; stores JWT, updates UI, no framework
(function(){
  // Default: talk to backend running via Docker compose on localhost:4000.
  // Can be overridden (shared with js/app.js/js/admin.js) by setting localStorage.SPK_API_BASE.
  function normalizeBase(v){
    return (v && v.trim()) ? v.trim().replace(/\/$/, "") : "";
  }

  function isLocalHost(host){
    return host === "localhost" || host === "127.0.0.1";
  }

  function isLocalApi(base){
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base || "");
  }

  function getApiBase(){
    const saved = normalizeBase(localStorage.getItem("SPK_API_BASE"));
    const meta = normalizeBase(window.API_BASE);
    const host = window.location && window.location.hostname ? window.location.hostname : "";
    if (!isLocalHost(host) && saved && isLocalApi(saved) && meta) return meta;
    return saved || meta;
  }

  function parseJwt(token){
    try {
      let base = token.split('.')[1];
      base = base.replace(/-/g, '+').replace(/_/g, '/');
      while (base.length % 4) base += '=';
      const json = decodeURIComponent(atob(base).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch(e){ return null; }
  }

  function getLocalProfile(){
    try{
      const raw = localStorage.getItem("SPK_LOCAL_PROFILE");
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }

  function setLocalProfile(profile){
    if(!profile) return;
    try{
      localStorage.setItem("SPK_LOCAL_PROFILE", JSON.stringify(profile));
    }catch(_){}
  }

  function setLocalSession(profile){
    if(!profile || !profile.email) return false;
    const now = new Date().toISOString();
    const stored = {
      name: profile.name || "",
      email: profile.email || "",
      picture: profile.picture || "",
      created_at: profile.created_at || now,
      updated_at: now
    };
    setLocalProfile(stored);
    try{ localStorage.setItem("SPK_AUTH_SOURCE", "google-local"); }catch(_){}
    setToken("local-google");
    return true;
  }

  function setToken(token){
    localStorage.setItem('token', token);
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: { token } }));
  }

  function clearToken(){
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem("SPK_LOCAL_PROFILE");
    localStorage.removeItem("SPK_AUTH_SOURCE");
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: { token: null } }));
  }

  async function login(email, password){
    const res = await fetch(getApiBase() + '/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error(t || 'Login failed');
    }
    const data = await res.json();
    if(!data.token) throw new Error('No token returned');
    setToken(data.token);
    return parseJwt(data.token);
  }

  async function register(payload){
    const res = await fetch(getApiBase() + '/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload || {})
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error(t || 'Register failed');
    }
    const data = await res.json();
    if(!data.token) throw new Error('No token returned');
    setToken(data.token);
    return parseJwt(data.token);
  }

  async function me(){
    const token = localStorage.getItem('token');
    if(!token) return null;
    const base = getApiBase();
    const local = getLocalProfile();
    if(!base) return local;
    try{
      const res = await fetch(base + '/api/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if(!res.ok) return local;
      return res.json();
    }catch(_){
      return local;
    }
  }

  // Expose minimal API
  window.Auth = {
    login,
    register,
    me,
    clearToken,
    parseJwt,
    getApiBase,
    setToken,
    setLocalSession,
    getLocalProfile
  };
})();


// --- Google Sign-In (GIS) ---
window.initGoogleLogin = function initGoogleLogin(){
  try{
    const clientId = window.GOOGLE_CLIENT_ID || (window.__GOOGLE_CLIENT_ID || "");
    const target = document.getElementById('googleSignInBtn');
    if(!target) return;
    if(typeof google === 'undefined' || !clientId){
      target.innerHTML = '<div class="muted">Google Sign-In not configured</div>';
      return;
    }
    const auth = window.Auth || {};
    function profileFromCredential(cred){
      const payload = auth.parseJwt ? auth.parseJwt(cred) : null;
      if(!payload) return null;
      return {
        name: payload.name || payload.given_name || "",
        email: payload.email || "",
        picture: payload.picture || "",
        created_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined
      };
    }
    function localFallback(cred){
      if(!auth.setLocalSession) return false;
      const profile = profileFromCredential(cred);
      return auth.setLocalSession(profile);
    }
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp) => {
        try{
          const base = auth.getApiBase ? auth.getApiBase() : "";
          if(!base){
            if(localFallback(resp.credential)){
              document.dispatchEvent(new Event('auth:changed'));
              const msg = document.getElementById('googleMsg');
              if(msg) { msg.textContent = 'Signed in with Google (local).'; msg.className = 'msg ok'; }
              return;
            }
            throw new Error('Google sign-in not configured');
          }
          // send credential JWT to backend for exchange
          const res = await fetch(base + '/api/auth/google', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ credential: resp.credential })
          });
          if(!res.ok){
            const t = await res.text();
            throw new Error(t || 'Google login failed');
          }
          const data = await res.json();
          if(!data.token){
            if(localFallback(resp.credential)){
              document.dispatchEvent(new Event('auth:changed'));
              const msg = document.getElementById('googleMsg');
              if(msg) { msg.textContent = 'Signed in with Google (local).'; msg.className = 'msg ok'; }
              return;
            }
            throw new Error('No token returned');
          }
          if(auth.setToken) auth.setToken(data.token);
          document.dispatchEvent(new Event('auth:changed'));
          const msg = document.getElementById('googleMsg');
          if(msg) { msg.textContent = 'Signed in with Google.'; msg.className = 'msg ok'; }
        }catch(e){
          if(localFallback(resp.credential)){
            document.dispatchEvent(new Event('auth:changed'));
            const msg = document.getElementById('googleMsg');
            if(msg) { msg.textContent = 'Signed in with Google (local).'; msg.className = 'msg ok'; }
            return;
          }
          const msg = document.getElementById('googleMsg');
          if(msg) { msg.textContent = 'Google sign-in failed: ' + (e.message || e); msg.className = 'msg bad'; }
        }
      }
    });
    google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with' });
  }catch(e){
    console.error('initGoogleLogin error', e);
  }
};

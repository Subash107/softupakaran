// why: simple real auth flow for demo; stores JWT, updates UI, no framework
(function(){
  // Default: talk to backend running via Docker compose on localhost:4000.
  // Can be overridden (shared with app.js/admin.js) by setting localStorage.SPK_API_BASE.
  function getApiBase(){
    const saved = localStorage.getItem("SPK_API_BASE");
    return (saved && saved.trim()) ? saved.trim().replace(/\/$/, "") : window.API_BASE;
  }

  function parseJwt(token){
    try {
      const base = token.split('.')[1];
      const json = decodeURIComponent(atob(base).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch(e){ return null; }
  }

  function setToken(token){
    localStorage.setItem('token', token);
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: { token } }));
  }

  function clearToken(){
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
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
    const res = await fetch(getApiBase() + '/api/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if(!res.ok) return null;
    return res.json();
  }

  // Expose minimal API
  window.Auth = { login, register, me, clearToken, parseJwt, getApiBase };
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
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp) => {
        try{
          // send credential JWT to backend for exchange
          const res = await fetch(getApiBase() + '/api/auth/google', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ credential: resp.credential })
          });
          if(!res.ok){
            const t = await res.text();
            throw new Error(t || 'Google login failed');
          }
          const data = await res.json();
          if(!data.token) throw new Error('No token returned');
          setToken(data.token);
          document.dispatchEvent(new Event('auth:changed'));
          const msg = document.getElementById('googleMsg');
          if(msg) { msg.textContent = 'Signed in with Google ✅'; msg.className = 'msg ok'; }
        }catch(e){
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

/** why: prevent non-admins from seeing admin link client-side */
(function(){
  function parseJwt(token){
    try {
      const base = token.split('.')[1];
      const json = decodeURIComponent(atob(base).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch(e){ return null; }
  }
  var link = document.getElementById('adminLink');
  if (!link) return;
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const payload = token ? parseJwt(token) : null;
    if (payload && (payload.role === 'admin' || payload.isAdmin === true)) {
      link.style.display = ''; // show
    } else {
      link.style.display = 'none';
    }
  } catch(e){
    link.style.display = 'none';
  }
})();

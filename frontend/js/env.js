// runtime env (override in production by editing this file)
(function(){
  var host = window.location && window.location.hostname ? window.location.hostname : "";
  var isLocal = host === "localhost" || host === "127.0.0.1";

  // Allow overriding API_BASE via localStorage
  try {
    var lb = localStorage.getItem("SPK_API_BASE");
    if (lb) window.API_BASE = lb;
  } catch(_) {}
  // Allow <meta name="api-base" content="..."> to set API base
  var apiMeta = document.querySelector('meta[name="api-base"]');
  if (apiMeta && apiMeta.content) window.API_BASE = apiMeta.content;
  // default API base
  window.API_BASE = window.API_BASE || (isLocal ? "http://localhost:4000" : "");

  // Allow <meta name="google-client-id" content="..."> to set client id
  var meta = document.querySelector('meta[name="google-client-id"]');
  var metaId = meta ? meta.content : null;
  // Or from localStorage
  var lsId = null;
  try { lsId = localStorage.getItem("SPK_GOOGLE_CLIENT_ID"); } catch(_) {}
  window.GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || metaId || lsId || "161160759250-tvcu3a09i8gtdeaia6gpk04jo343oiet.apps.googleusercontent.com";
})();

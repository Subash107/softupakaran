// Optional API override for local testing (e.g., ?api=http://localhost:4000).
(function () {
  if (!window.URLSearchParams) return;
  var params = new URLSearchParams(window.location.search);
  var api = params.get("api");
  if (!api) return;
  try {
    localStorage.setItem("SPK_API_BASE", api.replace(/\/$/, ""));
  } catch (e) {
    // Ignore storage failures in private mode.
  }
})();

// Optional admin link override for demos (e.g., ?admin=1).
(function () {
  var link = document.getElementById("adminLink");
  if (!link || !window.URLSearchParams) return;
  var params = new URLSearchParams(window.location.search);
  if (params.get("admin") === "1") {
    link.style.display = "";
  }
})();

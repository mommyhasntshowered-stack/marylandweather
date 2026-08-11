/* Shared chrome: active nav highlighting + footer year. No analytics, no tracking. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var path = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    if (path === "" ) path = "/";
    document.querySelectorAll(".sitehead nav a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path || (href !== "/" && path.indexOf(href) === 0)) {
        a.classList.add("active");
      }
    });
    var yearEl = document.getElementById("copyright-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });
})();

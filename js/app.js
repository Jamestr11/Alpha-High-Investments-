/** Shared UI helpers for AlphaX Pages demo. */
window.AlphaXApp = (function () {
  function assetBase() {
    // pages/*.html → ../ ; index.html → .
    var path = location.pathname.replace(/\\/g, "/");
    if (/\/pages\//.test(path)) return "..";
    return ".";
  }

  function pageUrl(name) {
    var base = assetBase();
    if (name === "index" || name === "") {
      return base === ".." ? "../index.html" : "index.html";
    }
    return base === ".."
      ? name + ".html"
      : "pages/" + name + ".html";
  }

  function formatAlphaX(n) {
    var v = Number(n) || 0;
    return (
      v.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " αX"
    );
  }

  function formatPct(n) {
    var v = Number(n) || 0;
    var sign = v > 0 ? "+" : "";
    return sign + v.toFixed(2) + "%";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function toast(message, tone) {
    var el = document.createElement("div");
    el.className = "toast" + (tone ? " " + tone : "");
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function requireUser(roles) {
    var user = window.AlphaXStore.getSession();
    if (!user) {
      location.href = pageUrl("index");
      return null;
    }
    if (roles && roles.indexOf(user.role) === -1) {
      location.href = homeForRole(user.role);
      return null;
    }
    return user;
  }

  function homeForRole(role) {
    if (role === "ADMIN") return pageUrl("admin");
    if (role === "GUIDE") return pageUrl("guides");
    return pageUrl("student");
  }

  function navFor(user) {
    if (user.role === "STUDENT") {
      return [
        { id: "student", label: "Trade" },
        { id: "holdings", label: "Holdings" },
        { id: "deposits", label: "Deposits" },
        { id: "guides", label: "Guides" },
      ];
    }
    if (user.role === "GUIDE") {
      return [
        { id: "guides", label: "Guides" },
        { id: "deposits", label: "Deposits" },
      ];
    }
    return [
      { id: "admin", label: "Inbox" },
      { id: "funds", label: "Funds" },
      { id: "students", label: "Students" },
      { id: "deposits", label: "Deposits" },
      { id: "guides", label: "Guides" },
    ];
  }

  function mountShell(opts) {
    var user = opts.user;
    var active = opts.active;
    var root = document.getElementById("app");
    if (!root) return;

    var base = assetBase();
    var nav = navFor(user)
      .map(function (item) {
        return (
          '<a href="' +
          pageUrl(item.id) +
          '" class="' +
          (item.id === active ? "active" : "") +
          '">' +
          item.label +
          "</a>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="shell">' +
      '<header class="topbar">' +
      '<a class="brand-lockup" href="' +
      homeForRole(user.role) +
      '">' +
      '<div class="brand-mark">αX</div>' +
      '<div class="brand-text"><strong>AlphaX Invest</strong><span>Alpha High · demo</span></div>' +
      "</a>" +
      '<nav class="nav">' +
      nav +
      "</nav>" +
      '<div class="user-chip">' +
      '<div class="meta"><strong>' +
      escapeHtml(user.name) +
      "</strong><small>" +
      user.role +
      (user.email ? " · " + escapeHtml(user.email) : "") +
      "</small></div>" +
      '<button type="button" class="btn btn-ghost" id="btn-logout">Log out</button>' +
      "</div></header>" +
      '<main class="main" id="main"></main></div>';

    var logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.AlphaXStore.logout();
        location.href = pageUrl("index");
      });
    }

    return document.getElementById("main");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function demoBanner() {
    return (
      '<div class="demo-banner"><div><strong>Pages demo · no real money.</strong> ' +
      "Data lives in this browser’s localStorage. Reset anytime from the login screen.</div></div>"
    );
  }

  function renderTicker(el) {
    if (!el) return;
    var state = window.AlphaXStore.load();
    var funds = state.funds
      .slice()
      .sort(function (a, b) {
        return a.sortOrder - b.sortOrder;
      });
    var items = funds.map(function (f) {
      var chart = window.AlphaXMarket.buildFundChart(
        f,
        26,
        window.AlphaXStore.popularityBump(f.id)
      );
      var cls = chart.changePct >= 0 ? "up" : "down";
      return (
        '<span><span style="color:var(--ink-soft)">' +
        escapeHtml(f.name) +
        '</span> <span class="' +
        cls +
        '">' +
        formatPct(chart.changePct) +
        "</span></span>"
      );
    });
    var doubled = items.concat(items).join("");
    el.innerHTML =
      '<div class="ticker"><div class="ticker-track">' +
      doubled +
      "</div></div>";
  }

  function scriptsReady(cb) {
    if (
      window.AlphaXSeed &&
      window.AlphaXStore &&
      window.AlphaXMarket &&
      window.AlphaXChart
    ) {
      cb();
      return;
    }
    setTimeout(function () {
      scriptsReady(cb);
    }, 20);
  }

  return {
    assetBase: assetBase,
    pageUrl: pageUrl,
    formatAlphaX: formatAlphaX,
    formatPct: formatPct,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    toast: toast,
    requireUser: requireUser,
    homeForRole: homeForRole,
    mountShell: mountShell,
    escapeHtml: escapeHtml,
    demoBanner: demoBanner,
    renderTicker: renderTicker,
    scriptsReady: scriptsReady,
  };
})();

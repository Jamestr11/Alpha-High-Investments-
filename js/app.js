/** Shared UI helpers for AlphaX Pages demo. */
window.AlphaXApp = (function () {
  function assetBase() {
    var path = location.pathname.replace(/\\/g, "/");
    if (/\/pages\//.test(path)) return "..";
    return ".";
  }

  function pageUrl(name) {
    var base = assetBase();
    if (name === "index" || name === "") {
      return base === ".." ? "../index.html" : "index.html";
    }
    return base === ".." ? name + ".html" : "pages/" + name + ".html";
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

  function formatAlphaXPlain(n) {
    var v = Number(n) || 0;
    return v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
        { id: "student", label: "Wallet", icon: "◇" },
        { id: "holdings", label: "Holdings", icon: "▣" },
        { id: "deposits", label: "Deposits", icon: "＋" },
        { id: "guides", label: "Guides", icon: "☰" },
      ];
    }
    if (user.role === "GUIDE") {
      return [
        { id: "guides", label: "Guides", icon: "☰" },
        { id: "deposits", label: "Deposits", icon: "＋" },
      ];
    }
    return [
      { id: "admin", label: "Inbox", icon: "◎" },
      { id: "funds", label: "Markets", icon: "▣" },
      { id: "students", label: "Students", icon: "◇" },
      { id: "deposits", label: "Deposits", icon: "＋" },
      { id: "guides", label: "Guides", icon: "☰" },
    ];
  }

  function mountShell(opts) {
    var user = opts.user;
    var active = opts.active;
    var root = document.getElementById("app");
    if (!root) return;

    var items = navFor(user);
    var topNav = items
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

    var bottomNav = items
      .map(function (item) {
        return (
          '<a href="' +
          pageUrl(item.id) +
          '" class="tab ' +
          (item.id === active ? "active" : "") +
          '"><span class="tab-icon" aria-hidden="true">' +
          item.icon +
          "</span><span>" +
          item.label +
          "</span></a>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="phone-frame">' +
      '<div class="shell">' +
      '<header class="topbar">' +
      '<a class="brand-lockup" href="' +
      homeForRole(user.role) +
      '">' +
      '<div class="brand-mark">αX</div>' +
      '<div class="brand-text"><strong>AlphaX</strong><span>Invest · demo</span></div>' +
      "</a>" +
      '<div class="user-chip">' +
      '<div class="meta"><strong>' +
      escapeHtml(user.name.split(" ")[0]) +
      "</strong><small>" +
      user.role +
      "</small></div>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-logout">Out</button>' +
      "</div></header>" +
      '<nav class="nav nav-compact" aria-label="Primary">' +
      topNav +
      "</nav>" +
      '<main class="main" id="main"></main>' +
      '<nav class="bottom-nav" aria-label="Tabs">' +
      bottomNav +
      "</nav>" +
      "</div></div>";

    var logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var go = function () {
          window.AlphaXStore.logout();
          location.href = pageUrl("index");
        };
        clerkSignOutBestEffort().then(go);
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
      '<div class="demo-banner"><div><strong>αX demo · no real money.</strong> ' +
      "Synthetic markets in this browser. Reset from login.</div></div>"
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
      var chart = window.AlphaXMarket.buildLiveChart(
        f,
        24,
        window.AlphaXStore.popularityBump(f.id)
      );
      var cls = chart.changePct >= 0 ? "up" : "down";
      var sym = f.symbol || f.name;
      return (
        '<span><span class="tkr-sym">' +
        escapeHtml(sym) +
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

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      var found = document.querySelector('script[src="' + src + '"]');
      if (found) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error("Failed to load " + src));
      };
      document.head.appendChild(s);
    });
  }

  function clerkSignOutBestEffort() {
    var base = assetBase() + "/js/";
    var clerk = window.__alphaxClerk;
    if (clerk && typeof clerk.signOut === "function") {
      return clerk.signOut().catch(function () {});
    }
    return loadScriptOnce(base + "clerk-config.js")
      .then(function () {
        return loadScriptOnce(base + "clerk-auth.js");
      })
      .then(function () {
        var auth = window.AlphaXClerkAuth;
        if (!auth || !auth.isConfigured()) return;
        return auth.getClerk().then(function (c) {
          if (c && typeof c.signOut === "function") return c.signOut();
        });
      })
      .catch(function () {});
  }

  return {
    assetBase: assetBase,
    pageUrl: pageUrl,
    formatAlphaX: formatAlphaX,
    formatAlphaXPlain: formatAlphaXPlain,
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
    clerkSignOutBestEffort: clerkSignOutBestEffort,
  };
})();

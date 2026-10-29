/**
 * Optional Clerk CDN auth for AlphaX Pages.
 * Loads @clerk/clerk-js only when a real publishable key is set.
 */
window.AlphaXClerkAuth = (function () {
  var CDN =
    "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js";
  var PLACEHOLDER_RE = /^(YOUR_CLERK|pk_test_paste|)$/i;
  var clerkInstance = null;
  var loadPromise = null;

  function publishableKey() {
    var cfg = window.AlphaXClerkConfig || {};
    var key = (cfg.CLERK_PUBLISHABLE_KEY || "").trim();
    return key;
  }

  function isConfigured() {
    var key = publishableKey();
    if (!key) return false;
    if (PLACEHOLDER_RE.test(key)) return false;
    if (key.indexOf("YOUR_CLERK") === 0) return false;
    if (key.indexOf("pk_") !== 0) return false;
    return true;
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function primaryEmailFromClerkUser(user) {
    if (!user) return "";
    if (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) {
      return normalizeEmail(user.primaryEmailAddress.emailAddress);
    }
    var list = user.emailAddresses || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].emailAddress) {
        return normalizeEmail(list[i].emailAddress);
      }
    }
    return "";
  }

  function findSeededUserByEmail(email) {
    var normalized = normalizeEmail(email);
    if (!normalized || !window.AlphaXStore) return null;
    var state = window.AlphaXStore.load();
    return (
      (state.users || []).find(function (u) {
        return u.email && normalizeEmail(u.email) === normalized;
      }) || null
    );
  }

  /**
   * Map a Clerk email onto a seeded AlphaX user.
   * james.finnpulichino@alpha.school → admin; other allowlisted emails → their rows.
   */
  function mapClerkEmailToUser(email) {
    return findSeededUserByEmail(email);
  }

  function applySessionForEmail(email) {
    var user = mapClerkEmailToUser(email);
    if (!user) {
      return {
        ok: false,
        error:
          "That Google account is not on the Alpha High allowlist. Use a seeded @alpha.school email, or Continue with school email for the demo.",
      };
    }
    window.AlphaXStore.setSession(user.id);
    return { ok: true, user: user };
  }

  function loadScript() {
    return new Promise(function (resolve, reject) {
      if (window.Clerk && typeof window.Clerk === "function") {
        resolve();
        return;
      }
      var existing = document.querySelector('script[data-alphax-clerk-cdn="1"]');
      if (existing) {
        existing.addEventListener("load", function () {
          resolve();
        });
        existing.addEventListener("error", function () {
          reject(new Error("Failed to load Clerk CDN script."));
        });
        return;
      }
      var s = document.createElement("script");
      s.src = CDN;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.dataset.alphaxClerkCdn = "1";
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error("Failed to load Clerk CDN script."));
      };
      document.head.appendChild(s);
    });
  }

  function getClerk() {
    if (!isConfigured()) {
      return Promise.resolve(null);
    }
    if (clerkInstance) {
      return Promise.resolve(clerkInstance);
    }
    if (loadPromise) return loadPromise;

    loadPromise = loadScript()
      .then(function () {
        var ClerkCtor = window.Clerk;
        if (!ClerkCtor) {
          throw new Error("Clerk global missing after CDN load.");
        }
        // CDN build: Clerk is a constructor when loaded without data- attributes.
        if (typeof ClerkCtor === "function") {
          clerkInstance = new ClerkCtor(publishableKey());
        } else {
          clerkInstance = ClerkCtor;
        }
        window.__alphaxClerk = clerkInstance;
        return clerkInstance.load().then(function () {
          return clerkInstance;
        });
      })
      .catch(function (err) {
        loadPromise = null;
        clerkInstance = null;
        throw err;
      });

    return loadPromise;
  }

  function signOut() {
    if (!clerkInstance) {
      return Promise.resolve();
    }
    return clerkInstance.signOut().catch(function () {});
  }

  function currentClerkEmail() {
    if (!clerkInstance || !clerkInstance.user) return "";
    return primaryEmailFromClerkUser(clerkInstance.user);
  }

  return {
    isConfigured: isConfigured,
    publishableKey: publishableKey,
    getClerk: getClerk,
    primaryEmailFromClerkUser: primaryEmailFromClerkUser,
    mapClerkEmailToUser: mapClerkEmailToUser,
    applySessionForEmail: applySessionForEmail,
    findSeededUserByEmail: findSeededUserByEmail,
    signOut: signOut,
    currentClerkEmail: currentClerkEmail,
  };
})();

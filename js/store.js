/** localStorage-backed fake DB for the Pages demo. */
window.AlphaXStore = (function () {
  var KEY = "alphax-pages-demo-v2";
  var SESSION = "alphax-pages-session";

  function uid(prefix) {
    return (
      prefix +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      Date.now().toString(36).slice(-4)
    );
  }

  function freshState() {
    var seed = window.AlphaXSeed;
    return {
      version: 2,
      settings: Object.assign({}, seed.SETTINGS, {
        termsText: seed.TERMS_TEXT,
      }),
      users: seed.ALLOWLIST.map(function (u) {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          balance: u.balance,
          note: u.note || null,
          termsAckVersion: null,
        };
      }),
      funds: seed.FUNDS.map(function (f) {
        return Object.assign({}, f);
      }),
      requests: [],
      holdings: [],
      deposits: [],
      cfoLog: [],
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        var state = freshState();
        save(state);
        return state;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 2) {
        var reset = freshState();
        save(reset);
        return reset;
      }
      // Ensure James’s roster if older demo mixed Campus Garden / Field Trip
      var names = (parsed.funds || []).map(function (f) {
        return f.name;
      });
      var expected = [
        "Class Pet",
        "Snack Fund",
        "Quiet Study",
        "Social Media",
        "Maker Lab",
        "AI Tools",
      ];
      var mismatch =
        names.length !== expected.length ||
        expected.some(function (n) {
          return names.indexOf(n) === -1;
        });
      if (mismatch) {
        parsed.funds = window.AlphaXSeed.FUNDS.map(function (f) {
          return Object.assign({}, f);
        });
        // Drop orphan requests/holdings pointing at removed funds
        var ids = {};
        parsed.funds.forEach(function (f) {
          ids[f.id] = true;
        });
        parsed.requests = (parsed.requests || []).filter(function (r) {
          return ids[r.fundId];
        });
        parsed.holdings = (parsed.holdings || []).filter(function (h) {
          return ids[h.fundId];
        });
        save(parsed);
      }
      return parsed;
    } catch (e) {
      var s = freshState();
      save(s);
      return s;
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function reset() {
    localStorage.removeItem(KEY);
    return load();
  }

  function getSession() {
    try {
      var id = sessionStorage.getItem(SESSION);
      if (!id) return null;
      var state = load();
      return state.users.find(function (u) {
        return u.id === id;
      }) || null;
    } catch (e) {
      return null;
    }
  }

  function setSession(userId) {
    if (userId) sessionStorage.setItem(SESSION, userId);
    else sessionStorage.removeItem(SESSION);
  }

  function logout() {
    setSession(null);
  }

  function updateUser(userId, patch) {
    var state = load();
    var u = state.users.find(function (x) {
      return x.id === userId;
    });
    if (!u) return null;
    Object.assign(u, patch);
    save(state);
    return u;
  }

  function notifyCfo(event, payload) {
    var state = load();
    state.cfoLog.unshift({
      id: uid("cfo"),
      at: new Date().toISOString(),
      event: event,
      payload: payload,
    });
    state.cfoLog = state.cfoLog.slice(0, 40);
    save(state);
    if (typeof console !== "undefined") {
      console.info("[CFO notify:mock]", event, payload);
    }
  }

  function pendingReserved(studentId) {
    var state = load();
    return state.requests
      .filter(function (r) {
        return r.studentId === studentId && r.status === "PENDING";
      })
      .reduce(function (s, r) {
        return s + r.amount;
      }, 0);
  }

  function availableBalance(studentId) {
    var state = load();
    var u = state.users.find(function (x) {
      return x.id === studentId;
    });
    if (!u) return 0;
    return Math.max(0, u.balance - pendingReserved(studentId));
  }

  function submitInvest(studentId, fundId, amount) {
    var state = load();
    var settings = state.settings;
    var student = state.users.find(function (u) {
      return u.id === studentId;
    });
    var fund = state.funds.find(function (f) {
      return f.id === fundId && f.active;
    });
    if (!student || student.role !== "STUDENT") {
      return { ok: false, error: "Only students can invest." };
    }
    if (!fund) return { ok: false, error: "Fund not found." };
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount < settings.minDeposit) {
      return {
        ok: false,
        error: "Minimum invest is " + settings.minDeposit + " AlphaX.",
      };
    }
    if (amount > availableBalance(studentId)) {
      return { ok: false, error: "Not enough available AlphaX." };
    }
    var req = {
      id: uid("req"),
      studentId: studentId,
      fundId: fundId,
      amount: Math.round(amount * 100) / 100,
      lockWeeks: settings.lockWeeks,
      weeklyReturnPercent: settings.weeklyReturnPercent,
      status: "PENDING",
      reason: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    state.requests.unshift(req);
    save(state);
    notifyCfo("submit", {
      requestId: req.id,
      student: student.name,
      fund: fund.name,
      amount: req.amount,
    });
    return { ok: true, request: req };
  }

  function decideRequest(requestId, adminId, approve, reason) {
    var state = load();
    var admin = state.users.find(function (u) {
      return u.id === adminId;
    });
    if (!admin || admin.role !== "ADMIN") {
      return { ok: false, error: "Admin only." };
    }
    var req = state.requests.find(function (r) {
      return r.id === requestId;
    });
    if (!req || req.status !== "PENDING") {
      return { ok: false, error: "Request not pending." };
    }
    var student = state.users.find(function (u) {
      return u.id === req.studentId;
    });
    var fund = state.funds.find(function (f) {
      return f.id === req.fundId;
    });
    if (!student || !fund) return { ok: false, error: "Missing student/fund." };

    if (approve) {
      if (student.balance < req.amount) {
        return { ok: false, error: "Student balance too low to approve." };
      }
      student.balance = Math.round((student.balance - req.amount) * 100) / 100;
      var start = new Date();
      var unlock = new Date(
        start.getTime() + req.lockWeeks * 7 * 24 * 60 * 60 * 1000
      );
      state.holdings.unshift({
        id: uid("hold"),
        studentId: student.id,
        fundId: fund.id,
        amountInvested: req.amount,
        lockWeeks: req.lockWeeks,
        weeklyReturnPercent: req.weeklyReturnPercent,
        startDate: start.toISOString(),
        unlockDate: unlock.toISOString(),
        requestId: req.id,
      });
      req.status = "APPROVED";
      req.reason = null;
    } else {
      req.status = "REJECTED";
      req.reason = (reason || "").trim() || "Rejected by James";
    }
    req.decidedAt = new Date().toISOString();
    save(state);
    notifyCfo(approve ? "approve" : "reject", {
      requestId: req.id,
      student: student.name,
      fund: fund.name,
      amount: req.amount,
      reason: req.reason,
    });
    return { ok: true, request: req };
  }

  function addDeposit(actorId, studentId, amount, note) {
    var state = load();
    var actor = state.users.find(function (u) {
      return u.id === actorId;
    });
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "GUIDE")) {
      return { ok: false, error: "Staff only." };
    }
    var student = state.users.find(function (u) {
      return u.id === studentId && u.role === "STUDENT";
    });
    if (!student) return { ok: false, error: "Student not found." };
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return { ok: false, error: "Enter a non-zero amount." };
    }
    student.balance = Math.round((student.balance + amount) * 100) / 100;
    var dep = {
      id: uid("dep"),
      studentId: student.id,
      amount: Math.round(amount * 100) / 100,
      note: note || "",
      byUserId: actor.id,
      at: new Date().toISOString(),
    };
    state.deposits.unshift(dep);
    save(state);
    return { ok: true, deposit: dep, balance: student.balance };
  }

  function setProjectHealth(adminId, fundId, score) {
    var state = load();
    var admin = state.users.find(function (u) {
      return u.id === adminId;
    });
    if (!admin || admin.role !== "ADMIN") {
      return { ok: false, error: "Admin only." };
    }
    var fund = state.funds.find(function (f) {
      return f.id === fundId;
    });
    if (!fund) return { ok: false, error: "Fund not found." };
    score = Number(score);
    if (!Number.isFinite(score)) return { ok: false, error: "Invalid score." };
    fund.projectHealth = Math.max(-2, Math.min(2, Math.round(score * 100) / 100));
    save(state);
    return { ok: true, fund: fund };
  }

  function setBalance(adminId, studentId, balance) {
    var state = load();
    var admin = state.users.find(function (u) {
      return u.id === adminId;
    });
    if (!admin || admin.role !== "ADMIN") {
      return { ok: false, error: "Admin only." };
    }
    var student = state.users.find(function (u) {
      return u.id === studentId && u.role === "STUDENT";
    });
    if (!student) return { ok: false, error: "Student not found." };
    balance = Number(balance);
    if (!Number.isFinite(balance) || balance < 0) {
      return { ok: false, error: "Balance must be ≥ 0." };
    }
    student.balance = Math.round(balance * 100) / 100;
    save(state);
    return { ok: true, student: student };
  }

  function ackTerms(userId) {
    var state = load();
    var u = state.users.find(function (x) {
      return x.id === userId;
    });
    if (!u) return { ok: false, error: "User not found." };
    u.termsAckVersion = state.settings.termsVersion;
    save(state);
    return { ok: true };
  }

  function popularityBump(fundId) {
    var state = load();
    var fund = state.funds.find(function (f) {
      return f.id === fundId;
    });
    if (!fund || !fund.popularityBoostEnabled) return 0;
    var byFund = {};
    state.holdings.forEach(function (h) {
      byFund[h.fundId] = (byFund[h.fundId] || 0) + h.amountInvested;
    });
    var amounts = state.funds.map(function (f) {
      return byFund[f.id] || 0;
    });
    if (!amounts.length) return 0;
    var avg =
      amounts.reduce(function (a, b) {
        return a + b;
      }, 0) / amounts.length;
    var mine = byFund[fundId] || 0;
    if (avg > 0 && mine > avg) return state.settings.popularityBoostPct;
    return 0;
  }

  function enrichHolding(holding) {
    var state = load();
    var fund = state.funds.find(function (f) {
      return f.id === holding.fundId;
    });
    if (!fund) return null;
    var market = window.AlphaXMarket.getMarketWeeks(52);
    var bump = popularityBump(fund.id);
    var returns = window.AlphaXMarket.fundWeeklyReturns({
      fundName: fund.name,
      expectedDriftPct: holding.weeklyReturnPercent,
      beta: fund.beta,
      volatility: fund.volatility,
      projectHealth: fund.projectHealth,
      popularityBumpPct: bump,
      marketWeeks: market.weeks,
    });
    var now = new Date();
    var unlock = new Date(holding.unlockDate);
    var end = now < unlock ? now : unlock;
    var compounded = window.AlphaXMarket.compoundThroughWeeks(
      holding.amountInvested,
      returns,
      new Date(holding.startDate),
      end,
      holding.lockWeeks
    );
    return {
      holding: holding,
      fund: fund,
      currentValue: compounded.value,
      weeksApplied: compounded.weeksApplied,
      pnl: Math.round((compounded.value - holding.amountInvested) * 100) / 100,
    };
  }

  return {
    KEY: KEY,
    load: load,
    save: save,
    reset: reset,
    getSession: getSession,
    setSession: setSession,
    logout: logout,
    updateUser: updateUser,
    pendingReserved: pendingReserved,
    availableBalance: availableBalance,
    submitInvest: submitInvest,
    decideRequest: decideRequest,
    addDeposit: addDeposit,
    setProjectHealth: setProjectHealth,
    setBalance: setBalance,
    ackTerms: ackTerms,
    popularityBump: popularityBump,
    enrichHolding: enrichHolding,
  };
})();

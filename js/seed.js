/** Seed data for AlphaX Invest Pages demo — artificial AlphaX only. */
window.AlphaXSeed = {
  TERMS_VERSION: "2026.1",
  TERMS_TEXT: `AlphaX Invest — Product terms (proposed by James; guides Logan & Michael acknowledge)

1. AlphaX is artificial school money only — not USD and not a real brokerage.
2. Investing locks AlphaX for a fixed number of weeks at a fixed % return per week.
3. No early withdrawals. Only James (Emporium / Financial Literacy Lead) approves or rejects invest requests.
4. Approved requests become holdings in this app. Guides own final AlphaX sheet edits — this app does not sync Logan’s Google Sheets.
5. Class Pet is a required fund. Other funds are artificial classroom products with simulated growth.
6. CFO (assistant) is notified on submit / approve / reject when configured.`,

  SETTINGS: {
    lockWeeks: 4,
    weeklyReturnPercent: 2.5,
    minDeposit: 10,
    popularityBoostPct: 0.25,
    termsVersion: "2026.1",
  },

  ALLOWLIST: [
    {
      id: "admin-james",
      name: "James Finn Pulichino (Admin)",
      email: "james.finnpulichino@alpha.school",
      role: "ADMIN",
      balance: 0,
    },
    {
      id: "guide-logan",
      name: "Logan (Guide)",
      email: null,
      role: "GUIDE",
      balance: 0,
      note: "Email TBD",
    },
    {
      id: "guide-michael",
      name: "Michael (Guide)",
      email: null,
      role: "GUIDE",
      balance: 0,
      note: "Email TBD",
    },
    {
      id: "stu-abi",
      name: "Abi Constain",
      email: "abigail.constain@alpha.school",
      role: "STUDENT",
      balance: 140,
    },
    {
      id: "stu-alessandro",
      name: "Alessandro Stewart",
      email: "alessandro.stewart@alpha.school",
      role: "STUDENT",
      balance: 175,
    },
    {
      id: "stu-boris",
      name: "Boris Dudarev",
      email: "boris.dudarev@alpha.school",
      role: "STUDENT",
      balance: 120,
    },
    {
      id: "stu-gavyn",
      name: "Gavyn Martinez",
      email: "gavyn.martinez@alpha.school",
      role: "STUDENT",
      balance: 160,
    },
    {
      id: "stu-isabella",
      name: "Isabella Vicente",
      email: "isabella.vicente@alpha.school",
      role: "STUDENT",
      balance: 155,
    },
    {
      id: "stu-james",
      name: "James Finn Pulichino",
      email: null,
      role: "STUDENT",
      balance: 250,
      note: "Student persona — Google maps to Admin",
    },
    {
      id: "stu-luca",
      name: "Luca Sanchez",
      email: "luca.sanchez@alpha.school",
      role: "STUDENT",
      balance: 130,
    },
    {
      id: "stu-marianna",
      name: "Marianna Kulpina",
      email: "marianna.kulpina@alpha.school",
      role: "STUDENT",
      balance: 190,
    },
    {
      id: "stu-penelope",
      name: "Penelope Marty",
      email: "penelope.marty@alpha.school",
      role: "STUDENT",
      balance: 145,
    },
    {
      id: "stu-savyan",
      name: "Savyan Reyes",
      email: "savyan.reyes@alpha.school",
      role: "STUDENT",
      balance: 110,
    },
    {
      id: "stu-sebastian",
      name: "Sebastian Cortazar",
      email: "sebastian.cortazar@alpha.school",
      role: "STUDENT",
      balance: 165,
    },
  ],

  /**
   * James’s fund roster — distinct market personalities.
   * Drift %/wk · β · vol · project health (−2…+2).
   */
  FUNDS: [
    {
      id: "fund-class-pet",
      name: "Class Pet",
      description:
        "Required class fund — steady community care for classroom pet enrichment. Gentle swings.",
      baseGrowthRate: 2.0,
      beta: 0.45,
      volatility: 0.55,
      projectHealth: 0.5,
      popularityBoostEnabled: true,
      required: true,
      sortOrder: 0,
      active: true,
      personality: "Defensive / gentle",
    },
    {
      id: "fund-snack",
      name: "Snack Fund",
      description:
        "Emporium snack & coffee runs. Mid tracker — chops with busy lunch weeks.",
      baseGrowthRate: 2.3,
      beta: 0.9,
      volatility: 0.95,
      projectHealth: 0.25,
      popularityBoostEnabled: true,
      required: false,
      sortOrder: 1,
      active: true,
      personality: "Mid tracker",
    },
    {
      id: "fund-quiet-study",
      name: "Quiet Study",
      description:
        "Study nooks & focus supplies. Most defensive; smallest market swings; no popularity boost.",
      baseGrowthRate: 1.5,
      beta: 0.25,
      volatility: 0.35,
      projectHealth: 0,
      popularityBoostEnabled: false,
      required: false,
      sortOrder: 2,
      active: true,
      personality: "Most defensive",
    },
    {
      id: "fund-social-media",
      name: "Social Media",
      description:
        "Campus content & reach pool. Trend-chaser — lively noise, sharp weekly moves.",
      baseGrowthRate: 2.7,
      beta: 1.25,
      volatility: 1.5,
      projectHealth: 0,
      popularityBoostEnabled: true,
      required: false,
      sortOrder: 3,
      active: true,
      personality: "Trend-chaser / high vol",
    },
    {
      id: "fund-maker-lab",
      name: "Maker Lab",
      description:
        "Tools & builds when the lab is busy. Aggressive beta — bigger ups and downs.",
      baseGrowthRate: 3.1,
      beta: 1.35,
      volatility: 1.45,
      projectHealth: 0.25,
      popularityBoostEnabled: true,
      required: false,
      sortOrder: 4,
      active: true,
      personality: "Aggressive",
    },
    {
      id: "fund-ai-tools",
      name: "AI Tools",
      description:
        "Classroom AI tooling & credits. Growth-leaning — high drift, elevated tech-like beta.",
      baseGrowthRate: 3.4,
      beta: 1.5,
      volatility: 1.6,
      projectHealth: 0,
      popularityBoostEnabled: true,
      required: false,
      sortOrder: 5,
      active: true,
      personality: "Growth / tech-like",
    },
  ],
};

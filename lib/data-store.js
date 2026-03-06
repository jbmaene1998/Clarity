const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DEFAULT_CATEGORIES, DEFAULT_SOURCES } = require("./constants");
const { parseAmount, validateTransactionInput } = require("./budget-core");

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function createDefaultData() {
  return {
    transactions: [],
    categories: [...DEFAULT_CATEGORIES],
    sources: [...DEFAULT_SOURCES],
    budgetLimits: {},
    recurrences: [],
    goals: [],
    goalSchedules: [],
    goalContributions: [],
    transactionRules: [],
    auditLog: [],
    settings: {
      onboarding: {
        tutorialCompleted: false,
        pinSetupSeen: false
      },
      appearance: {
        theme: "light"
      },
      budget: {
        rolloverEnabled: true
      },
      notifications: {
        budgetAlertsEnabled: true,
        budgetAlertThreshold: 0.8
      },
      automation: {
        autoCategorizeEnabled: true
      },
      security: {
        pinEnabled: false,
        pinSalt: "",
        pinHash: ""
      }
    }
  };
}

function toUtcDateString(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function monthPartsFrom(baseDate, monthOffset) {
  const year = baseDate.getUTCFullYear();
  const monthIndex = baseDate.getUTCMonth() + monthOffset;
  const shifted = new Date(Date.UTC(year, monthIndex, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1
  };
}

function createDemoData(currentDate = new Date()) {
  const now = new Date(currentDate);
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const year = safeNow.getUTCFullYear();
  const month = safeNow.getUTCMonth() + 1;
  const day = safeNow.getUTCDate();
  const demoTag = `${year}${String(month).padStart(2, "0")}`;
  const categories = [...DEFAULT_CATEGORIES, `Travel ${year}`, `Learning ${year}`];
  const sources = [...DEFAULT_SOURCES, `Side Hustle ${year}`];
  const transactions = [];

  const expenseTemplates = [
    { description: "Rent", category: "Housing", amount: 1280 },
    { description: "Supermarket", category: "Food & Groceries", amount: 145 },
    { description: "Metro Pass", category: "Transport", amount: 69 },
    { description: "Pharmacy", category: "Health", amount: 38 },
    { description: "Cinema", category: "Entertainment", amount: 24 },
    { description: "Online Order", category: "Shopping", amount: 82 },
    { description: "Electric Bill", category: "Utilities", amount: 112 },
    { description: "Weekend Trip", category: `Travel ${year}`, amount: 220 }
  ];

  for (const offset of [-2, -1, 0]) {
    const parts = monthPartsFrom(safeNow, offset);
    const monthCode = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const salaryAmount = round2(3600 + (parts.month % 4) * 75);
    const sideHustleAmount = round2(480 + ((parts.month + day) % 5) * 60);

    transactions.push({
      id: crypto.randomUUID(),
      date: toUtcDateString(parts.year, parts.month, 1),
      description: `Payroll ${monthCode}`,
      amount: salaryAmount,
      type: "income",
      category: "",
      source: "Salary"
    });
    transactions.push({
      id: crypto.randomUUID(),
      date: toUtcDateString(parts.year, parts.month, 12),
      description: `Client Sprint ${monthCode}`,
      amount: sideHustleAmount,
      type: "income",
      category: "",
      source: `Side Hustle ${year}`
    });

    expenseTemplates.forEach((template, index) => {
      const spreadDay = Math.min(28, 3 + index * 3);
      const monthVariance = ((parts.month + index + day) % 7) * 2.5;
      transactions.push({
        id: crypto.randomUUID(),
        date: toUtcDateString(parts.year, parts.month, spreadDay),
        description: `${template.description} ${monthCode}`,
        amount: round2(template.amount + monthVariance),
        type: "expense",
        category: template.category,
        source: ""
      });
    });
  }

  const emergencyGoal = {
    id: crypto.randomUUID(),
    name: `Emergency Fund ${year}`,
    target: 10000,
    current: round2(2800 + month * 120)
  };
  const travelGoal = {
    id: crypto.randomUUID(),
    name: `Summer Break ${year}`,
    target: 3200,
    current: round2(900 + day * 18)
  };

  return {
    transactions,
    categories,
    sources,
    budgetLimits: {
      Housing: round2(1350 + month * 10),
      "Food & Groceries": round2(520 + day),
      Transport: round2(230 + month * 4),
      Entertainment: round2(240 + (day % 5) * 15),
      [`Travel ${year}`]: 400
    },
    recurrences: [
      {
        id: crypto.randomUUID(),
        description: `Internet Plan ${demoTag}`,
        amount: 58,
        type: "expense",
        category: "Utilities",
        source: "",
        startDate: toUtcDateString(year, Math.max(1, month - 2), 5),
        dayOfMonth: 5,
        interval: "monthly"
      },
      {
        id: crypto.randomUUID(),
        description: `Membership Rebate ${demoTag}`,
        amount: 95,
        type: "income",
        category: "",
        source: "Bonus",
        startDate: toUtcDateString(year, Math.max(1, month - 1), 20),
        dayOfMonth: 20,
        interval: "monthly"
      }
    ],
    goals: [emergencyGoal, travelGoal],
    goalSchedules: [
      {
        id: crypto.randomUUID(),
        goalId: emergencyGoal.id,
        source: "Salary",
        amount: 250,
        dayOfMonth: 2,
        startDate: toUtcDateString(year, Math.max(1, month - 1), 2)
      }
    ],
    goalContributions: [
      {
        id: crypto.randomUUID(),
        goalId: travelGoal.id,
        amount: 150,
        date: toUtcDateString(year, month, Math.min(25, day)),
        source: "Manual",
        note: "manual"
      }
    ],
    transactionRules: [
      {
        id: crypto.randomUUID(),
        keyword: "rent",
        type: "expense",
        category: "Housing",
        source: "",
        enabled: true
      },
      {
        id: crypto.randomUUID(),
        keyword: "payroll",
        type: "income",
        category: "",
        source: "Salary",
        enabled: true
      }
    ],
    auditLog: [],
    settings: {
      onboarding: {
        tutorialCompleted: true
      },
      appearance: {
        theme: "light"
      },
      budget: {
        rolloverEnabled: true
      },
      notifications: {
        budgetAlertsEnabled: true,
        budgetAlertThreshold: 0.8
      },
      automation: {
        autoCategorizeEnabled: true
      },
      security: {
        pinEnabled: false,
        pinSalt: "",
        pinHash: ""
      }
    }
  };
}

function normalizeSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const onboarding = source.onboarding && typeof source.onboarding === "object"
    ? source.onboarding
    : {};
  const appearance = source.appearance && typeof source.appearance === "object"
    ? source.appearance
    : {};
  const budget = source.budget && typeof source.budget === "object"
    ? source.budget
    : {};
  const notifications = source.notifications && typeof source.notifications === "object"
    ? source.notifications
    : {};
  const automation = source.automation && typeof source.automation === "object"
    ? source.automation
    : {};
  const security = source.security && typeof source.security === "object"
    ? source.security
    : {};
  const theme = appearance.theme === "dark" ? "dark" : "light";
  const thresholdRaw = Number(notifications.budgetAlertThreshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0.5, round2(thresholdRaw)))
    : 0.8;
  const pinSalt = typeof security.pinSalt === "string" ? security.pinSalt : "";
  const pinHash = typeof security.pinHash === "string" ? security.pinHash : "";
  const pinEnabled = Boolean(security.pinEnabled) && pinSalt.length > 0 && pinHash.length > 0;
  return {
    onboarding: {
      tutorialCompleted: Boolean(onboarding.tutorialCompleted),
      pinSetupSeen: Boolean(onboarding.pinSetupSeen)
    },
    appearance: {
      theme
    },
    budget: {
      rolloverEnabled: budget.rolloverEnabled !== false
    },
    notifications: {
      budgetAlertsEnabled: notifications.budgetAlertsEnabled !== false,
      budgetAlertThreshold: threshold
    },
    automation: {
      autoCategorizeEnabled: automation.autoCategorizeEnabled !== false
    },
    security: {
      pinEnabled,
      pinSalt: pinEnabled ? pinSalt : "",
      pinHash: pinEnabled ? pinHash : ""
    }
  };
}

function hashPin(pin, salt) {
  return crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== "object") return null;
  const keyword = typeof rule.keyword === "string" ? rule.keyword.trim() : "";
  const type = rule.type === "income" || rule.type === "expense" ? rule.type : "";
  const category = typeof rule.category === "string" ? rule.category.trim() : "";
  const source = typeof rule.source === "string" ? rule.source.trim() : "";
  if (!keyword || !type) return null;
  return {
    id: typeof rule.id === "string" && rule.id ? rule.id : crypto.randomUUID(),
    keyword,
    type,
    category,
    source,
    enabled: rule.enabled !== false
  };
}

function normalizeData(parsed) {
  return {
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    categories: Array.isArray(parsed.categories) ? parsed.categories : [...DEFAULT_CATEGORIES],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [...DEFAULT_SOURCES],
    budgetLimits:
      parsed.budgetLimits && typeof parsed.budgetLimits === "object" ? parsed.budgetLimits : {},
    recurrences: Array.isArray(parsed.recurrences) ? parsed.recurrences : [],
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    goalSchedules: Array.isArray(parsed.goalSchedules) ? parsed.goalSchedules : [],
    goalContributions: Array.isArray(parsed.goalContributions) ? parsed.goalContributions : [],
    transactionRules: Array.isArray(parsed.transactionRules)
      ? parsed.transactionRules.map(normalizeRule).filter(Boolean)
      : [],
    auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    settings: normalizeSettings(parsed.settings)
  };
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function monthKeyFor(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(monthKey) {
  const [yearRaw, monthRaw] = String(monthKey).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

class DataStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(this.dataDir, "budget-data.json");
    this.data = createDefaultData();
    this.startupWarnings = [];
  }

  init(options = {}) {
    const useDemoSeed = options && options.demoSeed === true;
    const demoNow = options && options.now ? options.now : new Date();
    fs.mkdirSync(this.dataDir, { recursive: true });
    if (useDemoSeed) {
      this.saveToDisk(createDemoData(demoNow));
    } else if (!fs.existsSync(this.filePath)) {
      this.saveToDisk(createDefaultData());
    }
    try {
      this.loadFromDisk();
      const addedRecurring = this.materializeRecurringTransactionsUpTo(new Date());
      const addedGoalContribs = this.materializeGoalContributionsUpTo(new Date());
      if (addedRecurring > 0 || addedGoalContribs > 0) {
        this.saveCurrent();
      }
    } catch (error) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const corruptPath = path.join(this.dataDir, `budget-data.corrupt-${timestamp}.json`);
      try {
        fs.copyFileSync(this.filePath, corruptPath);
      } catch (_copyError) {
        // Best effort backup only.
      }
      this.data = createDefaultData();
      this.saveToDisk(this.data);
      this.startupWarnings.push(
        "Your data file was unreadable and has been reset. A backup was created in the app data folder."
      );
    }
    return this.getData();
  }

  loadFromDisk() {
    const raw = fs.readFileSync(this.filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && parsed.encrypted === true) {
      throw new Error("Data file is encrypted. PIN support has been removed. Data reset to defaults.");
    }
    this.data = normalizeData(parsed);
  }

  saveToDisk(nextData) {
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(nextData, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
    this.data = nextData;
  }

  saveCurrent() {
    this.saveToDisk(this.data);
  }

  resetAllData() {
    const defaults = createDefaultData();
    this.saveToDisk(defaults);
    return this.getData();
  }

  getData() {
    return cloneDeep(this.data);
  }

  updateOnboardingSettings(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid onboarding settings payload");
    }
    const next = {
      ...this.data.settings.onboarding,
      ...patch
    };
    this.data.settings.onboarding = {
      tutorialCompleted: Boolean(next.tutorialCompleted),
      pinSetupSeen: Boolean(next.pinSetupSeen)
    };
    this.saveCurrent();
    return this.data.settings;
  }

  updateAppearanceSettings(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid appearance settings payload");
    }
    const next = {
      ...this.data.settings.appearance,
      ...patch
    };
    const theme = next.theme === "dark" ? "dark" : "light";
    this.data.settings.appearance = { theme };
    this.saveCurrent();
    return this.data.settings;
  }

  updateBudgetSettings(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid budget settings payload");
    }
    const next = {
      ...this.data.settings.budget,
      ...patch
    };
    this.data.settings.budget = {
      rolloverEnabled: next.rolloverEnabled !== false
    };
    this.saveCurrent();
    return this.data.settings;
  }

  updateNotificationSettings(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid notification settings payload");
    }
    const current = this.data.settings.notifications || {};
    const next = { ...current, ...patch };
    const thresholdRaw = Number(next.budgetAlertThreshold);
    this.data.settings.notifications = {
      budgetAlertsEnabled: next.budgetAlertsEnabled !== false,
      budgetAlertThreshold: Number.isFinite(thresholdRaw)
        ? Math.min(1, Math.max(0.5, round2(thresholdRaw)))
        : 0.8
    };
    this.saveCurrent();
    return this.data.settings;
  }

  updateAutomationSettings(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid automation settings payload");
    }
    const current = this.data.settings.automation || {};
    const next = { ...current, ...patch };
    this.data.settings.automation = {
      autoCategorizeEnabled: next.autoCategorizeEnabled !== false
    };
    this.saveCurrent();
    return this.data.settings;
  }

  setPin(pin) {
    const value = String(pin || "").trim();
    if (!/^\d{4,12}$/.test(value)) {
      throw new Error("PIN must be 4 to 12 digits");
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const pinHash = hashPin(value, salt);
    this.data.settings.security = {
      pinEnabled: true,
      pinSalt: salt,
      pinHash
    };
    this.saveCurrent();
    return this.data.settings;
  }

  verifyPin(pin) {
    const security = this.data.settings?.security || {};
    if (!security.pinEnabled) {
      return { ok: true, verified: true };
    }
    const value = String(pin || "").trim();
    const computed = hashPin(value, security.pinSalt || "");
    const verified = computed === security.pinHash;
    return { ok: true, verified };
  }

  disablePin(pin) {
    const result = this.verifyPin(pin);
    if (!result.verified) {
      throw new Error("Current PIN is incorrect");
    }
    this.data.settings.security = {
      pinEnabled: false,
      pinSalt: "",
      pinHash: ""
    };
    this.saveCurrent();
    return this.data.settings;
  }

  consumeStartupWarnings() {
    const warnings = [...this.startupWarnings];
    this.startupWarnings = [];
    return warnings;
  }

  appendAuditLog(entry) {
    const nextEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.auditLog.unshift(nextEntry);
    if (this.data.auditLog.length > 200) {
      this.data.auditLog.length = 200;
    }
  }

  applyAutoRule(payload) {
    const enabled = this.data.settings?.automation?.autoCategorizeEnabled !== false;
    if (!enabled) return payload;
    const description = typeof payload.description === "string" ? payload.description.toLowerCase() : "";
    if (!description) return payload;
    for (const rule of this.data.transactionRules) {
      if (!rule.enabled) continue;
      const keyword = rule.keyword.toLowerCase();
      if (!keyword || !description.includes(keyword)) continue;
      if (!payload.type && rule.type) {
        payload.type = rule.type;
      }
      if (payload.type === "expense" && (!payload.category || !String(payload.category).trim()) && rule.category) {
        payload.category = rule.category;
      }
      if (payload.type === "income" && (!payload.source || !String(payload.source).trim()) && rule.source) {
        payload.source = rule.source;
      }
      break;
    }
    return payload;
  }

  addTransaction(input, options = {}) {
    const payload = this.applyAutoRule({ ...input });
    const validationError = validateTransactionInput(payload, this.data.categories, this.data.sources);
    if (validationError) {
      throw new Error(validationError);
    }

    const record = {
      id: crypto.randomUUID(),
      date: new Date(payload.date).toISOString().slice(0, 10),
      description: payload.description.trim(),
      amount: parseAmount(payload.amount),
      type: payload.type
    };
    if (payload.type === "expense") {
      record.category = payload.category;
      record.source = "";
    } else {
      record.category = "";
      record.source = payload.source.trim();
    }
    this.data.transactions.push(record);
    if (!options.skipAudit) {
      this.appendAuditLog({
        type: "transaction-add",
        transaction: cloneDeep(record)
      });
    }
    this.saveCurrent();
    return record;
  }

  restoreTransaction(input, options = {}) {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid transaction payload");
    }
    if (typeof input.id !== "string" || input.id.trim().length === 0) {
      throw new Error("Transaction id is required");
    }
    const exists = this.data.transactions.some((tx) => tx.id === input.id);
    if (exists) {
      throw new Error("Transaction id already exists");
    }

    const validationError = validateTransactionInput(input, this.data.categories, this.data.sources);
    if (validationError) {
      throw new Error(validationError);
    }

    const record = {
      id: input.id,
      date: new Date(input.date).toISOString().slice(0, 10),
      description: input.description.trim(),
      amount: parseAmount(input.amount),
      type: input.type,
      category: input.type === "expense" ? input.category : "",
      source: input.type === "income" ? input.source.trim() : ""
    };
    this.data.transactions.push(record);
    if (!options.skipAudit) {
      this.appendAuditLog({
        type: "transaction-restore",
        transaction: cloneDeep(record)
      });
    }
    this.saveCurrent();
    return record;
  }

  deleteTransaction(id, options = {}) {
    const before = this.data.transactions.length;
    const deleted = this.data.transactions.find((tx) => tx.id === id) || null;
    this.data.transactions = this.data.transactions.filter((tx) => tx.id !== id);
    if (this.data.transactions.length === before) {
      throw new Error("Transaction not found");
    }
    if (!options.skipAudit && deleted) {
      this.appendAuditLog({
        type: "transaction-delete",
        transaction: cloneDeep(deleted)
      });
    }
    this.saveCurrent();
    return deleted;
  }

  undoLastTransactionAction() {
    const entry = this.data.auditLog.find((item) => item && item.type && String(item.type).startsWith("transaction-"));
    if (!entry) {
      throw new Error("No transaction action available to undo");
    }
    this.data.auditLog = this.data.auditLog.filter((item) => item.id !== entry.id);

    if (entry.type === "transaction-add") {
      this.deleteTransaction(entry.transaction.id, { skipAudit: true });
      return { undone: "transaction-add", data: this.getData() };
    }
    if (entry.type === "transaction-delete") {
      this.restoreTransaction(entry.transaction, { skipAudit: true });
      return { undone: "transaction-delete", data: this.getData() };
    }
    if (entry.type === "transaction-restore") {
      this.deleteTransaction(entry.transaction.id, { skipAudit: true });
      return { undone: "transaction-restore", data: this.getData() };
    }
    throw new Error("Unsupported transaction audit entry");
  }

  addTransactionRule(input) {
    const rule = normalizeRule(input);
    if (!rule) {
      throw new Error("Rule requires keyword, type, and valid target");
    }
    if (rule.type === "expense") {
      if (!rule.category || !this.data.categories.includes(rule.category)) {
        throw new Error("Rule category must be an existing category");
      }
      rule.source = "";
    } else {
      if (!rule.source || !this.data.sources.includes(rule.source)) {
        throw new Error("Rule source must be an existing source");
      }
      rule.category = "";
    }
    this.data.transactionRules.push(rule);
    this.saveCurrent();
    return rule;
  }

  deleteTransactionRule(id) {
    const before = this.data.transactionRules.length;
    this.data.transactionRules = this.data.transactionRules.filter((rule) => rule.id !== id);
    if (this.data.transactionRules.length === before) {
      throw new Error("Rule not found");
    }
    this.saveCurrent();
  }

  addCategory(name) {
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (normalizedName.length === 0) {
      throw new Error("Category name is required");
    }
    if (this.data.categories.includes(normalizedName)) {
      throw new Error("Category already exists");
    }
    this.data.categories.push(normalizedName);
    this.saveCurrent();
  }

  addSource(name) {
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (normalizedName.length === 0) {
      throw new Error("Source name is required");
    }
    if (this.data.sources.includes(normalizedName)) {
      throw new Error("Source already exists");
    }
    this.data.sources.push(normalizedName);
    this.saveCurrent();
  }

  deleteCategory(name) {
    if (!this.data.categories.includes(name)) {
      throw new Error("Category not found");
    }
    const hasTransactions = this.data.transactions.some((tx) => tx.category === name);
    if (hasTransactions) {
      throw new Error("Category cannot be deleted because transactions are assigned to it");
    }
    this.data.categories = this.data.categories.filter((category) => category !== name);
    delete this.data.budgetLimits[name];
    this.data.recurrences = this.data.recurrences.filter((item) => item.category !== name);
    this.saveCurrent();
  }

  deleteSource(name) {
    if (!this.data.sources.includes(name)) {
      throw new Error("Source not found");
    }
    const hasTransactions = this.data.transactions.some((tx) => tx.type === "income" && tx.source === name);
    if (hasTransactions) {
      throw new Error("Source cannot be deleted because transactions are assigned to it");
    }
    this.data.sources = this.data.sources.filter((source) => source !== name);
    this.data.recurrences = this.data.recurrences.filter((item) => item.source !== name);
    this.saveCurrent();
  }

  setBudgetLimit(category, rawLimit) {
    if (!this.data.categories.includes(category)) {
      throw new Error("Category not found");
    }
    const isBlank = rawLimit === "" || rawLimit === null || typeof rawLimit === "undefined";
    if (isBlank) {
      delete this.data.budgetLimits[category];
      this.saveCurrent();
      return;
    }

    const limit = Number(rawLimit);
    if (!Number.isFinite(limit) || limit < 0) {
      throw new Error("Limit must be a non-negative number");
    }

    if (limit === 0) {
      delete this.data.budgetLimits[category];
    } else {
      this.data.budgetLimits[category] = Math.round((limit + Number.EPSILON) * 100) / 100;
    }
    this.saveCurrent();
  }

  addRecurring(input) {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid recurring payload");
    }
    const startDate = input.startDate || input.date;
    const day = Number(input.dayOfMonth || new Date(startDate).getUTCDate());
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new Error("Recurring day must be between 1 and 31");
    }

    const validationError = validateTransactionInput(
      {
        date: startDate,
        description: input.description,
        amount: input.amount,
        type: input.type,
        category: input.category,
        source: input.source
      },
      this.data.categories,
      this.data.sources
    );
    if (validationError) {
      throw new Error(validationError);
    }

    const recurring = {
      id: crypto.randomUUID(),
      description: input.description.trim(),
      amount: parseAmount(input.amount),
      type: input.type,
      category: input.type === "expense" ? input.category : "",
      source: input.type === "income" ? input.source.trim() : "",
      startDate: new Date(startDate).toISOString().slice(0, 10),
      dayOfMonth: day,
      interval: "monthly"
    };
    this.data.recurrences.push(recurring);
    this.materializeRecurringTransactionsUpTo(new Date());
    this.saveCurrent();
    return recurring;
  }

  deleteRecurring(id) {
    const before = this.data.recurrences.length;
    this.data.recurrences = this.data.recurrences.filter((item) => item.id !== id);
    if (this.data.recurrences.length === before) {
      throw new Error("Recurring item not found");
    }
    this.saveCurrent();
  }

  materializeRecurringTransactionsUpTo(untilDate) {
    const until = new Date(untilDate);
    if (Number.isNaN(until.getTime())) {
      return 0;
    }
    const untilKey = monthKeyFor(until);
    if (!untilKey) {
      return 0;
    }
    let addedCount = 0;

    const existingKeys = new Set(
      this.data.transactions
        .filter((tx) => tx.recurrenceId && tx.recurrenceKey)
        .map((tx) => `${tx.recurrenceId}:${tx.recurrenceKey}`)
    );

    for (const rec of this.data.recurrences) {
      const startKey = monthKeyFor(rec.startDate);
      if (!startKey) {
        continue;
      }
      let cursor = parseMonthKey(startKey);
      const untilParts = parseMonthKey(untilKey);
      if (!cursor || !untilParts) {
        continue;
      }

      while (
        cursor.year < untilParts.year ||
        (cursor.year === untilParts.year && cursor.month <= untilParts.month)
      ) {
        const recurrenceKey = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
        const dedupe = `${rec.id}:${recurrenceKey}`;
        if (!existingKeys.has(dedupe)) {
          const lastDay = lastDayOfMonth(cursor.year, cursor.month);
          const day = Math.min(rec.dayOfMonth, lastDay);
          const txDate = `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          this.data.transactions.push({
            id: crypto.randomUUID(),
            date: txDate,
            description: rec.description,
            amount: rec.amount,
            type: rec.type,
            category: rec.type === "expense" ? rec.category : "",
            source: rec.type === "income" ? rec.source : "",
            recurrenceId: rec.id,
            recurrenceKey
          });
          existingKeys.add(dedupe);
          addedCount += 1;
        }

        cursor.month += 1;
        if (cursor.month > 12) {
          cursor.month = 1;
          cursor.year += 1;
        }
      }
    }
    return addedCount;
  }

  materializeGoalContributionsUpTo(untilDate) {
    const until = new Date(untilDate);
    if (Number.isNaN(until.getTime())) {
      return 0;
    }
    const untilKey = monthKeyFor(until);
    if (!untilKey) {
      return 0;
    }
    const existingKeys = new Set(
      this.data.goalContributions
        .filter((item) => item.scheduleId && item.scheduleKey)
        .map((item) => `${item.scheduleId}:${item.scheduleKey}`)
    );
    let added = 0;
    const untilParts = parseMonthKey(untilKey);
    if (!untilParts) return 0;

    for (const schedule of this.data.goalSchedules) {
      const goal = this.data.goals.find((item) => item.id === schedule.goalId);
      if (!goal) continue;
      const startKey = monthKeyFor(schedule.startDate);
      const cursorInit = parseMonthKey(startKey);
      if (!cursorInit) continue;
      const cursor = { ...cursorInit };
      while (
        cursor.year < untilParts.year ||
        (cursor.year === untilParts.year && cursor.month <= untilParts.month)
      ) {
        const scheduleKey = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
        const dedupe = `${schedule.id}:${scheduleKey}`;
        if (!existingKeys.has(dedupe)) {
          const day = Math.min(schedule.dayOfMonth, lastDayOfMonth(cursor.year, cursor.month));
          const date = `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const contribution = {
            id: crypto.randomUUID(),
            goalId: goal.id,
            amount: schedule.amount,
            date,
            source: schedule.source,
            scheduleId: schedule.id,
            scheduleKey,
            note: "auto"
          };
          this.data.goalContributions.push(contribution);
          goal.current = round2(goal.current + schedule.amount);
          existingKeys.add(dedupe);
          added += 1;
        }
        cursor.month += 1;
        if (cursor.month > 12) {
          cursor.month = 1;
          cursor.year += 1;
        }
      }
    }
    return added;
  }

  addGoal(name, target) {
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const parsedTarget = Number(target);
    if (normalizedName.length === 0) {
      throw new Error("Goal name is required");
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      throw new Error("Goal target must be greater than zero");
    }
    const exists = this.data.goals.some((goal) => goal.name === normalizedName);
    if (exists) {
      throw new Error("Goal already exists");
    }
    const goal = {
      id: crypto.randomUUID(),
      name: normalizedName,
      target: round2(parsedTarget),
      current: 0
    };
    this.data.goals.push(goal);
    this.saveCurrent();
    return goal;
  }

  contributeGoal(id, amount) {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Contribution must be greater than zero");
    }
    const goal = this.data.goals.find((item) => item.id === id);
    if (!goal) {
      throw new Error("Goal not found");
    }
    goal.current = round2(goal.current + parsedAmount);
    this.data.goalContributions.push({
      id: crypto.randomUUID(),
      goalId: goal.id,
      amount: round2(parsedAmount),
      date: new Date().toISOString().slice(0, 10),
      source: "Manual",
      note: "manual"
    });
    this.saveCurrent();
    return goal;
  }

  deleteGoal(id) {
    const before = this.data.goals.length;
    this.data.goals = this.data.goals.filter((goal) => goal.id !== id);
    if (this.data.goals.length === before) {
      throw new Error("Goal not found");
    }
    this.data.goalSchedules = this.data.goalSchedules.filter((item) => item.goalId !== id);
    this.data.goalContributions = this.data.goalContributions.filter((item) => item.goalId !== id);
    this.saveCurrent();
  }

  addGoalSchedule(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid goal schedule payload");
    }
    const goalId = String(payload.goalId || "");
    const goal = this.data.goals.find((item) => item.id === goalId);
    if (!goal) {
      throw new Error("Goal not found");
    }
    const source = typeof payload.source === "string" ? payload.source.trim() : "";
    if (!source || !this.data.sources.includes(source)) {
      throw new Error("Schedule source must be an existing source");
    }
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Schedule amount must be greater than zero");
    }
    const day = Number(payload.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new Error("Schedule day must be between 1 and 31");
    }
    const startDate = new Date(payload.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Schedule start date is invalid");
    }
    const schedule = {
      id: crypto.randomUUID(),
      goalId,
      source,
      amount: round2(amount),
      dayOfMonth: day,
      startDate: startDate.toISOString().slice(0, 10)
    };
    this.data.goalSchedules.push(schedule);
    this.materializeGoalContributionsUpTo(new Date());
    this.saveCurrent();
    return schedule;
  }

  deleteGoalSchedule(id) {
    const before = this.data.goalSchedules.length;
    this.data.goalSchedules = this.data.goalSchedules.filter((item) => item.id !== id);
    if (this.data.goalSchedules.length === before) {
      throw new Error("Goal schedule not found");
    }
    this.saveCurrent();
  }

  exportTransactionsAsCsv() {
    const headers = ["date", "description", "amount", "type", "category", "source"];
    const escapeField = (value) => {
      const raw = value === undefined || value === null ? "" : String(value);
      if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
        return `"${raw.replace(/"/g, "\"\"")}"`;
      }
      return raw;
    };
    const lines = [headers.join(",")];
    for (const tx of this.data.transactions) {
      lines.push(
        [
          tx.date,
          tx.description,
          tx.amount,
          tx.type,
          tx.category || "",
          tx.source || ""
        ]
          .map(escapeField)
          .join(",")
      );
    }
    return lines.join("\n");
  }

  importTransactionsFromCsvRows(rows) {
    let imported = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        this.addTransaction({
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          category: row.category,
          source: row.source
        });
        imported += 1;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }
    return { imported, errors };
  }

  exportBackupPayload() {
    return {
      app: "Clarity",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data: this.getData()
    };
  }

  importBackupPayload(payload) {
    if (!payload || typeof payload !== "object" || !payload.data) {
      throw new Error("Backup payload is invalid");
    }
    const normalized = normalizeData(payload.data);
    this.saveToDisk(normalized);
    return this.getData();
  }
}

module.exports = {
  DataStore,
  createDefaultData,
  createDemoData
};

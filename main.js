const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, ipcMain } = require("electron");
const { dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const { DataStore } = require("./lib/data-store");

let mainWindow;
let store;
let updateDownloaded = false;
let installingUpdate = false;
let logPath = "";
let isDemoMode = false;

function isTruthyEnvFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function detectDemoMode() {
  const hasCliFlag = process.argv.some((arg) => arg === "--demo" || arg.startsWith("--demo="));
  const fromNpmConfig = isTruthyEnvFlag(process.env.npm_config_demo);
  const fromEnv = isTruthyEnvFlag(process.env.CLARITY_DEMO);
  return hasCliFlag || fromNpmConfig || fromEnv;
}

function resolveWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icons", "app.ico");
  }
  return path.join(__dirname, "build", "icons", "app.ico");
}

function logEvent(message) {
  if (!logPath) {
    return;
  }
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch (_error) {
    // Diagnostics must never crash app flow.
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === "\"" && next === "\"") {
        value += "\"";
        i += 1;
      } else if (ch === "\"") {
        inQuotes = false;
      } else {
        value += ch;
      }
      continue;
    }
    if (ch === "\"") {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(value);
      value = "";
      continue;
    }
    if (ch === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }
    if (ch !== "\r") {
      value += ch;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0f1418",
    icon: resolveWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "renderer", "index.html"));
  }
}

function wireIpc() {
  ipcMain.handle("app:get-version", () => app.getVersion());

  ipcMain.handle("data:get", () => {
    try { return store.getData(); } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("settings:update-onboarding", (_event, payload) => {
    try {
      const settings = store.updateOnboardingSettings(payload);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("settings:update-appearance", (_event, payload) => {
    try {
      const settings = store.updateAppearanceSettings(payload);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("settings:update-budget", (_event, payload) => {
    try {
      const settings = store.updateBudgetSettings(payload);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("settings:update-notifications", (_event, payload) => {
    try {
      const settings = store.updateNotificationSettings(payload);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("settings:update-automation", (_event, payload) => {
    try {
      const settings = store.updateAutomationSettings(payload);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("security:set-pin", (_event, payload) => {
    try {
      const settings = store.setPin(payload.pin);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("security:disable-pin", (_event, payload) => {
    try {
      const settings = store.disablePin(payload.pin);
      return { ok: true, settings, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("security:verify-pin", (_event, payload) => {
    try {
      return store.verifyPin(payload.pin);
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("data:reset-all", () => {
    try {
      const data = store.resetAllData();
      return { ok: true, data };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("transaction:add", (_event, payload) => {
    try {
      const tx = store.addTransaction(payload);
      return { ok: true, transaction: tx, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("transaction:delete", (_event, payload) => {
    try {
      const deleted = store.deleteTransaction(payload.id);
      return { ok: true, deleted, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("transaction:restore", (_event, payload) => {
    try {
      const tx = store.restoreTransaction(payload.transaction);
      return { ok: true, transaction: tx, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("transaction:undo-last", () => {
    try {
      const result = store.undoLastTransactionAction();
      return { ok: true, ...result };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("category:add", (_event, payload) => {
    try {
      store.addCategory(payload.name);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("category:delete", (_event, payload) => {
    try {
      store.deleteCategory(payload.name, payload.monthKey);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("source:add", (_event, payload) => {
    try {
      store.addSource(payload.name);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("source:delete", (_event, payload) => {
    try {
      store.deleteSource(payload.name);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("limit:set", (_event, payload) => {
    try {
      store.setBudgetLimit(payload.category, payload.limit, payload.monthKey);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("recurring:add", (_event, payload) => {
    try {
      store.addRecurring(payload);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("recurring:delete", (_event, payload) => {
    try {
      store.deleteRecurring(payload.id);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("recurring:materialize-until", (_event, payload) => {
    try {
      const monthKey = String(payload.monthKey || "");
      const [yearRaw, monthRaw] = monthKey.split("-");
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
        const endOfMonth = new Date(Date.UTC(year, month, 0));
        const added = store.materializeRecurringTransactionsUpTo(endOfMonth);
        const addedGoalContribs = store.materializeGoalContributionsUpTo(endOfMonth);
        if (added > 0 || addedGoalContribs > 0) {
          store.saveCurrent();
        }
      }
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("rules:add", (_event, payload) => {
    try {
      const rule = store.addTransactionRule(payload);
      return { ok: true, rule, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("rules:delete", (_event, payload) => {
    try {
      store.deleteTransactionRule(payload.id);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("goal:add", (_event, payload) => {
    try {
      store.addGoal(payload.name, payload.target);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("goal:contribute", (_event, payload) => {
    try {
      store.contributeGoal(payload.id, payload.amount);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("goal:delete", (_event, payload) => {
    try {
      store.deleteGoal(payload.id);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("goal:schedule:add", (_event, payload) => {
    try {
      const schedule = store.addGoalSchedule(payload);
      return { ok: true, schedule, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle("goal:schedule:delete", (_event, payload) => {
    try {
      store.deleteGoalSchedule(payload.id);
      return { ok: true, data: store.getData() };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle("data:export-csv", async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Transactions",
      defaultPath: `clarity-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: "CSV Files", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) {
      return { ok: true, canceled: true };
    }
    const csv = store.exportTransactionsAsCsv();
    fs.writeFileSync(result.filePath, csv, "utf8");
    return { ok: true, canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("data:import-csv", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import Transactions",
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
      properties: ["openFile"]
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { ok: true, canceled: true };
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf8");
    const rows = parseCsv(content);
    if (rows.length === 0) {
      return { ok: false, error: "CSV file is empty" };
    }
    const header = rows[0].map((v) => v.trim().toLowerCase());
    const index = {
      date: header.indexOf("date"),
      description: header.indexOf("description"),
      amount: header.indexOf("amount"),
      type: header.indexOf("type"),
      category: header.indexOf("category"),
      source: header.indexOf("source")
    };
    if (index.date < 0 || index.description < 0 || index.amount < 0 || index.type < 0) {
      return {
        ok: false,
        error: "CSV must include headers: date, description, amount, type (category/source optional)"
      };
    }

    const txRows = rows.slice(1).map((fields) => ({
      date: fields[index.date] || "",
      description: fields[index.description] || "",
      amount: fields[index.amount] || "",
      type: fields[index.type] || "",
      category: index.category >= 0 ? fields[index.category] || "" : "",
      source: index.source >= 0 ? fields[index.source] || "" : ""
    }));

    const summary = store.importTransactionsFromCsvRows(txRows);
    return {
      ok: true,
      canceled: false,
      imported: summary.imported,
      errors: summary.errors,
      data: store.getData()
    };
  });
  ipcMain.handle("data:export-backup", async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Clarity Backup",
      defaultPath: `clarity-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON Files", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) {
      return { ok: true, canceled: true };
    }
    const payload = store.exportBackupPayload();
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), "utf8");
    return { ok: true, canceled: false, filePath: result.filePath };
  });
  ipcMain.handle("data:import-backup", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import Clarity Backup",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"]
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { ok: true, canceled: true };
    }
    const filePath = result.filePaths[0];
    const raw = fs.readFileSync(filePath, "utf8");
    const payload = JSON.parse(raw);
    const data = store.importBackupPayload(payload);
    return { ok: true, canceled: false, data };
  });
}

function wireAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-downloaded", () => {
    updateDownloaded = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "system:toast",
        "Update ready - will install when you close and reopen the app."
      );
    }
    logEvent("Updater: update downloaded");
  });

  autoUpdater.on("error", (error) => {
    logEvent(`Updater error: ${error && error.message ? error.message : String(error)}`);
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    logEvent("Updater: checkForUpdatesAndNotify failed");
  });
}

app.whenReady().then(() => {
  isDemoMode = detectDemoMode();
  const userDataRoot = app.getPath("userData");
  const dataDir = isDemoMode ? path.join(userDataRoot, "demo-profile") : userDataRoot;
  logPath = path.join(dataDir, "logs", "diagnostics.log");
  store = new DataStore(dataDir);
  store.init({ demoSeed: isDemoMode });
  createWindow();
  wireIpc();
  wireAutoUpdater();
  if (isDemoMode) {
    logEvent("Demo mode enabled. Seeded deterministic date-based dataset.");
  }
  mainWindow.webContents.once("did-finish-load", () => {
    const warnings = store.consumeStartupWarnings();
    for (const warning of warnings) {
      mainWindow.webContents.send("system:toast", warning);
    }
  });
});

app.on("before-quit", () => {
  if (updateDownloaded && !installingUpdate) {
    installingUpdate = true;
    autoUpdater.quitAndInstall(false, true);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

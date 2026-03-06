const { contextBridge, ipcRenderer } = require("electron");

async function invoke(channel, payload = {}) {
  try {
    return await ipcRenderer.invoke(channel, payload);
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

contextBridge.exposeInMainWorld("budgetApi", {
  getVersion: () => invoke("app:get-version"),
  getData: () => invoke("data:get"),
  updateOnboardingSettings: (payload) => invoke("settings:update-onboarding", payload),
  updateAppearanceSettings: (payload) => invoke("settings:update-appearance", payload),
  updateBudgetSettings: (payload) => invoke("settings:update-budget", payload),
  updateNotificationSettings: (payload) => invoke("settings:update-notifications", payload),
  updateAutomationSettings: (payload) => invoke("settings:update-automation", payload),
  setPin: (pin) => invoke("security:set-pin", { pin }),
  disablePin: (pin) => invoke("security:disable-pin", { pin }),
  verifyPin: (pin) => invoke("security:verify-pin", { pin }),
  addTransaction: (payload) => invoke("transaction:add", payload),
  deleteTransaction: (id) => invoke("transaction:delete", { id }),
  restoreTransaction: (transaction) => invoke("transaction:restore", { transaction }),
  undoLastTransactionAction: () => invoke("transaction:undo-last"),
  addCategory: (name) => invoke("category:add", { name }),
  deleteCategory: (name, monthKey) => invoke("category:delete", { name, monthKey }),
  addSource: (name) => invoke("source:add", { name }),
  deleteSource: (name) => invoke("source:delete", { name }),
  setBudgetLimit: (category, limit, monthKey) => invoke("limit:set", { category, limit, monthKey }),
  addRecurring: (payload) => invoke("recurring:add", payload),
  deleteRecurring: (id) => invoke("recurring:delete", { id }),
  materializeRecurringUntil: (monthKey) => invoke("recurring:materialize-until", { monthKey }),
  addTransactionRule: (payload) => invoke("rules:add", payload),
  deleteTransactionRule: (id) => invoke("rules:delete", { id }),
  resetAllData: () => invoke("data:reset-all"),
  addGoal: (name, target) => invoke("goal:add", { name, target }),
  contributeGoal: (id, amount) => invoke("goal:contribute", { id, amount }),
  deleteGoal: (id) => invoke("goal:delete", { id }),
  addGoalSchedule: (payload) => invoke("goal:schedule:add", payload),
  deleteGoalSchedule: (id) => invoke("goal:schedule:delete", { id }),
  exportCsv: () => invoke("data:export-csv"),
  importCsv: () => invoke("data:import-csv"),
  exportBackup: () => invoke("data:export-backup"),
  importBackup: () => invoke("data:import-backup"),
  onSystemToast: (handler) => {
    ipcRenderer.removeAllListeners("system:toast");
    ipcRenderer.on("system:toast", (_event, message) => handler(message));
  }
});

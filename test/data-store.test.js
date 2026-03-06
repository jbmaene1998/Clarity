const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { DataStore, createDemoData } = require("../lib/data-store");

function makeTempDir() {
  const dir = path.join(os.tmpdir(), `clarity-test-${crypto.randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test("BR-006 and BR-021 create default data in user data directory structure", () => {
  const dir = makeTempDir();
  const store = new DataStore(dir);
  const data = store.init();
  assert.ok(fs.existsSync(path.join(dir, "budget-data.json")));
  assert.ok(data.categories.includes("Housing"));
  assert.ok(data.sources.includes("Salary"));
  assert.ok(Array.isArray(data.transactions));
});

test("BR-003/004 transaction cannot be edited and can be deleted", () => {
  const store = new DataStore(makeTempDir());
  store.init();
  const added = store.addTransaction({
    date: "2026-03-01",
    description: "Paycheck",
    source: "Salary",
    amount: 1000,
    type: "income"
  });
  assert.ok(added.id);
  assert.equal(added.source, "Salary");
  assert.equal(added.category, "");

  assert.throws(() => {
    store.deleteTransaction("not-a-real-id");
  }, /Transaction not found/);

  store.deleteTransaction(added.id);
  const after = store.getData();
  assert.equal(after.transactions.length, 0);
});

test("BR-007/008 category uniqueness and in-use delete protection", () => {
  const store = new DataStore(makeTempDir());
  store.init();

  store.addCategory("Travel");
  assert.throws(() => store.addCategory("Travel"), /already exists/);

  store.addTransaction({
    date: "2026-03-05",
    description: "Flight",
    category: "Travel",
    amount: 200,
    type: "expense"
  });

  assert.throws(() => store.deleteCategory("Travel"), /cannot be deleted/);
});

test("income source management mirrors categories", () => {
  const store = new DataStore(makeTempDir());
  store.init();

  store.addSource("Employer");
  assert.throws(() => store.addSource("Employer"), /already exists/);

  store.addTransaction({
    date: "2026-03-09",
    description: "Wage",
    source: "Employer",
    amount: 2500,
    type: "income"
  });

  assert.throws(() => store.deleteSource("Employer"), /cannot be deleted/);
});

test("BR-013 and BR-020 limit updates auto-save and clear on zero/blank", () => {
  const dir = makeTempDir();
  const store = new DataStore(dir);
  store.init();
  const file = path.join(dir, "budget-data.json");

  store.setBudgetLimit("Housing", 123.456, "2026-03");
  let data = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.deepEqual(data.budgetLimits.Housing, { "2026-03": 123.46 });

  store.setBudgetLimit("Housing", 0, "2026-03");
  data = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(data.budgetLimits.Housing, undefined);

  store.setBudgetLimit("Food & Groceries", "", "2026-03");
  data = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(data.budgetLimits["Food & Groceries"], undefined);
});

test("restore transaction supports undo flow", () => {
  const store = new DataStore(makeTempDir());
  store.init();
  const tx = store.addTransaction({
    date: "2026-03-10",
    description: "Taxi",
    category: "Transport",
    amount: 25,
    type: "expense"
  });
  const deleted = store.deleteTransaction(tx.id);
  assert.equal(deleted.id, tx.id);
  store.restoreTransaction(deleted);
  const restored = store.getData().transactions.find((item) => item.id === tx.id);
  assert.ok(restored);
  assert.equal(restored.description, "Taxi");
});

test("recurring monthly transactions are materialized and deduplicated", () => {
  const store = new DataStore(makeTempDir());
  store.init();
  store.addRecurring({
    startDate: "2026-01-15",
    description: "Rent",
    amount: 1000,
    type: "expense",
    category: "Housing",
    dayOfMonth: 15
  });
  store.materializeRecurringTransactionsUpTo("2026-03-31");
  store.saveCurrent();
  const firstCount = store.getData().transactions.filter((tx) => tx.description === "Rent").length;
  store.materializeRecurringTransactionsUpTo("2026-03-31");
  store.saveCurrent();
  const secondCount = store.getData().transactions.filter((tx) => tx.description === "Rent").length;
  assert.equal(firstCount, 3);
  assert.equal(secondCount, 3);
});

test("savings goals can be created and contributed", () => {
  const store = new DataStore(makeTempDir());
  store.init();
  const goal = store.addGoal("Emergency Fund", 1000);
  assert.ok(goal.id);
  const updated = store.contributeGoal(goal.id, 250.5);
  assert.equal(updated.current, 250.5);
});

test("onboarding settings persist and default to false values", () => {
  const dir = makeTempDir();
  const store = new DataStore(dir);
  const data = store.init();
  assert.equal(data.settings.onboarding.tutorialCompleted, false);

  store.updateOnboardingSettings({ tutorialCompleted: true });

  const store2 = new DataStore(dir);
  const reloaded = store2.init();
  assert.equal(reloaded.settings.onboarding.tutorialCompleted, true);
});

test("budget rollover setting persists and defaults to enabled", () => {
  const dir = makeTempDir();
  const store = new DataStore(dir);
  const data = store.init();
  assert.equal(data.settings.budget.rolloverEnabled, true);

  store.updateBudgetSettings({ rolloverEnabled: false });

  const store2 = new DataStore(dir);
  const reloaded = store2.init();
  assert.equal(reloaded.settings.budget.rolloverEnabled, false);
});

test("reset all data restores defaults and clears persisted records", () => {
  const dir = makeTempDir();
  const store = new DataStore(dir);
  store.init();
  store.addTransaction({
    date: "2026-03-12",
    description: "Test Expense",
    category: "Housing",
    amount: 10,
    type: "expense"
  });
  store.updateOnboardingSettings({ tutorialCompleted: true });
  store.updateBudgetSettings({ rolloverEnabled: false });

  const resetData = store.resetAllData();
  assert.equal(resetData.transactions.length, 0);
  assert.ok(resetData.categories.includes("Housing"));
  assert.ok(resetData.sources.includes("Salary"));
  assert.equal(resetData.settings.onboarding.tutorialCompleted, false);
  assert.equal(resetData.settings.budget.rolloverEnabled, true);

  const store2 = new DataStore(dir);
  const reloaded = store2.init();
  assert.equal(reloaded.transactions.length, 0);
  assert.equal(reloaded.settings.onboarding.tutorialCompleted, false);
  assert.equal(reloaded.settings.budget.rolloverEnabled, true);
});

test("demo seed generation is deterministic for a given date", () => {
  const seedDate = "2026-03-05T00:00:00.000Z";
  const first = createDemoData(seedDate);
  const second = createDemoData(seedDate);

  assert.equal(first.transactions.length, second.transactions.length);
  assert.deepEqual(
    first.transactions.map((tx) => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      source: tx.source
    })),
    second.transactions.map((tx) => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      source: tx.source
    }))
  );
  assert.ok(first.categories.includes("Travel 2026"));
  assert.ok(first.sources.includes("Side Hustle 2026"));
});

test("demo init reseeds store with date-based records", () => {
  const dir = makeTempDir();
  const store = new DataStore(dir);
  const data = store.init({ demoSeed: true, now: "2026-03-05T00:00:00.000Z" });

  assert.ok(data.transactions.length > 0);
  assert.equal(data.settings.onboarding.tutorialCompleted, true);
  assert.ok(data.transactions.some((tx) => tx.description.includes("2026-03")));
  assert.ok(fs.existsSync(path.join(dir, "budget-data.json")));
});

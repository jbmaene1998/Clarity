const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateTransactionInput,
  parseAmount,
  computeMonthSummary,
  computeCategorySpend,
  computeBudgetColor,
  filterTransactions
} = require("../lib/budget-core");

const categories = ["Housing", "Food & Groceries", "Other"];
const sources = ["Salary", "Bonus", "Other"];

test("BR-001 validation rejects missing/invalid fields", () => {
  assert.equal(
    validateTransactionInput(
      {
        date: "invalid-date",
        description: "x",
        category: "Housing",
        amount: 1,
        type: "expense"
      },
      categories,
      sources
    ),
    "Date must be a valid calendar date"
  );

  assert.equal(
    validateTransactionInput(
      {
        date: "2026-03-01",
        description: "",
        category: "Housing",
        amount: 1,
        type: "expense"
      },
      categories,
      sources
    ),
    "Description is required"
  );

  assert.equal(
    validateTransactionInput(
      {
        date: "2026-03-01",
        description: "Salary",
        amount: 1000,
        type: "income"
      },
      categories,
      sources
    ),
    "Source is required for income"
  );

  assert.equal(
    validateTransactionInput(
      {
        date: "2026-03-01",
        description: "Rent",
        amount: 500,
        type: "expense"
      },
      categories,
      sources
    ),
    "Category must be an existing category for expenses"
  );

  assert.equal(
    validateTransactionInput(
      {
        date: "2026-03-01",
        description: "Salary",
        amount: 1000,
        type: "income",
        source: "Unknown Source"
      },
      categories,
      sources
    ),
    "Source must be an existing source for income"
  );
});

test("BR-002 amount precision rounds to 2 decimals", () => {
  assert.equal(parseAmount("12.505"), 12.51);
  assert.equal(parseAmount("12.501"), 12.5);
  assert.equal(parseAmount("0"), null);
});

test("BR-010/014/015/016/017 compute monthly values from expense/income rules", () => {
  const tx = [
    { date: "2026-03-01", type: "income", amount: 2000, source: "Salary", category: "" },
    { date: "2026-03-02", type: "expense", amount: 500.25, category: "Housing" },
    { date: "2026-03-03", type: "expense", amount: 120.75, category: "Food & Groceries" },
    { date: "2026-04-01", type: "expense", amount: 999, category: "Housing" },
    { date: "2026-03-05", type: "income", amount: 100, source: "Gift", category: "" }
  ];

  const summary = computeMonthSummary(tx, "2026-03");
  assert.equal(summary.income, 2100);
  assert.equal(summary.expense, 621);
  assert.equal(summary.balance, 1479);
  assert.equal(computeCategorySpend(tx, "2026-03", "Housing"), 500.25);
  assert.equal(computeCategorySpend(tx, "2026-03", "Food & Groceries"), 120.75);
});

test("BR-012 budget color thresholds", () => {
  assert.equal(computeBudgetColor(0.79), "green");
  assert.equal(computeBudgetColor(0.8), "orange");
  assert.equal(computeBudgetColor(0.99), "orange");
  assert.equal(computeBudgetColor(1), "red");
});

test("BR-018/019 filters apply only visible list and use AND logic", () => {
  const tx = [
    { date: "2026-03-01", type: "income", category: "", source: "Salary" },
    { date: "2026-03-01", type: "expense", category: "Housing" },
    { date: "2026-03-02", type: "expense", category: "Other" },
    { date: "2026-04-01", type: "expense", category: "Housing" }
  ];
  const list = filterTransactions(tx, "2026-03", "expense", "Housing");
  assert.equal(list.length, 1);
  assert.equal(list[0].type, "expense");
  assert.equal(list[0].category, "Housing");
});

function toMonthKey(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseAmount(rawValue) {
  const amount = Number(rawValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return round2(amount);
}

function validateTransactionInput(input, categories, sources) {
  if (!input || typeof input !== "object") {
    return "Invalid payload";
  }

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    return "Date must be a valid calendar date";
  }

  if (typeof input.description !== "string" || input.description.trim().length === 0) {
    return "Description is required";
  }

  const amount = parseAmount(input.amount);
  if (amount === null) {
    return "Amount must be a positive number greater than zero";
  }

  if (input.type !== "income" && input.type !== "expense") {
    return "Type must be income or expense";
  }

  if (input.type === "expense") {
    if (typeof input.category !== "string" || !categories.includes(input.category)) {
      return "Category must be an existing category for expenses";
    }
  }

  if (input.type === "income") {
    if (typeof input.source !== "string" || input.source.trim().length === 0) {
      return "Source is required for income";
    }
    if (!Array.isArray(sources) || !sources.includes(input.source)) {
      return "Source must be an existing source for income";
    }
  }

  return null;
}

function isInMonth(transactionDate, monthKey) {
  return toMonthKey(transactionDate) === monthKey;
}

function computeMonthSummary(transactions, monthKey) {
  const monthTx = transactions.filter((tx) => isInMonth(tx.date, monthKey));
  const income = round2(
    monthTx.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0)
  );
  const expense = round2(
    monthTx.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0)
  );
  return {
    income,
    expense,
    balance: round2(income - expense)
  };
}

function computeCategorySpend(transactions, monthKey, category) {
  return round2(
    transactions
      .filter((tx) => tx.type === "expense" && tx.category === category && isInMonth(tx.date, monthKey))
      .reduce((sum, tx) => sum + tx.amount, 0)
  );
}

function computeBudgetColor(utilizationRatio) {
  if (utilizationRatio >= 1) {
    return "red";
  }
  if (utilizationRatio >= 0.8) {
    return "orange";
  }
  return "green";
}

function filterTransactions(transactions, monthKey, typeFilter, categoryFilter) {
  return transactions.filter((tx) => {
    if (!isInMonth(tx.date, monthKey)) {
      return false;
    }
    if (typeFilter && tx.type !== typeFilter) {
      return false;
    }
    if (categoryFilter && tx.category !== categoryFilter) {
      return false;
    }
    return true;
  });
}

module.exports = {
  toMonthKey,
  round2,
  parseAmount,
  validateTransactionInput,
  computeMonthSummary,
  computeCategorySpend,
  computeBudgetColor,
  filterTransactions
};

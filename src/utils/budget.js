import { round2, toMonthKey } from './format.js';

export function computeMonthSummary(transactions, mk) {
  const monthTx = transactions.filter((tx) => toMonthKey(tx.date) === mk);
  const income = round2(monthTx.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0));
  const expense = round2(monthTx.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0));
  return { income, expense, balance: round2(income - expense) };
}

export function computeCategorySpend(transactions, mk, category) {
  return round2(
    transactions
      .filter((tx) => tx.type === 'expense' && tx.category === category && toMonthKey(tx.date) === mk)
      .reduce((sum, tx) => sum + tx.amount, 0)
  );
}

function parseMonthKey(monthKey) {
  const [yearRaw, monthRaw] = String(monthKey || '').split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function formatMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function shiftMonthKey(monthKey, delta) {
  const parts = parseMonthKey(monthKey);
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  return formatMonthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function monthLabelFromKey(monthKey) {
  const parts = parseMonthKey(monthKey);
  if (!parts) return '';
  const date = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function listMonthKeys(startMonthKey, endMonthKey) {
  if (!startMonthKey || !endMonthKey || startMonthKey > endMonthKey) {
    return [];
  }
  const keys = [];
  let cursor = startMonthKey;
  while (cursor && cursor <= endMonthKey) {
    keys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
  }
  return keys;
}

export function getEffectiveLimitForMonth(limitsMap, monthKey) {
  if (!limitsMap || typeof limitsMap !== 'object') return 0;
  const validKeys = Object.keys(limitsMap).filter((k) => k <= monthKey).sort();
  if (validKeys.length === 0) return 0;
  const value = Number(limitsMap[validKeys[validKeys.length - 1]]);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeCategoryBudgetState(
  transactions,
  currentMonthKey,
  category,
  limitsMap,
  rolloverEnabled
) {
  const resolvedMap = (limitsMap && typeof limitsMap === 'object') ? limitsMap : {};
  const baseLimit = getEffectiveLimitForMonth(resolvedMap, currentMonthKey);
  const spent = computeCategorySpend(transactions, currentMonthKey, category);
  if (baseLimit <= 0) {
    return {
      baseLimit: 0,
      spent,
      carryover: 0,
      effectiveLimit: 0,
      remaining: round2(-spent)
    };
  }

  if (!rolloverEnabled) {
    return {
      baseLimit: round2(baseLimit),
      spent,
      carryover: 0,
      effectiveLimit: round2(baseLimit),
      remaining: round2(baseLimit - spent)
    };
  }

  const previousMonth = shiftMonthKey(currentMonthKey, -1);
  let carryover = 0;
  if (previousMonth) {
    // Find the earliest month where a limit was set — start the rollover window there
    const limitMonths = Object.keys(resolvedMap).filter((k) => k <= previousMonth).sort();
    const firstLimitMonth = limitMonths[0];
    if (firstLimitMonth) {
      const months = listMonthKeys(firstLimitMonth, previousMonth);
      for (const monthKey of months) {
        const historicalLimit = getEffectiveLimitForMonth(resolvedMap, monthKey);
        if (historicalLimit <= 0) continue; // no budget set for that month, skip
        const historicalSpend = computeCategorySpend(transactions, monthKey, category);
        carryover += historicalLimit - historicalSpend;
      }
    }
  }

  const roundedCarryover = round2(carryover);
  const effectiveLimit = round2(baseLimit + roundedCarryover);
  return {
    baseLimit: round2(baseLimit),
    spent,
    carryover: roundedCarryover,
    effectiveLimit,
    remaining: round2(effectiveLimit - spent)
  };
}

export function computeMonthlyTrendSeries(transactions, currentMonthDate, monthCount) {
  const count = Number(monthCount);
  if (!Number.isInteger(count) || count <= 0) {
    return [];
  }
  const endMonthKey = toMonthKey(currentMonthDate);
  if (!endMonthKey) {
    return [];
  }
  const startMonthKey = shiftMonthKey(endMonthKey, -(count - 1));
  const monthKeys = listMonthKeys(startMonthKey, endMonthKey);

  return monthKeys.map((monthKey) => {
    const summary = computeMonthSummary(transactions, monthKey);
    return {
      monthKey,
      label: monthLabelFromKey(monthKey),
      income: summary.income,
      expense: summary.expense,
      savings: summary.balance
    };
  });
}

export function computeBudgetColor(ratio) {
  if (ratio >= 1) return 'red';
  if (ratio >= 0.8) return 'orange';
  return 'green';
}

export function filteredTransactions(transactions, mk, filters) {
  return transactions
    .filter((tx) => toMonthKey(tx.date) === mk)
    .filter((tx) => {
      if (filters.type && tx.type !== filters.type) return false;
      if (filters.classification) {
        if (filters.classification.startsWith('category:')) {
          const category = filters.classification.slice('category:'.length);
          if (tx.type !== 'expense' || tx.category !== category) return false;
        }
        if (filters.classification.startsWith('source:')) {
          const source = filters.classification.slice('source:'.length);
          if (tx.type !== 'income' || tx.source !== source) return false;
        }
      }
      if (filters.query) {
        const query = filters.query.toLowerCase();
        if (!tx.description.toLowerCase().includes(query)) return false;
      }
      return true;
    });
}

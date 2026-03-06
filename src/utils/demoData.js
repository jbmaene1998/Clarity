let _nextId = 1;

function _date(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function _offset(now, monthsBack) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function _tx(type, date, description, amount, category, source) {
  return {
    id: `demo-${_nextId++}`,
    type,
    date,
    description,
    amount,
    ...(type === 'expense' ? { category } : { source }),
  };
}

export function generateDemoData() {
  _nextId = 1;
  const now = new Date();
  const c = _offset(now, 0);
  const p1 = _offset(now, 1);
  const p2 = _offset(now, 2);

  const transactions = [
    // Current month
    _tx('income',  _date(c.year,  c.month,  1),  'Monthly Salary',    3200,  null,              'Salary'),
    _tx('expense', _date(c.year,  c.month,  2),  'Rent',              950,   'Housing',         null),
    _tx('expense', _date(c.year,  c.month,  3),  'Electricity Bill',  68,    'Utilities',       null),
    _tx('expense', _date(c.year,  c.month,  4),  'Grocery Shopping',  112,   'Food & Groceries',null),
    _tx('expense', _date(c.year,  c.month,  5),  'Netflix',           15,    'Entertainment',   null),
    _tx('expense', _date(c.year,  c.month,  6),  'Coffee & Lunch',    34,    'Food & Groceries',null),
    _tx('income',  _date(c.year,  c.month,  6),  'Freelance Project', 450,   null,              'Freelance'),
    _tx('expense', _date(c.year,  c.month,  8),  'Bus Pass',          42,    'Transport',       null),

    // Previous month
    _tx('income',  _date(p1.year, p1.month, 1),  'Monthly Salary',    3200,  null,              'Salary'),
    _tx('expense', _date(p1.year, p1.month, 2),  'Rent',              950,   'Housing',         null),
    _tx('expense', _date(p1.year, p1.month, 5),  'Grocery Shopping',  98,    'Food & Groceries',null),
    _tx('expense', _date(p1.year, p1.month, 8),  'Internet Bill',     42,    'Utilities',       null),
    _tx('expense', _date(p1.year, p1.month, 14), 'Gym Membership',    30,    'Health',          null),
    _tx('expense', _date(p1.year, p1.month, 20), 'New Shoes',         89,    'Shopping',        null),
    _tx('expense', _date(p1.year, p1.month, 22), 'Bus Pass',          42,    'Transport',       null),

    // Two months ago
    _tx('income',  _date(p2.year, p2.month, 1),  'Monthly Salary',    3200,  null,              'Salary'),
    _tx('income',  _date(p2.year, p2.month, 20), 'Year-End Bonus',    500,   null,              'Bonus'),
    _tx('expense', _date(p2.year, p2.month, 2),  'Rent',              950,   'Housing',         null),
    _tx('expense', _date(p2.year, p2.month, 4),  'Grocery Shopping',  125,   'Food & Groceries',null),
    _tx('expense', _date(p2.year, p2.month, 10), 'Doctor Visit',      55,    'Health',          null),
    _tx('expense', _date(p2.year, p2.month, 15), 'Cinema Tickets',    24,    'Entertainment',   null),
    _tx('expense', _date(p2.year, p2.month, 22), 'Bus Pass',          42,    'Transport',       null),
  ];

  const startMonth = `${p2.year}-${String(p2.month).padStart(2, '0')}`;

  return {
    transactions,
    categories: ['Housing', 'Food & Groceries', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Utilities', 'Other'],
    sources: ['Salary', 'Bonus', 'Freelance', 'Gift', 'Other'],
    budgetLimits: {
      Housing: 1000,
      'Food & Groceries': 300,
      Transport: 150,
      Health: 100,
      Entertainment: 80,
      Shopping: 200,
      Utilities: 120,
      Other: 100,
    },
    recurrences: [
      {
        id: 'demo-rec-1',
        type: 'expense',
        description: 'Rent',
        amount: 950,
        category: 'Housing',
        source: null,
        dayOfMonth: 2,
        startMonth,
      },
    ],
    goals: [
      { id: 'demo-goal-1', name: 'Emergency Fund', target: 5000, current: 1200 },
    ],
    goalSchedules: [],
    goalContributions: [],
    transactionRules: [],
    auditLog: [],
  };
}

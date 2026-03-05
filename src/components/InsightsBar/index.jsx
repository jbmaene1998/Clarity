import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey, round2 } from '../../utils/format.js';
import { computeMonthSummary } from '../../utils/budget.js';
import styles from './InsightsBar.module.css';

export default function InsightsBar() {
  const { state } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());

  const prev = new Date(state.currentMonth);
  prev.setUTCDate(1);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const pmk = toMonthKey(prev.toISOString());

  const summary = computeMonthSummary(state.data.transactions, mk);
  const previous = computeMonthSummary(state.data.transactions, pmk);

  const deltaIncome = round2(summary.income - previous.income);
  const deltaExpense = round2(summary.expense - previous.expense);
  const deltaBalance = round2(summary.balance - previous.balance);

  return (
    <div id="insights" className={styles.insights}>
      Vs previous month: Income {currency(deltaIncome)} | Expenses {currency(deltaExpense)} | Balance {currency(deltaBalance)}
    </div>
  );
}

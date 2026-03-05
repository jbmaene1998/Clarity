import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey } from '../../utils/format.js';
import { computeMonthSummary } from '../../utils/budget.js';
import styles from './SummaryPanel.module.css';

export default function SummaryPanel() {
  const { state } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());
  const summary = computeMonthSummary(state.data.transactions, mk);

  return (
    <div className={styles.summary}>
      <div className={styles.metric}>
        <label>Income</label>
        <strong id="incomeValue">{currency(summary.income)}</strong>
      </div>
      <div className={styles.metric}>
        <label>Expenses</label>
        <strong id="expenseValue">{currency(summary.expense)}</strong>
      </div>
      <div className={styles.metric}>
        <label>Balance</label>
        <strong
          id="balanceValue"
          className={summary.balance >= 0 ? styles.positive : styles.negative}
        >
          {currency(summary.balance)}
        </strong>
      </div>
    </div>
  );
}

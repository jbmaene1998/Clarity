import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey } from '../../utils/format.js';
import { computeMonthSummary } from '../../utils/budget.js';
import styles from './IntelligencePage.module.css';

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export default function IntelligencePage() {
  const { state } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());
  const previous = new Date(state.currentMonth);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const pmk = toMonthKey(previous.toISOString());

  const cards = useMemo(() => {
    const monthTx = state.data.transactions.filter((tx) => toMonthKey(tx.date) === mk);
    const prevTx = state.data.transactions.filter((tx) => toMonthKey(tx.date) === pmk);
    const currentByCategory = new Map();
    const previousByCategory = new Map();
    for (const tx of monthTx) {
      if (tx.type !== 'expense') continue;
      currentByCategory.set(tx.category, (currentByCategory.get(tx.category) || 0) + tx.amount);
    }
    for (const tx of prevTx) {
      if (tx.type !== 'expense') continue;
      previousByCategory.set(tx.category, (previousByCategory.get(tx.category) || 0) + tx.amount);
    }

    const largest = [...currentByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    const spikes = [...currentByCategory.entries()]
      .map(([category, spend]) => {
        const prev = previousByCategory.get(category) || 0;
        const deltaPct = prev > 0 ? ((spend - prev) / prev) * 100 : (spend > 0 ? 100 : 0);
        return { category, spend, deltaPct };
      })
      .filter((item) => item.deltaPct >= 20)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 3);

    const expenseValues = state.data.transactions.filter((tx) => tx.type === 'expense').map((tx) => tx.amount);
    const p90 = percentile(expenseValues, 90);
    const unusual = monthTx
      .filter((tx) => tx.type === 'expense' && tx.amount >= p90 && p90 > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    let streak = 0;
    const cursor = new Date(state.currentMonth);
    for (let i = 0; i < 24; i += 1) {
      const key = toMonthKey(cursor.toISOString());
      const summary = computeMonthSummary(state.data.transactions, key);
      if (summary.balance > 0) {
        streak += 1;
      } else {
        break;
      }
      cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    }

    return { largest, spikes, unusual, streak };
  }, [mk, pmk, state.currentMonth, state.data.transactions]);

  return (
    <section className={styles.panel}>
      <h2>Smart Insights</h2>
      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Largest Expense Category</h3>
          <p>
            {cards.largest
              ? `${cards.largest[0]} at ${currency(cards.largest[1])}`
              : 'No expense data this month.'}
          </p>
        </article>
        <article className={styles.card}>
          <h3>Spend Spikes vs Last Month</h3>
          {cards.spikes.length === 0 ? (
            <p>No major category spikes detected.</p>
          ) : (
            <ul>
              {cards.spikes.map((item) => (
                <li key={item.category}>{item.category}: +{Math.round(item.deltaPct)}%</li>
              ))}
            </ul>
          )}
        </article>
        <article className={styles.card}>
          <h3>Savings Streak</h3>
          <p>{cards.streak} consecutive month(s) with positive balance.</p>
        </article>
        <article className={styles.card}>
          <h3>Unusual Expenses</h3>
          {cards.unusual.length === 0 ? (
            <p>No outlier expenses detected this month.</p>
          ) : (
            <ul>
              {cards.unusual.map((tx) => (
                <li key={tx.id}>{tx.description}: {currency(tx.amount)}</li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

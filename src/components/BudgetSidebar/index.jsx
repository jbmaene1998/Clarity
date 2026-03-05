import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey } from '../../utils/format.js';
import { computeBudgetColor, computeCategoryBudgetState } from '../../utils/budget.js';
import styles from './BudgetSidebar.module.css';

export default function BudgetSidebar() {
  const { state } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());
  const rolloverEnabled = state.data.settings?.budget?.rolloverEnabled !== false;

  const items = state.data.categories
    .map((cat) => {
      const limit = state.data.budgetLimits[cat];
      if (!limit || limit <= 0) return null;
      const budget = computeCategoryBudgetState(
        state.data.transactions,
        mk,
        cat,
        limit,
        rolloverEnabled
      );
      const ratio = budget.effectiveLimit > 0 ? budget.spent / budget.effectiveLimit : 1;
      const fillPct = budget.effectiveLimit > 0 ? Math.min(100, Math.max(0, ratio * 100)) : 100;
      const color = computeBudgetColor(ratio);
      return { cat, ...budget, fillPct, color };
    })
    .filter(Boolean);

  return (
    <aside className={styles.sidebar}>
      <h3>Budget Progress</h3>
      <div id="budgetBars">
        {items.length === 0 ? (
          <div className={styles.empty}>No category limits are set.</div>
        ) : (
          items.map(({ cat, baseLimit, carryover, effectiveLimit, spent, fillPct, color }) => (
            <div key={cat} className={styles.budgetItem}>
              <div className={styles.budgetRow}>
                <span>{cat}</span>
                <span>{currency(spent)} / {currency(effectiveLimit)}</span>
              </div>
              {rolloverEnabled && (
                <div className={styles.rolloverInfo}>
                  Base {currency(baseLimit)} | Carryover {currency(carryover)}
                </div>
              )}
              <div className={styles.bar}>
                <div className={`${styles.fill} ${styles[color]}`} style={{ width: `${fillPct}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

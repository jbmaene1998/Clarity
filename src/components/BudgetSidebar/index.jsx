import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey } from '../../utils/format.js';
import { computeBudgetColor, computeCategoryBudgetState, getEffectiveLimitForMonth } from '../../utils/budget.js';
import styles from './BudgetSidebar.module.css';

export default function BudgetSidebar() {
  const { state } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());
  const rolloverEnabled = state.data.settings?.budget?.rolloverEnabled !== false;
  const [activeTab, setActiveTab] = useState('progress');

  const items = state.data.categories
    .map((cat) => {
      const limitsMap = state.data.budgetLimits[cat] || {};
      const currentLimit = getEffectiveLimitForMonth(limitsMap, mk);
      if (!currentLimit) return null;
      const budget = computeCategoryBudgetState(
        state.data.transactions,
        mk,
        cat,
        limitsMap,
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
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'progress' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'carryover' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('carryover')}
        >
          Carryover
        </button>
      </div>

      <div id="budgetBars">
        {activeTab === 'progress' ? (
          items.length === 0 ? (
            <div className={styles.empty}>No category limits are set.</div>
          ) : (
            items.map(({ cat, effectiveLimit, spent, fillPct, color }) => (
              <div key={cat} className={styles.budgetItem}>
                <div className={styles.budgetRow}>
                  <span>{cat}</span>
                  <span>{currency(spent)} / {currency(effectiveLimit)}</span>
                </div>
                <div className={styles.bar}>
                  <div className={`${styles.fill} ${styles[color]}`} style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            ))
          )
        ) : (
          !rolloverEnabled ? (
            <div className={styles.empty}>
              Enable monthly rollover in Settings to track carryovers.
            </div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>No category limits are set.</div>
          ) : (
            items.map(({ cat, baseLimit, carryover, effectiveLimit }) => (
              <div key={cat} className={styles.budgetItem}>
                <div className={styles.budgetRow}>
                  <span>{cat}</span>
                </div>
                <div className={styles.carryoverDetail}>
                  <span className={styles.carryoverLabel}>Base</span>
                  <span>{currency(baseLimit)}</span>
                </div>
                <div className={styles.carryoverDetail}>
                  <span className={styles.carryoverLabel}>Carried</span>
                  <span className={carryover >= 0 ? styles.positive : styles.negative}>
                    {carryover >= 0 ? '+' : ''}{currency(carryover)}
                  </span>
                </div>
                <div className={`${styles.carryoverDetail} ${styles.carryoverTotal}`}>
                  <span className={styles.carryoverLabel}>Effective</span>
                  <span>{currency(effectiveLimit)}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </aside>
  );
}

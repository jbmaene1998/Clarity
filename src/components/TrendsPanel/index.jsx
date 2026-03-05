import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency } from '../../utils/format.js';
import { computeMonthlyTrendSeries } from '../../utils/budget.js';
import styles from './TrendsPanel.module.css';

function createLinePath(points) {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

export default function TrendsPanel() {
  const { state } = useApp();
  const [windowSize, setWindowSize] = useState(6);

  const series = useMemo(
    () => computeMonthlyTrendSeries(state.data.transactions, state.currentMonth, windowSize),
    [state.data.transactions, state.currentMonth, windowSize]
  );

  const chart = useMemo(() => {
    if (series.length === 0) return null;
    const width = 680;
    const height = 250;
    const padLeft = 44;
    const padRight = 12;
    const padTop = 18;
    const padBottom = 36;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const values = series.flatMap((s) => [s.income, s.expense, s.savings]);
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(1, ...values);
    const range = maxValue - minValue || 1;

    const xForIndex = (index) => {
      if (series.length === 1) return padLeft + plotWidth / 2;
      return padLeft + (index * plotWidth) / (series.length - 1);
    };
    const yForValue = (value) => padTop + ((maxValue - value) * plotHeight) / range;

    const incomePoints = series.map((entry, idx) => ({ x: xForIndex(idx), y: yForValue(entry.income) }));
    const expensePoints = series.map((entry, idx) => ({ x: xForIndex(idx), y: yForValue(entry.expense) }));
    const savingsPoints = series.map((entry, idx) => ({ x: xForIndex(idx), y: yForValue(entry.savings) }));

    const yTicks = 4;
    const gridTicks = Array.from({ length: yTicks + 1 }).map((_, idx) => {
      const ratio = idx / yTicks;
      const value = maxValue - ratio * range;
      return { y: yForValue(value), value };
    });

    return {
      width,
      height,
      minValue,
      maxValue,
      incomePath: createLinePath(incomePoints),
      expensePath: createLinePath(expensePoints),
      savingsPath: createLinePath(savingsPoints),
      labels: series.map((entry, idx) => ({ x: xForIndex(idx), text: entry.label })),
      gridTicks
    };
  }, [series]);

  const latest = series.length > 0 ? series[series.length - 1] : null;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h3>Trends</h3>
        <div className={styles.range}>
          {[3, 6, 12].map((size) => (
            <button
              key={size}
              type="button"
              className={windowSize === size ? styles.active : ''}
              onClick={() => setWindowSize(size)}
            >
              {size}M
            </button>
          ))}
        </div>
      </div>
      {series.length === 0 ? (
        <div className={styles.empty}>No trend data yet. Add transactions to visualize performance.</div>
      ) : (
        <>
          <div className={styles.legend}>
            <span className={styles.income}>Income</span>
            <span className={styles.expense}>Expenses</span>
            <span className={styles.savings}>Savings</span>
          </div>
          <svg className={styles.chart} viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Income, expense, and savings trends">
            {chart.gridTicks.map((tick) => (
              <g key={tick.y}>
                <line x1="44" y1={tick.y} x2={chart.width - 12} y2={tick.y} className={styles.gridLine} />
                <text x="6" y={tick.y + 4} className={styles.tickText}>
                  {currency(tick.value)}
                </text>
              </g>
            ))}
            <path d={chart.incomePath} className={`${styles.line} ${styles.incomeLine}`} />
            <path d={chart.expensePath} className={`${styles.line} ${styles.expenseLine}`} />
            <path d={chart.savingsPath} className={`${styles.line} ${styles.savingsLine}`} />
            {chart.labels.map((label) => (
              <text key={label.text} x={label.x} y={chart.height - 12} className={styles.tickText} textAnchor="middle">
                {label.text}
              </text>
            ))}
          </svg>
          {latest && (
            <div className={styles.footer}>
              Latest month ({latest.label}): Income {currency(latest.income)} | Expenses {currency(latest.expense)} | Savings {currency(latest.savings)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

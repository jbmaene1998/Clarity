import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { monthLabel } from '../../utils/format.js';
import styles from './TopBar.module.css';
import logoSrc from '../../assets/logo-with-text.png';

const NAV_ITEMS = [
  { id: 'transactionsTab', key: 'transactions', label: 'Transactions' },
  { id: 'budgetTab', key: 'budget', label: 'Budget' },
  { id: 'trendsTab', key: 'trends', label: 'Trends' },
  { id: 'intelligenceTab', key: 'intelligence', label: 'Intelligence' },
  { id: 'settingsTab', key: 'settings', label: 'Settings' },
];

const PAGE_LABELS = {
  transactions: 'Transactions',
  budget: 'Budget',
  trends: 'Trends',
  intelligence: 'Intelligence',
  settings: 'Settings',
};

export default function TopBar({ addToast, ensureMonthRecurrences }) {
  const { state, dispatch } = useApp();
  const isDark = state.theme === 'dark';
  const activePageLabel = PAGE_LABELS[state.page] || 'Transactions';

  async function shiftMonth(delta) {
    const d = new Date(state.currentMonth);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + delta);
    dispatch({ type: 'SET_MONTH', payload: d });
    await ensureMonthRecurrences(d);
  }

  async function toggleTheme(event) {
    const nextTheme = event.target.checked ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: nextTheme });
    const response = await window.budgetApi.updateAppearanceSettings({ theme: nextTheme });
    if (!response.ok) {
      addToast(`Could not save theme preference: ${response.error}`, true);
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.topRow}>
        <div className={styles.brand}>
          <img
            className={`${styles.brandLogo} ${isDark ? styles.brandLogoInverted : ''}`}
            src={logoSrc}
            alt="Clarity"
          />
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              id={item.id}
              className={state.page === item.key ? styles.active : ''}
              onClick={() => dispatch({ type: 'SET_PAGE', payload: item.key })}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.utilityRail}>
          <div className={styles.pagePill}>
            <span>Now Viewing</span>
            <strong>{activePageLabel}</strong>
          </div>
          <div className={styles.monthNav}>
            <button id="monthPrev" onClick={() => shiftMonth(-1)} aria-label="Previous month">&lt;</button>
            <div className={styles.monthLabel}>{monthLabel(state.currentMonth)}</div>
            <button id="monthNext" onClick={() => shiftMonth(1)} aria-label="Next month">&gt;</button>
          </div>
          <label htmlFor="themeToggleSwitch" className={styles.themeSwitch} title="Toggle dark mode">
            <span className={styles.themeLabel}>{isDark ? 'Dark' : 'Light'}</span>
            <input
              id="themeToggleSwitch"
              type="checkbox"
              role="switch"
              checked={isDark}
              onChange={toggleTheme}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </div>
    </header>
  );
}

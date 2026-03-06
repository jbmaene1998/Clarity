import React, { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import TopBar from './components/TopBar/index.jsx';
import SummaryPanel from './components/SummaryPanel/index.jsx';
import InsightsBar from './components/InsightsBar/index.jsx';
import TrendsPanel from './components/TrendsPanel/index.jsx';
import TransactionsPage from './components/TransactionsPage/index.jsx';
import BudgetPage from './components/BudgetPage/index.jsx';
import SettingsPage from './components/SettingsPage/index.jsx';
import IntelligencePage from './components/IntelligencePage/index.jsx';
import PinLockOverlay from './components/PinLockOverlay/index.jsx';
import BudgetSidebar from './components/BudgetSidebar/index.jsx';
import ToastContainer from './components/ToastContainer/index.jsx';
import TutorialOverlay from './components/TutorialOverlay/index.jsx';
import { toMonthKey } from './utils/format.js';
import styles from './App.module.css';

function AppInner() {
  const { state, dispatch } = useApp();
  const alertCacheRef = useRef(new Set());

  function addToast(message, isError = false, actionLabel = '', action = null) {
    const id = Date.now() + Math.random();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, isError, actionLabel, action } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4200);
  }

  async function ensureMonthRecurrences(monthDate) {
    const mk = toMonthKey(monthDate.toISOString());
    const response = await window.budgetApi.materializeRecurringUntil(mk);
    if (response.ok) {
      dispatch({ type: 'SET_DATA', payload: response.data });
    }
  }

  useEffect(() => {
    async function init() {
      const res = await window.budgetApi.getData();
      const data = res.data ? res.data : res;
      const settings = data.settings || {};
      const onboarding = settings.onboarding || { tutorialCompleted: false };
      const theme = settings.appearance?.theme === 'dark' ? 'dark' : 'light';
      const rolloverEnabled = settings.budget?.rolloverEnabled !== false;
      const notifications = settings.notifications || { budgetAlertsEnabled: true, budgetAlertThreshold: 0.8 };
      const automation = settings.automation || { autoCategorizeEnabled: true };
      const security = settings.security || { pinEnabled: false, pinSalt: '', pinHash: '' };
      data.settings = {
        ...settings,
        onboarding: { tutorialCompleted: Boolean(onboarding.tutorialCompleted) },
        appearance: { theme },
        budget: { rolloverEnabled },
        notifications: {
          budgetAlertsEnabled: notifications.budgetAlertsEnabled !== false,
          budgetAlertThreshold: Number.isFinite(Number(notifications.budgetAlertThreshold))
            ? Number(notifications.budgetAlertThreshold)
            : 0.8,
        },
        automation: { autoCategorizeEnabled: automation.autoCategorizeEnabled !== false },
        security: {
          pinEnabled: security.pinEnabled === true,
          pinSalt: typeof security.pinSalt === 'string' ? security.pinSalt : '',
          pinHash: typeof security.pinHash === 'string' ? security.pinHash : '',
        },
      };
      data.goalSchedules = Array.isArray(data.goalSchedules) ? data.goalSchedules : [];
      data.goalContributions = Array.isArray(data.goalContributions) ? data.goalContributions : [];
      data.transactionRules = Array.isArray(data.transactionRules) ? data.transactionRules : [];
      data.auditLog = Array.isArray(data.auditLog) ? data.auditLog : [];
      dispatch({ type: 'SET_DATA', payload: data });
      dispatch({ type: 'SET_THEME', payload: theme });
      dispatch({ type: 'SET_PIN_LOCK', payload: data.settings?.security?.pinEnabled === true });

      await ensureMonthRecurrences(state.currentMonth);

      const onboardingState = data.settings && data.settings.onboarding ? data.settings.onboarding : { tutorialCompleted: false };
      if (!onboardingState.tutorialCompleted) {
        dispatch({ type: 'SET_TUTORIAL', payload: { active: true, index: 0 } });
      }

      window.budgetApi.onSystemToast((message) => addToast(message, false));
    }
    init().catch((err) => addToast(`Initialization issue: ${err.message}`, true));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    const notifications = state.data.settings?.notifications;
    if (!notifications || notifications.budgetAlertsEnabled === false) return;
    const threshold = Number.isFinite(Number(notifications.budgetAlertThreshold))
      ? Number(notifications.budgetAlertThreshold)
      : 0.8;
    const mk = toMonthKey(state.currentMonth.toISOString());
    if (!mk) return;
    for (const category of state.data.categories || []) {
      const limit = Number(state.data.budgetLimits?.[category] || 0);
      if (limit <= 0) continue;
      const spent = (state.data.transactions || [])
        .filter((tx) => tx.type === 'expense' && tx.category === category && toMonthKey(tx.date) === mk)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const ratio = spent / limit;
      const nearKey = `${mk}:${category}:near`;
      const overKey = `${mk}:${category}:over`;
      if (ratio >= 1 && !alertCacheRef.current.has(overKey)) {
        addToast(`${category} exceeded its limit this month.`);
        alertCacheRef.current.add(overKey);
        alertCacheRef.current.add(nearKey);
      } else if (ratio >= threshold && !alertCacheRef.current.has(nearKey)) {
        addToast(`${category} reached ${Math.round(ratio * 100)}% of its limit.`);
        alertCacheRef.current.add(nearKey);
      }
    }
  }, [state.currentMonth, state.data.budgetLimits, state.data.categories, state.data.settings?.notifications, state.data.transactions]);

  const isTransactions = state.page === 'transactions';
  const isBudget = state.page === 'budget';
  const isTrends = state.page === 'trends';
  const isIntelligence = state.page === 'intelligence';
  const isSettings = state.page === 'settings';
  const showSidebar = isTransactions || isBudget;

  return (
    <div className={styles.app}>
      <TopBar addToast={addToast} ensureMonthRecurrences={ensureMonthRecurrences} />
      <main className={`${styles.content} ${showSidebar ? '' : styles.singleColumn}`}>
        <section className={styles.mainPanel}>
          {(isTransactions || isBudget) && (
            <>
              <SummaryPanel />
              <InsightsBar />
            </>
          )}
          {isTransactions && <TransactionsPage addToast={addToast} />}
          {isBudget && <BudgetPage addToast={addToast} />}
          {isTrends && <TrendsPanel />}
          {isIntelligence && <IntelligencePage />}
          {isSettings && <SettingsPage addToast={addToast} />}
        </section>
        {showSidebar && <BudgetSidebar />}
      </main>
      <ToastContainer addToast={addToast} />
      {state.tutorial.active && <TutorialOverlay />}
      {state.pinLocked && <PinLockOverlay addToast={addToast} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

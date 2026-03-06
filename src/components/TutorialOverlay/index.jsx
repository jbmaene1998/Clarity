import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './TutorialOverlay.module.css';

const TUTORIAL_STEPS = [
  {
    selector: '#transactionsTab',
    page: 'transactions',
    title: 'Transactions',
    text: 'Start here for day-to-day tracking. You can add entries, filter records, and review monthly history.',
  },
  {
    selector: '#monthPrev',
    page: 'transactions',
    title: 'Month Navigation',
    text: 'Use the month arrows to move across periods. Every page updates to the selected month.',
  },
  {
    selector: '#toggleEntry',
    page: 'transactions',
    title: 'Add Transaction',
    text: 'Open the entry form, choose Expense or Income, then fill in date, description, amount, and category or source.',
  },
  {
    selector: '#importCsvBtn',
    page: 'transactions',
    title: 'Import CSV',
    text: 'Bulk import transactions from CSV. Invalid rows are skipped and reported in the toast summary.',
  },
  {
    selector: '#exportCsvBtn',
    page: 'transactions',
    title: 'Export CSV',
    text: 'Export your current records to CSV for backup or spreadsheet analysis.',
  },
  {
    selector: '#txFilters',
    page: 'transactions',
    title: 'Filters',
    text: 'Narrow the list by type, category or source, and description search.',
  },
  {
    selector: '#txTable',
    page: 'transactions',
    title: 'Transaction Table',
    text: 'Review filtered transactions for the selected month. Deleting an entry also gives an Undo action.',
  },
  {
    selector: '#budgetTab',
    page: 'budget',
    title: 'Budget',
    text: 'Configure your budget structure: categories, income sources, recurring transactions, and savings goals.',
  },
  {
    selector: '#categoryToolbar',
    page: 'budget',
    title: 'Categories',
    text: 'Add expense categories and define limits used in summaries and sidebar progress bars.',
  },
  {
    selector: '#sourceToolbar',
    page: 'budget',
    title: 'Income Sources',
    text: 'Create and manage income sources used when logging income transactions.',
  },
  {
    selector: '#recurringForm',
    page: 'budget',
    title: 'Recurring Transactions',
    text: 'Schedule monthly recurring income or expenses by start date and day. They are materialized into monthly entries.',
  },
  {
    selector: '#goalsToolbar',
    page: 'budget',
    title: 'Savings Goals',
    text: 'Set savings targets, contribute over time, and track progress with goal bars.',
  },
  {
    selector: '#trendsTab',
    page: 'trends',
    title: 'Trends',
    text: 'Open Trends to compare income, expenses, and savings over recent months.',
  },
  {
    selector: '#intelligenceTab',
    page: 'intelligence',
    title: 'Intelligence',
    text: 'Open Intelligence for automatic insights like spend spikes, unusual expenses, and streaks.',
  },
  {
    selector: '#settingsTab',
    page: 'settings',
    title: 'Settings',
    text: 'Manage appearance, automation rules, alerts, import/export tools, and backup controls.',
  },
  {
    selector: '#runTutorialAgainBtn',
    page: 'settings',
    title: 'Run Tutorial Again',
    text: 'You can restart this guided tour anytime from Settings.',
  },
];

export default function TutorialOverlay() {
  const { state, dispatch } = useApp();
  const spotlightRef = useRef(null);
  const cardRef = useRef(null);

  const step = TUTORIAL_STEPS[state.tutorial.index];
  const isLastStep = state.tutorial.index === TUTORIAL_STEPS.length - 1;
  const canGoBack = state.tutorial.index > 0;
  const progressPct = ((state.tutorial.index + 1) / TUTORIAL_STEPS.length) * 100;

  useLayoutEffect(() => {
    if (!state.tutorial.active || !step || !step.page || state.page === step.page) return;
    dispatch({ type: 'SET_PAGE', payload: step.page });
  }, [dispatch, state.page, state.tutorial.active, step]);

  const updateSpotlight = useCallback(() => {
    if (!step || !spotlightRef.current || !cardRef.current) return;
    const target = document.querySelector(step.selector);
    if (!target) {
      spotlightRef.current.style.opacity = '0';
      cardRef.current.style.top = '16px';
      cardRef.current.style.left = '50%';
      cardRef.current.style.transform = 'translateX(-50%)';
      cardRef.current.dataset.placement = 'center';
      return;
    }
    spotlightRef.current.style.opacity = '1';
    cardRef.current.style.transform = 'none';
    cardRef.current.dataset.placement = 'bottom';

    const rect = target.getBoundingClientRect();
    const pad = 8;
    const width = Math.max(70, rect.width + pad * 2);
    const height = Math.max(44, rect.height + pad * 2);

    spotlightRef.current.style.left = `${Math.max(8, rect.left - pad)}px`;
    spotlightRef.current.style.top = `${Math.max(8, rect.top - pad)}px`;
    spotlightRef.current.style.width = `${width}px`;
    spotlightRef.current.style.height = `${height}px`;

    const cardHeight = cardRef.current.offsetHeight;
    const cardWidth = cardRef.current.offsetWidth;
    const margin = 12;
    const desiredBottomTop = rect.bottom + 14;
    const desiredTopTop = rect.top - cardHeight - 14;
    const fitsBelow = desiredBottomTop + cardHeight <= window.innerHeight - margin;
    const fitsAbove = desiredTopTop >= margin;
    const top = fitsBelow
      ? desiredBottomTop
      : (fitsAbove ? desiredTopTop : Math.max(margin, Math.min(desiredBottomTop, window.innerHeight - cardHeight - margin)));
    cardRef.current.dataset.placement = fitsBelow || !fitsAbove ? 'bottom' : 'top';

    const centeredLeft = rect.left + rect.width / 2 - cardRef.current.offsetWidth / 2;
    const left = Math.max(margin, Math.min(centeredLeft, window.innerWidth - cardWidth - margin));

    cardRef.current.style.top = `${top}px`;
    cardRef.current.style.left = `${left}px`;
  }, [step]);

  const alignToStep = useCallback(() => {
    if (!step) return;
    const target = document.querySelector(step.selector);
    if (target) {
      const rect = target.getBoundingClientRect();
      const pad = 24;
      if (rect.top < pad || rect.bottom > window.innerHeight - pad) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }
    updateSpotlight();
  }, [step, updateSpotlight]);

  useLayoutEffect(() => {
    let attempts = 0;
    let rafId = 0;

    function sync() {
      alignToStep();
      const target = step ? document.querySelector(step.selector) : null;
      if (!target && attempts < 12) {
        attempts += 1;
        rafId = window.requestAnimationFrame(sync);
      }
    }

    sync();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [alignToStep, state.page, state.tutorial.index, step]);

  useEffect(() => {
    if (!state.tutorial.active || !step) return;
    let rafId = 0;

    function scheduleUpdate() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateSpotlight();
      });
    }

    function onViewportChange() {
      updateSpotlight();
    }

    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', scheduleUpdate, true);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [state.tutorial.active, step, updateSpotlight]);

  async function finishTutorial() {
    dispatch({ type: 'STOP_DEMO' });
    dispatch({ type: 'SET_TUTORIAL', payload: { active: false } });
    try {
      await window.budgetApi.updateOnboardingSettings({ tutorialCompleted: true });
    } catch (_e) {
      // best-effort
    }
  }

  function handleNext() {
    if (isLastStep) {
      finishTutorial();
    } else {
      dispatch({ type: 'SET_TUTORIAL', payload: { index: state.tutorial.index + 1 } });
    }
  }

  function handleBack() {
    if (!canGoBack) return;
    dispatch({ type: 'SET_TUTORIAL', payload: { index: state.tutorial.index - 1 } });
  }

  useEffect(() => {
    if (!state.tutorial.active) return;
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finishTutorial();
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        handleNext();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleBack();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.tutorial.active, canGoBack, isLastStep, state.tutorial.index]);

  if (!step) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />
      <div ref={spotlightRef} className={styles.spotlight} />
      <div ref={cardRef} className={styles.card}>
        <div className={styles.header}>
          <div className={styles.steps}>Guided Tour</div>
          <div className={styles.count}>Step {state.tutorial.index + 1} / {TUTORIAL_STEPS.length}</div>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <h4>{step.title}</h4>
        <p>{step.text}</p>
        <div className={styles.actions}>
          <button id="tutorialSkipBtn" type="button" className={styles.ghostAction} onClick={finishTutorial}>Skip</button>
          <button id="tutorialBackBtn" type="button" className={styles.secondaryAction} onClick={handleBack} disabled={!canGoBack}>Back</button>
          <button id="tutorialNextBtn" type="button" className={styles.primaryAction} onClick={handleNext}>
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
        <div className={styles.shortcutHint}>Esc to close, arrows to navigate</div>
      </div>
    </div>
  );
}

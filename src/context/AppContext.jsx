import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  data: {
    transactions: [],
    categories: [],
    sources: [],
    budgetLimits: {},
    recurrences: [],
    goals: [],
    goalSchedules: [],
    goalContributions: [],
    transactionRules: [],
    auditLog: [],
    settings: {
      onboarding: { tutorialCompleted: false },
      appearance: { theme: 'light' },
      budget: { rolloverEnabled: true },
      notifications: { budgetAlertsEnabled: true, budgetAlertThreshold: 0.8 },
      automation: { autoCategorizeEnabled: true },
    },
  },
  currentMonth: new Date(),
  page: 'transactions',
  pinLocked: false,
  tutorial: { active: false, index: 0 },
  filters: { type: '', classification: '', query: '' },
  theme: 'light',
  toasts: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_PIN_LOCK':
      return { ...state, pinLocked: Boolean(action.payload) };
    case 'SET_MONTH':
      return { ...state, currentMonth: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_TUTORIAL':
      return { ...state, tutorial: { ...state.tutorial, ...action.payload } };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    default:
      return state;
  }
}

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

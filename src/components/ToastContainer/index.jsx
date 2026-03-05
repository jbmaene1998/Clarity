import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './ToastContainer.module.css';

export default function ToastContainer({ addToast }) {
  const { state, dispatch } = useApp();

  function handleAction(toast) {
    dispatch({ type: 'REMOVE_TOAST', payload: toast.id });
    if (toast.action) {
      toast.action(addToast);
    }
  }

  return (
    <div id="toastWrap" className={styles.toastWrap}>
      {state.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast}${toast.isError ? ` ${styles.error}` : ''}`}
        >
          <span>{toast.message}</span>
          {toast.actionLabel && toast.action && (
            <button type="button" onClick={() => handleAction(toast)}>
              {toast.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

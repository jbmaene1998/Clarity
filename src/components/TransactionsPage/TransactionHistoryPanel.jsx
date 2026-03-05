import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency } from '../../utils/format.js';
import styles from './TransactionHistoryPanel.module.css';

export default function TransactionHistoryPanel({ addToast }) {
  const { state, dispatch } = useApp();
  const items = (state.data.auditLog || [])
    .filter((entry) => entry.type && entry.type.startsWith('transaction-'))
    .slice(0, 8);

  async function handleUndo() {
    const response = await window.budgetApi.undoLastTransactionAction();
    if (!response.ok) {
      addToast(response.error || 'Could not undo action', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast(`Undid ${response.undone.replace('transaction-', '')} action.`);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h4>Recent Actions</h4>
        <button id="undoLastActionBtn" type="button" onClick={handleUndo} disabled={items.length === 0}>
          Undo Last
        </button>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>No transaction history yet.</div>
      ) : (
        <div className={styles.list}>
          {items.map((entry) => (
            <div key={entry.id} className={styles.row}>
              <span>{entry.type.replace('transaction-', '')}</span>
              <span>{entry.transaction?.description || '-'}</span>
              <span>{currency(entry.transaction?.amount || 0)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

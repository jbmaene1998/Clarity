import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey } from '../../utils/format.js';
import { filteredTransactions } from '../../utils/budget.js';
import styles from './TransactionTable.module.css';

export default function TransactionTable({ addToast }) {
  const { state, dispatch } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());
  const list = filteredTransactions(state.data.transactions, mk, state.filters)
    .sort((a, b) => b.date.localeCompare(a.date));

  async function handleDelete(tx) {
    const response = await window.budgetApi.deleteTransaction(tx.id);
    if (!response.ok) {
      addToast(response.error || 'Unable to delete transaction', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    const deleted = response.deleted;
    if (deleted) {
      addToast('Transaction deleted', false, 'Undo', async (addToast2) => {
        const undo = await window.budgetApi.restoreTransaction(deleted);
        if (!undo.ok) {
          addToast2(undo.error || 'Unable to undo delete', true);
          return;
        }
        dispatch({ type: 'SET_DATA', payload: undo.data });
        addToast2('Deletion undone');
      });
    } else {
      addToast('Transaction deleted');
    }
  }

  if (list.length === 0) {
    return (
      <div className={styles.empty}>
        No transactions found for this month and filter selection.
      </div>
    );
  }

  return (
    <table id="txTable">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category / Source</th>
          <th>Type</th>
          <th>Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="txBody">
        {list.map((tx) => (
          <tr key={tx.id}>
            <td>{tx.date}</td>
            <td>{tx.description}</td>
            <td>{tx.type === 'income' ? tx.source || '-' : tx.category || '-'}</td>
            <td>{tx.type}</td>
            <td>{currency(tx.amount)}</td>
            <td>
              <button type="button" onClick={() => handleDelete(tx)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

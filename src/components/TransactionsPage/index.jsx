import React from 'react';
import TransactionForm from './TransactionForm.jsx';
import TransactionFilters from './TransactionFilters.jsx';
import TransactionTable from './TransactionTable.jsx';
import TransactionHistoryPanel from './TransactionHistoryPanel.jsx';

export default function TransactionsPage({ addToast }) {
  return (
    <section id="transactionsPage">
      <TransactionForm addToast={addToast} />
      <TransactionFilters />
      <TransactionTable addToast={addToast} />
      <TransactionHistoryPanel addToast={addToast} />
    </section>
  );
}

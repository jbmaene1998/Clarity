import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './TransactionForm.module.css';

export default function TransactionForm({ addToast }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState('expense');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txSource, setTxSource] = useState('');
  const [txAmount, setTxAmount] = useState('');

  useEffect(() => {
    if (state.data.settings?.automation?.autoCategorizeEnabled === false) return;
    const rules = state.data.transactionRules || [];
    const text = txDescription.toLowerCase();
    if (!text) return;
    const match = rules.find((rule) => rule.enabled !== false && text.includes(String(rule.keyword || '').toLowerCase()));
    if (!match) return;
    if (match.type === 'expense') {
      setTxType('expense');
      if (match.category && state.data.categories.includes(match.category)) {
        setTxCategory(match.category);
      }
    }
    if (match.type === 'income') {
      setTxType('income');
      if (match.source && state.data.sources.includes(match.source)) {
        setTxSource(match.source);
      }
    }
  }, [txDescription, state.data.transactionRules, state.data.settings?.automation?.autoCategorizeEnabled, state.data.categories, state.data.sources]);

  async function handleImportCsv() {
    const response = await window.budgetApi.importCsv();
    if (!response.ok) {
      addToast(response.error || 'Unable to import CSV', true);
      return;
    }
    if (response.canceled) return;
    dispatch({ type: 'SET_DATA', payload: response.data });
    const errorCount = response.errors ? response.errors.length : 0;
    addToast(`Imported ${response.imported} rows${errorCount ? ` (${errorCount} errors)` : ''}`);
  }

  async function handleExportCsv() {
    const response = await window.budgetApi.exportCsv();
    if (!response.ok) {
      addToast(response.error || 'Unable to export CSV', true);
      return;
    }
    if (!response.canceled) {
      addToast('CSV exported');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      date: txDate,
      description: txDescription,
      category: txType === 'expense' ? txCategory : '',
      source: txType === 'income' ? txSource : '',
      amount: txAmount,
      type: txType,
    };
    const response = await window.budgetApi.addTransaction(payload);
    if (!response.ok) {
      addToast(response.error || 'Unable to save transaction', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setTxDescription('');
    setTxAmount('');
    addToast('Transaction saved');
  }

  return (
    <>
      <div className={styles.toolbar}>
        <button id="toggleEntry" type="button" onClick={() => setOpen((o) => !o)}>
          Add Transaction
        </button>
        <button id="importCsvBtn" type="button" onClick={handleImportCsv}>Import CSV</button>
        <button id="exportCsvBtn" type="button" onClick={handleExportCsv}>Export CSV</button>
      </div>

      {open && (
        <form className={styles.entryPane} onSubmit={handleSubmit}>
          <input
            type="date"
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            required
          />
          <input
            placeholder="Description"
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
            required
          />
          {txType === 'expense' ? (
            <select
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {state.data.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <select
              value={txSource}
              onChange={(e) => setTxSource(e.target.value)}
              required
            >
              <option value="">Select source</option>
              {state.data.sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount €"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            required
          />
          <select value={txType} onChange={(e) => setTxType(e.target.value)} required>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button type="submit">Save</button>
        </form>
      )}
    </>
  );
}

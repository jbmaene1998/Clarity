import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency } from '../../utils/format.js';
import styles from './RecurringSection.module.css';

export default function RecurringSection({ addToast }) {
  const { state, dispatch } = useApp();
  const [recType, setRecType] = useState('expense');
  const [recDescription, setRecDescription] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('');
  const [recSource, setRecSource] = useState('');
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [recDay, setRecDay] = useState(String(new Date().getUTCDate()));

  const previewRows = useMemo(() => {
    const rows = [];
    const base = new Date(recStartDate);
    const day = Number(recDay);
    if (Number.isNaN(base.getTime()) || !Number.isInteger(day) || day < 1 || day > 31) {
      return rows;
    }
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
      const monthLastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, monthLastDay));
      rows.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }
    return rows;
  }, [recDay, recStartDate]);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      description: recDescription,
      amount: recAmount,
      type: recType,
      category: recType === 'expense' ? recCategory : '',
      source: recType === 'income' ? recSource : '',
      startDate: recStartDate,
      dayOfMonth: recDay,
    };
    const response = await window.budgetApi.addRecurring(payload);
    if (!response.ok) {
      addToast(response.error || 'Unable to add recurring', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setRecDescription('');
    setRecAmount('');
    addToast('Recurring transaction added');
  }

  async function handleDelete(id) {
    const response = await window.budgetApi.deleteRecurring(id);
    if (!response.ok) {
      addToast(response.error || 'Unable to delete recurring', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Recurring transaction deleted');
  }

  return (
    <>
      <div id="recurringTitle" className={styles.sectionTitle}>Recurring Transactions</div>
      <form id="recurringForm" className={styles.entryPane} onSubmit={handleSubmit}>
        <input
          placeholder="Description"
          value={recDescription}
          onChange={(e) => setRecDescription(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount €"
          value={recAmount}
          onChange={(e) => setRecAmount(e.target.value)}
          required
        />
        <select value={recType} onChange={(e) => setRecType(e.target.value)} required>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        {recType === 'expense' ? (
          <select value={recCategory} onChange={(e) => setRecCategory(e.target.value)}>
            <option value="">Select category</option>
            {state.data.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <select value={recSource} onChange={(e) => setRecSource(e.target.value)}>
            <option value="">Select source</option>
            {state.data.sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={recStartDate}
          onChange={(e) => setRecStartDate(e.target.value)}
          required
        />
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Day (1-31)"
          value={recDay}
          onChange={(e) => setRecDay(e.target.value)}
          required
        />
        <button type="submit">Add Recurring</button>
      </form>
      <div className={styles.preview}>
        <strong>Upcoming 6 occurrences:</strong>
        <div className={styles.previewList}>
          {previewRows.length === 0 ? (
            <span>Provide a valid start date and day.</span>
          ) : (
            previewRows.map((row) => <span key={row.key}>{row.label}</span>)
          )}
        </div>
      </div>
      <div id="recurringList" className={styles.list}>
        {state.data.recurrences.length === 0 ? (
          <div className={styles.empty}>No recurring transactions.</div>
        ) : (
          state.data.recurrences.map((rec) => (
            <div key={rec.id} className={styles.limitRow}>
              <div>{rec.description}</div>
              <div>{currency(rec.amount)} ({rec.type})</div>
              <div>Day {rec.dayOfMonth}</div>
              <div>{rec.type === 'income' ? rec.source : rec.category}</div>
              <button type="button" onClick={() => handleDelete(rec.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

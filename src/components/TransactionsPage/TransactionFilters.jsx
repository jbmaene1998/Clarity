import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './TransactionFilters.module.css';

export default function TransactionFilters() {
  const { state, dispatch } = useApp();
  const { filters, data } = state;

  function setFilter(patch) {
    dispatch({ type: 'SET_FILTERS', payload: patch });
  }

  function handleTypeChange(e) {
    const type = e.target.value;
    // Reset classification if no longer valid
    let classification = filters.classification;
    if (type === 'income' && classification.startsWith('category:')) classification = '';
    if (type === 'expense' && classification.startsWith('source:')) classification = '';
    setFilter({ type, classification });
  }

  function handleClear() {
    setFilter({ type: '', classification: '', query: '' });
  }

  const classificationOptions = [];
  if (filters.type !== 'income') {
    for (const name of data.categories) {
      classificationOptions.push({ value: `category:${name}`, label: `Category: ${name}` });
    }
  }
  if (filters.type !== 'expense') {
    for (const name of data.sources) {
      classificationOptions.push({ value: `source:${name}`, label: `Source: ${name}` });
    }
  }

  return (
    <div id="txFilters" className={styles.toolbar}>
      <select id="typeFilter" value={filters.type} onChange={handleTypeChange}>
        <option value="">All Types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
      <select
        id="classificationFilter"
        value={filters.classification}
        onChange={(e) => setFilter({ classification: e.target.value })}
      >
        <option value="">All Categories/Sources</option>
        {classificationOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <input
        id="searchFilter"
        placeholder="Search description"
        value={filters.query}
        onChange={(e) => setFilter({ query: e.target.value })}
      />
      <button type="button" onClick={handleClear}>Clear Filters</button>
    </div>
  );
}

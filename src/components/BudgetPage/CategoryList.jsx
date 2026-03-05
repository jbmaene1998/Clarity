import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency, toMonthKey } from '../../utils/format.js';
import { computeCategoryBudgetState } from '../../utils/budget.js';
import styles from './CategoryList.module.css';

export default function CategoryList({ addToast }) {
  const { state, dispatch } = useApp();
  const mk = toMonthKey(state.currentMonth.toISOString());
  const rolloverEnabled = state.data.settings?.budget?.rolloverEnabled !== false;
  const [newCategory, setNewCategory] = useState('');
  const [limits, setLimits] = useState({});

  async function handleAddCategory() {
    const response = await window.budgetApi.addCategory(newCategory);
    if (!response.ok) {
      addToast(response.error || 'Unable to add category', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setNewCategory('');
    addToast('Category added');
  }

  async function handleSaveLimit(category) {
    const limit = limits[category] ?? state.data.budgetLimits[category] ?? '';
    const response = await window.budgetApi.setBudgetLimit(category, limit);
    if (!response.ok) {
      addToast(response.error || 'Unable to update limit', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Limit updated');
  }

  async function handleDeleteCategory(category) {
    const response = await window.budgetApi.deleteCategory(category);
    if (!response.ok) {
      addToast(response.error || 'Unable to delete category', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Category deleted');
  }

  return (
    <>
      <div id="categoryToolbar" className={styles.toolbar}>
        <input
          placeholder="New category name"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <button type="button" onClick={handleAddCategory}>Add Category</button>
      </div>
      <div id="categoryList" className={styles.list}>
        <div className={styles.headerRow}>
          <span>Category</span>
          <span>Spent</span>
          <span>Carry</span>
          <span>Available</span>
          <span>Base Limit</span>
          <span />
          <span />
        </div>
        {state.data.categories.map((category) => {
          const baseLimit = limits[category] !== undefined
            ? limits[category]
            : (state.data.budgetLimits[category] ?? '');
          const budgetState = computeCategoryBudgetState(
            state.data.transactions,
            mk,
            category,
            baseLimit,
            rolloverEnabled
          );
          return (
            <div key={category} className={styles.limitRow}>
              <div>{category}</div>
              <div>{currency(budgetState.spent)}</div>
              <div>{currency(budgetState.carryover)}</div>
              <div>{currency(budgetState.effectiveLimit)}</div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={baseLimit}
                onChange={(e) => setLimits((prev) => ({ ...prev, [category]: e.target.value }))}
              />
              <button type="button" onClick={() => handleSaveLimit(category)}>Save Limit</button>
              <button type="button" onClick={() => handleDeleteCategory(category)}>Delete</button>
            </div>
          );
        })}
      </div>
    </>
  );
}

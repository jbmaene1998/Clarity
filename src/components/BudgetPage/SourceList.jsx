import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './CategoryList.module.css';

export default function SourceList({ addToast }) {
  const { state, dispatch } = useApp();
  const [newSource, setNewSource] = useState('');

  async function handleAddSource() {
    const response = await window.budgetApi.addSource(newSource);
    if (!response.ok) {
      addToast(response.error || 'Unable to add source', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setNewSource('');
    addToast('Source added');
  }

  async function handleDeleteSource(source) {
    const response = await window.budgetApi.deleteSource(source);
    if (!response.ok) {
      addToast(response.error || 'Unable to delete source', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Source deleted');
  }

  return (
    <>
      <div id="sourceToolbar" className={styles.toolbar} style={{ marginTop: '14px' }}>
        <input
          placeholder="New income source"
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
        />
        <button type="button" onClick={handleAddSource}>Add Source</button>
      </div>
      <div id="sourceList" className={styles.list}>
        {state.data.sources.map((source) => (
          <div key={source} className={styles.limitRow}>
            <div>{source}</div>
            <div></div>
            <div></div>
            <div></div>
            <button type="button" onClick={() => handleDeleteSource(source)}>Delete</button>
          </div>
        ))}
      </div>
    </>
  );
}

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { currency } from '../../utils/format.js';
import styles from './GoalsSection.module.css';

export default function GoalsSection({ addToast }) {
  const { state, dispatch } = useApp();
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [contributions, setContributions] = useState({});
  const [scheduleDrafts, setScheduleDrafts] = useState({});

  async function handleAddGoal() {
    const response = await window.budgetApi.addGoal(goalName, goalTarget);
    if (!response.ok) {
      addToast(response.error || 'Unable to add goal', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setGoalName('');
    setGoalTarget('');
    addToast('Goal added');
  }

  async function handleContribute(id) {
    const amount = contributions[id] || '';
    const response = await window.budgetApi.contributeGoal(id, amount);
    if (!response.ok) {
      addToast(response.error || 'Unable to contribute', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setContributions((prev) => ({ ...prev, [id]: '' }));
    addToast('Contribution added');
  }

  async function handleDeleteGoal(id) {
    const response = await window.budgetApi.deleteGoal(id);
    if (!response.ok) {
      addToast(response.error || 'Unable to delete goal', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Goal deleted');
  }

  function getScheduleDraft(goalId) {
    return scheduleDrafts[goalId] || {
      source: state.data.sources[0] || '',
      amount: '',
      dayOfMonth: String(new Date().getUTCDate()),
      startDate: new Date().toISOString().slice(0, 10),
    };
  }

  async function handleAddSchedule(goalId) {
    const draft = getScheduleDraft(goalId);
    const response = await window.budgetApi.addGoalSchedule({
      goalId,
      source: draft.source,
      amount: draft.amount,
      dayOfMonth: draft.dayOfMonth,
      startDate: draft.startDate,
    });
    if (!response.ok) {
      addToast(response.error || 'Unable to add auto-contribution', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setScheduleDrafts((prev) => ({
      ...prev,
      [goalId]: { ...getScheduleDraft(goalId), amount: '' },
    }));
    addToast('Auto-contribution schedule added');
  }

  async function handleDeleteSchedule(id) {
    const response = await window.budgetApi.deleteGoalSchedule(id);
    if (!response.ok) {
      addToast(response.error || 'Unable to delete schedule', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Auto-contribution schedule deleted');
  }

  return (
    <>
      <div id="goalsTitle" className={styles.sectionTitle}>Savings Goals</div>
      <div id="goalsToolbar" className={styles.toolbar}>
        <input
          placeholder="Goal name"
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
        />
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Target €"
          value={goalTarget}
          onChange={(e) => setGoalTarget(e.target.value)}
        />
        <button type="button" onClick={handleAddGoal}>Add Goal</button>
      </div>
      <div id="goalsList" className={styles.list}>
        {state.data.goals.length === 0 ? (
          <div className={styles.empty}>No savings goals.</div>
        ) : (
          state.data.goals.map((goal) => {
            const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
            const draft = getScheduleDraft(goal.id);
            const schedules = (state.data.goalSchedules || []).filter((item) => item.goalId === goal.id);
            return (
              <div key={goal.id} className={styles.panel}>
                <div>{goal.name}: {currency(goal.current)} / {currency(goal.target)}</div>
                <div className={styles.bar}>
                  <div className={styles.fillGreen} style={{ width: `${progress}%` }} />
                </div>
                <div className={styles.controls}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Amount"
                    className={styles.goalAmount}
                    value={contributions[goal.id] || ''}
                    onChange={(e) => setContributions((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                  />
                  <button type="button" onClick={() => handleContribute(goal.id)}>Add</button>
                  <button type="button" onClick={() => handleDeleteGoal(goal.id)}>Delete</button>
                </div>
                <div className={styles.scheduleBox}>
                  <strong>Auto-contribution schedule</strong>
                  <div className={styles.scheduleControls}>
                    <select
                      value={draft.source}
                      onChange={(e) => setScheduleDrafts((prev) => ({ ...prev, [goal.id]: { ...draft, source: e.target.value } }))}
                    >
                      {state.data.sources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Amount"
                      value={draft.amount}
                      onChange={(e) => setScheduleDrafts((prev) => ({ ...prev, [goal.id]: { ...draft, amount: e.target.value } }))}
                    />
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={draft.dayOfMonth}
                      onChange={(e) => setScheduleDrafts((prev) => ({ ...prev, [goal.id]: { ...draft, dayOfMonth: e.target.value } }))}
                    />
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => setScheduleDrafts((prev) => ({ ...prev, [goal.id]: { ...draft, startDate: e.target.value } }))}
                    />
                    <button type="button" onClick={() => handleAddSchedule(goal.id)}>Add Auto</button>
                  </div>
                  {schedules.length > 0 && (
                    <div className={styles.scheduleList}>
                      {schedules.map((item) => (
                        <div key={item.id} className={styles.scheduleRow}>
                          <span>{item.source}</span>
                          <span>{currency(item.amount)}</span>
                          <span>Day {item.dayOfMonth}</span>
                          <button type="button" onClick={() => handleDeleteSchedule(item.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

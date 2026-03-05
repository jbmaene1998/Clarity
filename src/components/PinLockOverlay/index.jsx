import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './PinLockOverlay.module.css';

export default function PinLockOverlay({ addToast }) {
  const { dispatch } = useApp();
  const [pin, setPin] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  async function handleUnlock(event) {
    event.preventDefault();
    setIsChecking(true);
    try {
      const response = await window.budgetApi.verifyPin(pin);
      if (!response.ok || !response.verified) {
        addToast('Incorrect PIN', true);
        return;
      }
      dispatch({ type: 'SET_PIN_LOCK', payload: false });
      setPin('');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.card} onSubmit={handleUnlock}>
        <h2>Clarity Locked</h2>
        <p>Enter your PIN to unlock.</p>
        <input
          id="unlockPinInput"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="PIN"
          required
        />
        <button id="unlockPinBtn" type="submit" disabled={isChecking || pin.length < 4}>
          {isChecking ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}

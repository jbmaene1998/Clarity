import React, { useState } from 'react';
import styles from './PinSetupModal.module.css';

export default function PinSetupModal({ onDone, addToast }) {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'form'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSkip() {
    await window.budgetApi.updateOnboardingSettings({ pinSetupSeen: true });
    onDone();
  }

  async function handleSetPin(event) {
    event.preventDefault();
    if (pin.length < 4) {
      addToast('PIN must be at least 4 digits.', true);
      return;
    }
    if (pin !== confirmPin) {
      addToast('PINs do not match.', true);
      return;
    }
    setIsSaving(true);
    try {
      const response = await window.budgetApi.setPin(pin);
      if (!response.ok) {
        addToast(response.error || 'Failed to set PIN.', true);
        return;
      }
      await window.budgetApi.updateOnboardingSettings({ pinSetupSeen: true });
      addToast('PIN set successfully.');
      onDone(response.data);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {step === 'prompt' ? (
          <>
            <h2>Protect Your Data</h2>
            <p>
              You can set an optional PIN to lock Clarity when you step away.
              You can always change or remove it later in Settings.
            </p>
            <div className={styles.actions}>
              <button
                id="pinSetupSkipBtn"
                type="button"
                className={styles.secondaryButton}
                onClick={handleSkip}
              >
                Skip
              </button>
              <button
                id="pinSetupContinueBtn"
                type="button"
                onClick={() => setStep('form')}
              >
                Set a PIN
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSetPin}>
            <h2>Set a PIN</h2>
            <p>Choose a 4–12 digit PIN to lock the app.</p>
            <input
              id="pinSetupPinInput"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              placeholder="PIN (4–12 digits)"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
              required
            />
            <input
              id="pinSetupConfirmInput"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
              required
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => { setStep('prompt'); setPin(''); setConfirmPin(''); }}
              >
                Back
              </button>
              <button
                id="pinSetupSaveBtn"
                type="submit"
                disabled={isSaving || pin.length < 4 || confirmPin.length < 4}
              >
                {isSaving ? 'Saving...' : 'Save PIN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

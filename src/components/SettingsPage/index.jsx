import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import styles from './SettingsPage.module.css';

export default function SettingsPage({ addToast }) {
  const { state, dispatch } = useApp();
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [isUpdatingAppearance, setIsUpdatingAppearance] = useState(false);
  const [isRunningTutorialReset, setIsRunningTutorialReset] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleType, setRuleType] = useState('expense');
  const [ruleTarget, setRuleTarget] = useState('');

  async function handleToggleRollover(event) {
    const enabled = event.target.checked;
    setIsUpdatingBudget(true);
    try {
      const response = await window.budgetApi.updateBudgetSettings({ rolloverEnabled: enabled });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update budget settings');
      }
      dispatch({ type: 'SET_DATA', payload: response.data });
      addToast(`Budget rollover ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      addToast(`Budget settings update failed: ${error.message}`, true);
    } finally {
      setIsUpdatingBudget(false);
    }
  }

  async function handleResetAllData() {
    if (confirmText.trim().toUpperCase() !== 'RESET') {
      addToast('Type RESET to confirm full data reset.', true);
      return;
    }

    setIsResetting(true);
    try {
      const response = await window.budgetApi.resetAllData();
      if (!response.ok) {
        throw new Error(response.error || 'Failed to reset app data');
      }
      dispatch({ type: 'SET_DATA', payload: response.data });
      dispatch({ type: 'SET_THEME', payload: response.data.settings?.appearance?.theme === 'dark' ? 'dark' : 'light' });
      dispatch({ type: 'SET_MONTH', payload: new Date() });
      dispatch({ type: 'SET_FILTERS', payload: { type: '', classification: '', query: '' } });
      dispatch({ type: 'SET_TUTORIAL', payload: { active: false, index: 0 } });
      setConfirmText('');
      addToast('All app data has been reset.');
    } catch (error) {
      addToast(`Reset failed: ${error.message}`, true);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleToggleTheme(event) {
    const theme = event.target.checked ? 'dark' : 'light';
    setIsUpdatingAppearance(true);
    dispatch({ type: 'SET_THEME', payload: theme });
    try {
      const response = await window.budgetApi.updateAppearanceSettings({ theme });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update appearance settings');
      }
      dispatch({ type: 'SET_DATA', payload: response.data });
      addToast(`Theme set to ${theme}.`);
    } catch (error) {
      addToast(`Appearance update failed: ${error.message}`, true);
    } finally {
      setIsUpdatingAppearance(false);
    }
  }

  async function handleRunTutorialAgain() {
    setIsRunningTutorialReset(true);
    try {
      const response = await window.budgetApi.updateOnboardingSettings({ tutorialCompleted: false });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to reset tutorial progress');
      }
      dispatch({ type: 'SET_DATA', payload: response.data });
      dispatch({ type: 'SET_PAGE', payload: 'transactions' });
      dispatch({ type: 'SET_TUTORIAL', payload: { active: true, index: 0 } });
      addToast('Tutorial restarted.');
    } catch (error) {
      addToast(`Could not restart tutorial: ${error.message}`, true);
    } finally {
      setIsRunningTutorialReset(false);
    }
  }

  async function handleImportCsvFromSettings() {
    setIsImporting(true);
    try {
      const response = await window.budgetApi.importCsv();
      if (!response.ok) {
        throw new Error(response.error || 'Unable to import CSV');
      }
      if (response.canceled) return;
      dispatch({ type: 'SET_DATA', payload: response.data });
      const errorCount = response.errors ? response.errors.length : 0;
      addToast(`Imported ${response.imported} rows${errorCount ? ` (${errorCount} errors)` : ''}`);
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsImporting(false);
    }
  }

  async function handleExportCsvFromSettings() {
    setIsExporting(true);
    try {
      const response = await window.budgetApi.exportCsv();
      if (!response.ok) {
        throw new Error(response.error || 'Unable to export CSV');
      }
      if (!response.canceled) addToast('CSV exported');
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportBackup() {
    setIsExportingBackup(true);
    try {
      const response = await window.budgetApi.exportBackup();
      if (!response.ok) throw new Error(response.error || 'Unable to export backup');
      if (!response.canceled) addToast('Backup exported');
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsExportingBackup(false);
    }
  }

  async function handleImportBackup() {
    setIsImportingBackup(true);
    try {
      const response = await window.budgetApi.importBackup();
      if (!response.ok) throw new Error(response.error || 'Unable to import backup');
      if (response.canceled) return;
      dispatch({ type: 'SET_DATA', payload: response.data });
      dispatch({ type: 'SET_THEME', payload: response.data.settings?.appearance?.theme === 'dark' ? 'dark' : 'light' });
      addToast('Backup imported');
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsImportingBackup(false);
    }
  }

  async function handleToggleBudgetAlerts(event) {
    const enabled = event.target.checked;
    setIsUpdatingNotifications(true);
    try {
      const response = await window.budgetApi.updateNotificationSettings({ budgetAlertsEnabled: enabled });
      if (!response.ok) throw new Error(response.error || 'Failed to update notifications');
      dispatch({ type: 'SET_DATA', payload: response.data });
      addToast(`Budget alerts ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  async function handleThresholdChange(event) {
    const value = Number(event.target.value);
    setIsUpdatingNotifications(true);
    try {
      const response = await window.budgetApi.updateNotificationSettings({ budgetAlertThreshold: value });
      if (!response.ok) throw new Error(response.error || 'Failed to update threshold');
      dispatch({ type: 'SET_DATA', payload: response.data });
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  async function handleToggleAutoCategorize(event) {
    const enabled = event.target.checked;
    setIsUpdatingAutomation(true);
    try {
      const response = await window.budgetApi.updateAutomationSettings({ autoCategorizeEnabled: enabled });
      if (!response.ok) throw new Error(response.error || 'Failed to update automation settings');
      dispatch({ type: 'SET_DATA', payload: response.data });
      addToast(`Auto-categorization ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      addToast(error.message, true);
    } finally {
      setIsUpdatingAutomation(false);
    }
  }

  async function handleAddRule() {
    if (!ruleKeyword.trim()) {
      addToast('Keyword is required.', true);
      return;
    }
    if (!ruleTarget) {
      addToast('Select a target category or source.', true);
      return;
    }
    const payload = {
      keyword: ruleKeyword.trim(),
      type: ruleType,
      category: ruleType === 'expense' ? ruleTarget : '',
      source: ruleType === 'income' ? ruleTarget : '',
    };
    const response = await window.budgetApi.addTransactionRule(payload);
    if (!response.ok) {
      addToast(response.error || 'Could not add rule', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    setRuleKeyword('');
    setRuleTarget('');
    addToast('Rule added');
  }

  async function handleDeleteRule(id) {
    const response = await window.budgetApi.deleteTransactionRule(id);
    if (!response.ok) {
      addToast(response.error || 'Could not delete rule', true);
      return;
    }
    dispatch({ type: 'SET_DATA', payload: response.data });
    addToast('Rule removed');
  }

  function handleResetUiView() {
    dispatch({ type: 'SET_MONTH', payload: new Date() });
    dispatch({ type: 'SET_FILTERS', payload: { type: '', classification: '', query: '' } });
    addToast('View reset to current month with cleared filters.');
  }

  return (
    <section className={styles.panel}>
      <h2>Settings</h2>
      <p className={styles.helper}>
        Resetting deletes all transactions, categories, sources, limits, recurring items, goals, and settings.
      </p>
      <div className={styles.preferences}>
        <h3>Appearance & Tour</h3>
        <label className={styles.toggleRow} htmlFor="settingsThemeToggle">
          <input
            id="settingsThemeToggle"
            type="checkbox"
            checked={state.theme === 'dark'}
            onChange={handleToggleTheme}
            disabled={isUpdatingAppearance}
          />
          <span>Enable dark mode</span>
        </label>
        <button
          id="runTutorialAgainBtn"
          type="button"
          className={styles.secondaryButton}
          onClick={handleRunTutorialAgain}
          disabled={isRunningTutorialReset}
        >
          {isRunningTutorialReset ? 'Restarting Tutorial...' : 'Run Tutorial Again'}
        </button>
      </div>
      <div className={styles.preferences}>
        <h3>Budget Preferences</h3>
        <label className={styles.toggleRow} htmlFor="rolloverEnabledToggle">
          <input
            id="rolloverEnabledToggle"
            type="checkbox"
            checked={state.data.settings?.budget?.rolloverEnabled !== false}
            onChange={handleToggleRollover}
            disabled={isUpdatingBudget}
          />
          <span>Enable monthly rollover (carry over unspent or overspent category budgets)</span>
        </label>
        <label className={styles.toggleRow} htmlFor="budgetAlertsToggle">
          <input
            id="budgetAlertsToggle"
            type="checkbox"
            checked={state.data.settings?.notifications?.budgetAlertsEnabled !== false}
            onChange={handleToggleBudgetAlerts}
            disabled={isUpdatingNotifications}
          />
          <span>Enable budget usage alerts</span>
        </label>
        <label className={styles.toggleRow} htmlFor="autoCategorizeToggle">
          <input
            id="autoCategorizeToggle"
            type="checkbox"
            checked={state.data.settings?.automation?.autoCategorizeEnabled !== false}
            onChange={handleToggleAutoCategorize}
            disabled={isUpdatingAutomation}
          />
          <span>Enable auto-categorization by rules</span>
        </label>
        <label className={styles.sliderRow} htmlFor="budgetAlertThreshold">
          <span>Alert threshold</span>
          <input
            id="budgetAlertThreshold"
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={state.data.settings?.notifications?.budgetAlertThreshold || 0.8}
            onChange={handleThresholdChange}
          />
          <span>{Math.round((state.data.settings?.notifications?.budgetAlertThreshold || 0.8) * 100)}%</span>
        </label>
      </div>
      <div className={styles.preferences}>
        <h3>Auto-categorization Rules</h3>
        <div className={styles.actionRow}>
          <input
            placeholder="Keyword (e.g. uber)"
            value={ruleKeyword}
            onChange={(event) => setRuleKeyword(event.target.value)}
          />
          <select value={ruleType} onChange={(event) => { setRuleType(event.target.value); setRuleTarget(''); }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <select value={ruleTarget} onChange={(event) => setRuleTarget(event.target.value)}>
            <option value="">Select target</option>
            {(ruleType === 'expense' ? state.data.categories : state.data.sources).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button type="button" className={styles.secondaryButton} onClick={handleAddRule}>Add Rule</button>
        </div>
        <div className={styles.ruleList}>
          {(state.data.transactionRules || []).length === 0 ? (
            <span className={styles.helper}>No rules yet.</span>
          ) : (
            state.data.transactionRules.map((rule) => (
              <div key={rule.id} className={styles.ruleRow}>
                <span>"{rule.keyword}" {'->'} {rule.type === 'expense' ? rule.category : rule.source}</span>
                <button type="button" className={styles.secondaryButton} onClick={() => handleDeleteRule(rule.id)}>Remove</button>
              </div>
            ))
          )}
        </div>
      </div>
      <div className={styles.preferences}>
        <h3>Data Tools</h3>
        <div className={styles.actionRow}>
          <button
            id="settingsImportCsvBtn"
            type="button"
            className={styles.secondaryButton}
            onClick={handleImportCsvFromSettings}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            id="settingsExportCsvBtn"
            type="button"
            className={styles.secondaryButton}
            onClick={handleExportCsvFromSettings}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
        <button
          id="resetUiViewBtn"
          type="button"
          className={styles.secondaryButton}
          onClick={handleResetUiView}
        >
          Reset View (Current Month + Clear Filters)
        </button>
        <div className={styles.actionRow}>
          <button
            id="settingsExportBackupBtn"
            type="button"
            className={styles.secondaryButton}
            onClick={handleExportBackup}
            disabled={isExportingBackup}
          >
            {isExportingBackup ? 'Exporting Backup...' : 'Export Full Backup'}
          </button>
          <button
            id="settingsImportBackupBtn"
            type="button"
            className={styles.secondaryButton}
            onClick={handleImportBackup}
            disabled={isImportingBackup}
          >
            {isImportingBackup ? 'Importing Backup...' : 'Import Full Backup'}
          </button>
        </div>
      </div>
      <div className={styles.preferences}>
        <h3>Privacy &amp; Data</h3>
        <p className={styles.helper}>
          All your financial data (transactions, budgets, goals, settings) is stored <strong>exclusively on this
          device</strong> in your local app data folder. Nothing is uploaded to any server.
        </p>
        <p className={styles.helper}>
          <strong>Automatic updates:</strong> When the app starts, it contacts GitHub's servers to check for a new
          version. This request includes your IP address and the current app version. No financial data is ever sent.
          GitHub's privacy policy applies to that connection.
        </p>
        <p className={styles.helper}>
          <strong>To delete all your data:</strong> use "Reset All App Data" below, or uninstall the app and delete
          the Clarity folder from your system's application data directory.
        </p>
      </div>
      <div className={styles.dangerZone}>
        <h3>Danger Zone</h3>
        <label htmlFor="resetConfirmInput">Type RESET to confirm:</label>
        <input
          id="resetConfirmInput"
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="RESET"
        />
        <button
          id="resetAllDataBtn"
          type="button"
          className={styles.dangerButton}
          onClick={handleResetAllData}
          disabled={isResetting}
        >
          {isResetting ? 'Resetting...' : 'Reset All App Data'}
        </button>
      </div>
    </section>
  );
}

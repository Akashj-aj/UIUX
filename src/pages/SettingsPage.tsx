import { useState } from 'react';
import { User, Bell, Shield, Database, Download, Upload, RotateCcw, Save, Sun, Moon } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getSettings, updateSettings, getProfile, updateProfile,
  resetAllData, seedSampleData, toRupees, toPaise, formatCurrency
} from '../services/dataService';
import type { DateFormat, ThemeMode } from '../types';
import { useToast } from '../components/ToastProvider';

interface SettingsPageProps {
  onRefresh: () => void;
  onThemeToggle?: (theme: ThemeMode) => void;
}

export default function SettingsPage({ onRefresh, onThemeToggle }: SettingsPageProps) {
  const { addToast } = useToast();
  const currentSettings = getSettings();
  const currentProfile = getProfile();

  // Profile
  const [name, setName] = useState(currentProfile.name);
  const [email, setEmail] = useState(currentProfile.email);

  // Settings
  const [currencySymbol] = useState(currentSettings.currencySymbol);
  const [dateFormat, setDateFormat] = useState<DateFormat>(currentSettings.dateFormat);
  const [theme, setTheme] = useState<ThemeMode>(currentSettings.theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(currentSettings.notificationsEnabled);
  const [budgetThreshold, setBudgetThreshold] = useState(currentSettings.budgetWarningThreshold);
  const [startingBalance, setStartingBalance] = useState(toRupees(currentSettings.startingBalance).toString());

  // Confirm dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    updateProfile({ name: name.trim(), email: email.trim() });
    addToast('Profile updated successfully', 'success');
    onRefresh();
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(startingBalance);
    if (!Number.isFinite(balanceNum) || balanceNum < 0 || !Number.isFinite(budgetThreshold) || budgetThreshold < 0 || budgetThreshold > 100) {
      addToast('Enter a valid non-negative balance and a threshold from 0 to 100', 'error');
      return;
    }

    updateSettings({
      dateFormat,
      theme,
      notificationsEnabled,
      budgetWarningThreshold: budgetThreshold,
      startingBalance: toPaise(balanceNum),
    });

    if (onThemeToggle) {
      onThemeToggle(theme);
    }

    addToast('Preferences saved', 'success');
    onRefresh();
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    updateSettings({ theme: newTheme });
    if (onThemeToggle) {
      onThemeToggle(newTheme);
    }
    addToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} mode`, 'info');
  };

  const handleResetDemoData = () => {
    resetAllData();
    seedSampleData();
    setShowResetConfirm(false);
    addToast('Demo sample data restored successfully', 'success');
    onRefresh();
  };

  const handleClearAllData = () => {
    resetAllData();
    setShowClearConfirm(false);
    addToast('All personal data cleared', 'info');
    onRefresh();
  };

  const handleExportBackup = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('paiseaura_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiseaura_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Backup downloaded successfully', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.keys(data).forEach(key => {
          if (data[key] !== null) {
            localStorage.setItem(key, data[key]);
          }
        });
        addToast('Backup restored successfully!', 'success');
        onRefresh();
      } catch (err) {
        addToast('Invalid backup file JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Preferences & Account Settings</h2>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Manage your personal profile, currency formatting, theme, and data backups
        </span>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <User size={18} style={{ color: 'var(--color-primary-action)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Personal Profile</h3>
        </div>

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            <Save size={14} /> Update Profile
          </button>
        </form>
      </div>

      {/* App Preferences */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Shield size={18} style={{ color: 'var(--color-primary-action)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Financial & Display Preferences</h3>
        </div>

        <form onSubmit={handleSavePreferences}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Currency Symbol</label>
              <input
                type="text"
                className="form-input"
                value={`${currencySymbol} (Indian Rupee - INR)`}
                disabled
                style={{ background: 'var(--color-surface-hover)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select
                className="form-select"
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value as DateFormat)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/10/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/25/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-25)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Starting Account Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={startingBalance}
                onChange={e => setStartingBalance(e.target.value)}
                placeholder="50000"
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Baseline balance: {formatCurrency(toPaise(parseFloat(startingBalance) || 0))}
              </span>
            </div>
          </div>

          {/* Budget threshold */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              Global Budget Alert Threshold: {budgetThreshold}%
            </label>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              className="form-range"
              value={budgetThreshold}
              onChange={e => setBudgetThreshold(parseInt(e.target.value))}
            />
          </div>

          {/* Theme mode selection */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Appearance Theme</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleThemeChange('light')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sun size={14} /> Clean Light
              </button>
              <button
                type="button"
                className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleThemeChange('dark')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Moon size={14} /> Modern Dark
              </button>
            </div>
          </div>

          {/* Notifications toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="notifToggle"
              checked={notificationsEnabled}
              onChange={e => setNotificationsEnabled(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-action)' }}
            />
            <label htmlFor="notifToggle" style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={14} /> Enable budget limit alerts and bill payment reminders
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            <Save size={14} /> Save Preferences
          </button>
        </form>
      </div>

      {/* Data Management & Backup */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Database size={18} style={{ color: 'var(--color-primary-action)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Data & Storage Management</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
          PaiseAura stores all your data securely in your local browser sandbox. No financial data leaves your device.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
            <Download size={14} /> Export JSON Backup
          </button>

          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <Upload size={14} /> Restore JSON Backup
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>

          <button className="btn btn-secondary btn-sm" onClick={() => setShowResetConfirm(true)}>
            <RotateCcw size={14} /> Reset Demo Data
          </button>

          <button className="btn btn-sm btn-ghost" onClick={() => setShowClearConfirm(true)} style={{ color: 'var(--color-error)' }}>
            Clear All Data
          </button>
        </div>
      </div>

      {/* Reset Demo Data Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Demo Data"
        message="This will re-populate PaiseAura with rich sample transactions, recurring subscriptions, budgets, and savings goals. Continue?"
        confirmLabel="Reset Demo Data"
        variant="warning"
        onConfirm={handleResetDemoData}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Clear All Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Data"
        message="Are you sure you want to completely erase all transactions, categories, budgets, and savings? This action cannot be undone."
        confirmLabel="Erase Everything"
        variant="danger"
        onConfirm={handleClearAllData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

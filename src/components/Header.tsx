import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Search, Bell, Plus, Calendar, User, AlertTriangle, CheckCircle2, Info, AlertCircle, ChevronLeft, ChevronRight, X, CalendarRange } from 'lucide-react';
import type { DateRange } from '../types';
import {
  getProfile, getNotifications, getUnreadCount,
  markNotificationRead, markAllNotificationsRead,
  dismissNotification, formatDateRelative, getMonthName
} from '../services/dataService';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddTransaction: () => void;
  onSearch?: (query: string) => void;
  onNavigate?: (view: string) => void;
  searchQuery?: string;
  refreshKey?: number;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
}

export default function Header({ title, subtitle, onAddTransaction, onSearch, onNavigate, searchQuery = '', refreshKey, selectedMonth, selectedYear, onMonthChange, dateRange, onDateRangeChange }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(dateRange?.start || '');
  const [rangeEnd, setRangeEnd] = useState(dateRange?.end || '');
  const [rangeError, setRangeError] = useState('');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [notifications, setNotifications] = useState(getNotifications());
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const profile = getProfile();
  const initials = profile.name.charAt(0).toUpperCase();

  useEffect(() => {
    setRangeStart(dateRange?.start || '');
    setRangeEnd(dateRange?.end || '');
  }, [dateRange]);

  useEffect(() => {
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
  }, [showNotifications, refreshKey]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowMonthPicker(false);
        setShowCustomRange(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    setNotifications(getNotifications());
    setUnreadCount(0);
  };

  const changeMonth = (offset: number) => {
    const next = new Date(selectedYear, selectedMonth + offset, 1);
    onMonthChange(next.getMonth(), next.getFullYear());
  };

  const formatRangeLabel = (range: DateRange) => {
    const start = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T00:00:00`);
    const startLabel = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  };

  const openCustomRange = () => {
    setRangeStart(dateRange?.start || '');
    setRangeEnd(dateRange?.end || '');
    setRangeError('');
    setShowCustomRange(true);
  };

  const applyCustomRange = () => {
    if (!rangeStart || !rangeEnd) {
      setRangeError('Choose both a start and end date.');
      return;
    }
    if (rangeEnd < rangeStart) {
      setRangeError('End date must be on or after the start date.');
      return;
    }
    onDateRangeChange({ start: rangeStart, end: rangeEnd });
    setShowCustomRange(false);
    setShowMonthPicker(false);
  };

  const handleNotificationClick = (id: string, actionUrl?: string) => {
    markNotificationRead(id);
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
    setShowNotifications(false);
    if (!actionUrl) return;
    const separatorIndex = actionUrl.indexOf(':');
    if (separatorIndex === -1) return;
    const targetType = actionUrl.slice(0, separatorIndex);
    const view = targetType === 'budget'
      ? 'budgets'
      : targetType === 'recurring'
        ? 'recurring'
        : targetType === 'savings'
          ? 'savings'
          : targetType === 'transaction'
            ? 'transactions'
            : null;
    if (!view) return;
    onNavigate?.(view);
  };

  const handleDismissNotification = (id: string) => {
    dismissNotification(id);
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
  };

  return (
    <header className="header">
      <div className="header-left">
        <div>
          <div className="header-title">{title}</div>
          {subtitle && <div className="header-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search className="search-icon" size={15} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={localSearch}
            onChange={handleSearch}
            aria-label="Search transactions"
          />
        </div>

        <div className="month-picker" ref={monthRef}>
          <button
            className="date-range-picker"
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            aria-label={dateRange ? `Select date range, ${formatRangeLabel(dateRange)}` : `Select month, ${getMonthName(selectedMonth)} ${selectedYear}`}
            aria-expanded={showMonthPicker}
          >
          <Calendar size={14} />
            <span>{dateRange ? formatRangeLabel(dateRange) : `${getMonthName(selectedMonth)} ${selectedYear}`}</span>
          </button>
          {showMonthPicker && (
            <div className="month-picker-popover" role="dialog" aria-label="Select dashboard month">
              <div className="month-picker-header">
                <button className="btn-icon btn-ghost btn-sm" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
                <strong>{getMonthName(selectedMonth)} {selectedYear}</strong>
                <button className="btn-icon btn-ghost btn-sm" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
              </div>
              <button
                className="btn btn-ghost btn-sm month-picker-current"
                onClick={() => {
                  onMonthChange(now.getMonth(), now.getFullYear());
                  setShowMonthPicker(false);
                }}
              >
                Current month
              </button>
              <button className="month-picker-option" onClick={openCustomRange}>
                <CalendarRange size={14} /> Custom date range
              </button>
              {showCustomRange && (
                <div className="custom-range-panel">
                  <div className="custom-range-label">Select a date range</div>
                  <label>
                    Start date
                    <input type="date" value={rangeStart} onChange={event => { setRangeStart(event.target.value); setRangeError(''); }} />
                  </label>
                  <label>
                    End date
                    <input type="date" value={rangeEnd} min={rangeStart || undefined} onChange={event => { setRangeEnd(event.target.value); setRangeError(''); }} />
                  </label>
                  {rangeStart && rangeEnd && (
                    <div className="custom-range-summary">
                      {rangeStart} – {rangeEnd}
                    </div>
                  )}
                  {rangeError && <div className="form-error" role="alert">{rangeError}</div>}
                  <div className="custom-range-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowCustomRange(false); setRangeError(''); }}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={applyCustomRange}>Apply</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="btn-icon btn-ghost"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleMarkAllRead}
                    style={{ fontSize: 11 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notification-panel-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    <CheckCircle2 size={24} style={{ margin: '0 auto 8px', color: 'var(--color-primary-action)', opacity: 0.7 }} />
                    <div>All caught up!</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>No unread alerts or notifications</div>
                  </div>
                ) : (
                  notifications.map(n => {
                    const iconColor = n.type === 'warning' ? '#D97706' : n.type === 'success' ? '#059669' : n.type === 'error' ? '#DC2626' : '#2563EB';
                    const iconBg = n.type === 'warning' ? 'rgba(217, 119, 6, 0.12)' : n.type === 'success' ? 'rgba(5, 150, 105, 0.12)' : n.type === 'error' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(37, 99, 235, 0.12)';
                    const IconComp = n.type === 'warning' ? AlertTriangle : n.type === 'success' ? CheckCircle2 : n.type === 'error' ? AlertCircle : Info;

                    return (
                      <div
                        key={n.id}
                        className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(n.id, n.actionUrl)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleNotificationClick(n.id, n.actionUrl);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          background: iconBg,
                          color: iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}>
                          <IconComp size={16} />
                        </div>
                        <div className="notification-content" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="notification-title" style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                            {!n.isRead && (
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-action)' }} />
                            )}
                          </div>
                          <div className="notification-message" style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                            {n.message}
                          </div>
                          <div className="notification-time" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {formatDateRelative(n.timestamp)}
                          </div>
                        </div>
                        <button
                          className="btn-icon btn-ghost btn-sm notification-dismiss"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDismissNotification(n.id);
                          }}
                          aria-label={`Dismiss ${n.title}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Transaction Button */}
        <button className="btn btn-primary" onClick={onAddTransaction}>
          <Plus size={16} />
          <span className="btn-label-desktop">Add Expense</span>
        </button>

        {/* User Menu */}
        <div ref={userRef} className="user-menu">
          <div
            className="user-avatar"
            onClick={() => setShowUserMenu(!showUserMenu)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setShowUserMenu(!showUserMenu);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="User menu"
          >
            {initials}
          </div>

          {showUserMenu && (
            <div className="user-dropdown">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{profile.email}</div>
              </div>
              <button
                className="user-dropdown-item"
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  onNavigate?.('settings');
                  setShowUserMenu(false);
                }}
              >
                <User size={14} /> Profile & Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

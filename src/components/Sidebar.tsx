import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, FolderOpen,
  RotateCcw, Target, BarChart3, Settings, Menu, X
} from 'lucide-react';
import { getProfile } from '../services/dataService';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  refreshKey?: number;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'recurring', label: 'Recurring Payments', icon: RotateCcw },
  { id: 'savings', label: 'Savings Goals', icon: Target },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeView, onNavigate, refreshKey }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const collapseTimer = useRef<number | null>(null);
  const profile = useMemo(() => getProfile(), [refreshKey]);
  const profileName = profile.name.trim() || 'User';
  const profileInitial = profileName.charAt(0).toUpperCase();

  const handleMouseEnter = () => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    collapseTimer.current = window.setTimeout(() => {
      setIsExpanded(false);
    }, 300);
  };

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsMobileOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavClick(id);
    }
  };

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  // Close mobile sidebar on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn btn-icon btn-ghost"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open menu"
        style={{ position: 'fixed', top: 16, left: 12, zIndex: 95 }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside
        className={`sidebar ${isExpanded ? 'expanded' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">P</div>
          <div className="sidebar-brand">
            <div className="sidebar-brand-name">PaiseAura</div>
            <div className="sidebar-brand-tagline">Personal finance</div>
          </div>
          {/* Mobile close button */}
          <button
            className="btn-icon btn-ghost"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
            style={{ display: isMobileOpen ? 'flex' : 'none', marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                data-tooltip={item.label}
                tabIndex={0}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <span className="nav-icon">
                  <Icon size={20} />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-profile-btn"
            onClick={() => handleNavClick('settings')}
            title="Profile & Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: activeView === 'settings' ? 'var(--color-soft-green)' : 'transparent',
              cursor: 'pointer',
              border: 'none',
              textAlign: 'left',
              transition: 'all var(--transition-fast)'
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-primary-action)',
              color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, flexShrink: 0
            }}>{profileInitial}</div>
            <div className="sidebar-brand" style={{ opacity: isExpanded || isMobileOpen ? 1 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{profileName}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Personal Account</div>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}

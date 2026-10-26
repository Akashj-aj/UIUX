import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TransactionModal from './components/TransactionModal';
import { ToastProvider, useToast } from './components/ToastProvider';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import CategoriesPage from './pages/CategoriesPage';
import RecurringPage from './pages/RecurringPage';
import SavingsPage from './pages/SavingsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import {
  seedSampleData, addTransaction, updateTransaction,
  getSettings, formatCurrency
} from './services/dataService';
import type { Transaction, TransactionType, PaymentMethod, ThemeMode, DateRange } from './types';

function MainApp() {
  const { addToast } = useToast();
  const [activeView, setActiveView] = useState<string>(() => {
    return sessionStorage.getItem('paiseaura_active_view') || 'overview';
  });
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [dashboardPeriod, setDashboardPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [dashboardRange, setDashboardRange] = useState<DateRange | null>(null);

  // Initialize sample data on first load
  useEffect(() => {
    seedSampleData();
    const settings = getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('paiseaura_active_view', activeView);
  }, [activeView]);

  // Scroll to top on navigation change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleThemeToggle = (theme: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', theme);
    triggerRefresh();
  };

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleOpenTransactions = (search = '') => {
    setSearchQuery(search);
    setActiveView('transactions');
  };

  const handleSaveTransaction = (data: {
    type: TransactionType;
    amount: number;
    title: string;
    categoryId: string;
    date: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): boolean => {
    if (editingTransaction) {
      const updated = updateTransaction(editingTransaction.id, data);
      if (!updated) {
        addToast('Unable to update the transaction', 'error', 0);
        return false;
      }
      addToast(`Updated "${data.title}"`, 'success');
    } else {
      const added = addTransaction(data);
      if (!added) {
        addToast('Unable to save the transaction', 'error', 0);
        return false;
      }
      addToast(
        `${data.type === 'income' ? 'Income' : 'Expense'} added: ${data.title} (${formatCurrency(data.amount)})`,
        'success'
      );
    }
    triggerRefresh();
    return true;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && activeView !== 'transactions') {
      setActiveView('transactions');
    }
  };

  // View headings
  const getViewMeta = () => {
    switch (activeView) {
      case 'transactions':
        return { title: 'Transactions', subtitle: 'Manage, filter and review income and expenditures' };
      case 'budgets':
        return { title: 'Monthly Budgets', subtitle: 'Category spending caps and threshold alerts' };
      case 'categories':
        return { title: 'Categories', subtitle: 'Expense and income classification and tags' };
      case 'recurring':
        return { title: 'Recurring Payments', subtitle: 'Track bills, subscriptions, and renewal dates' };
      case 'savings':
        return { title: 'Savings Goals', subtitle: 'Milestones, deposits, and emergency reserves' };
      case 'reports':
        return { title: 'Analytics & Reports', subtitle: 'Cash flow patterns, trends, and statements' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Profile, preferences, backups, and display' };
      case 'overview':
      default:
        return { title: 'Dashboard', subtitle: 'Overview & spending habits' };
    }
  };

  const meta = getViewMeta();

  return (
    <div className="app-layout">
      {/* Collapsible / Expanding Sidebar */}
      <Sidebar activeView={activeView} onNavigate={setActiveView} refreshKey={refreshKey} />

      {/* Main Content Area */}
      <div className="app-main">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onAddTransaction={handleOpenAdd}
          onSearch={handleSearch}
          onNavigate={setActiveView}
          searchQuery={searchQuery}
          refreshKey={refreshKey}
          selectedMonth={dashboardPeriod.month}
          selectedYear={dashboardPeriod.year}
          dateRange={dashboardRange}
          onMonthChange={(month, year) => {
            setDashboardPeriod({ month, year });
            setDashboardRange(null);
          }}
          onDateRangeChange={setDashboardRange}
        />

        <main className="app-content">
          {activeView === 'overview' && (
            <Dashboard
              onNavigate={setActiveView}
              onEditTransaction={handleEditTransaction}
              onOpenTransactions={handleOpenTransactions}
              refreshKey={refreshKey}
              selectedMonth={dashboardPeriod.month}
              selectedYear={dashboardPeriod.year}
              dateRange={dashboardRange}
            />
          )}
          {activeView === 'transactions' && (
            <TransactionsPage
              onEditTransaction={handleEditTransaction}
              onAddTransaction={handleOpenAdd}
              refreshKey={refreshKey}
              onRefresh={triggerRefresh}
              searchQuery={searchQuery}
            />
          )}
          {activeView === 'budgets' && (
            <BudgetsPage refreshKey={refreshKey} onRefresh={triggerRefresh} />
          )}
          {activeView === 'categories' && (
            <CategoriesPage
              refreshKey={refreshKey}
              onRefresh={triggerRefresh}
            />
          )}
          {activeView === 'recurring' && (
            <RecurringPage refreshKey={refreshKey} onRefresh={triggerRefresh} />
          )}
          {activeView === 'savings' && (
            <SavingsPage refreshKey={refreshKey} onRefresh={triggerRefresh} />
          )}
          {activeView === 'reports' && (
            <ReportsPage refreshKey={refreshKey} />
          )}
          {activeView === 'settings' && (
            <SettingsPage onRefresh={triggerRefresh} onThemeToggle={handleThemeToggle} />
          )}
        </main>
      </div>

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        editTransaction={editingTransaction}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

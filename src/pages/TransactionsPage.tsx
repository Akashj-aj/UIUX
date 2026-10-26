import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, Download, ArrowUpDown } from 'lucide-react';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  deleteTransaction, undoDeleteTransaction,
  getCategoryById, getCategories, getCategoriesByType, formatCurrency, formatDate,
  getPaymentMethodLabel, exportTransactionsCSV, downloadCSV,
  filterTransactions
} from '../services/dataService';
import type { Transaction, TransactionFilters } from '../types';
import { useToast } from '../components/ToastProvider';

interface TransactionsPageProps {
  onEditTransaction: (tx: Transaction) => void;
  onAddTransaction: () => void;
  refreshKey: number;
  onRefresh: () => void;
  searchQuery: string;
}

export default function TransactionsPage({ onEditTransaction, onAddTransaction, refreshKey, onRefresh, searchQuery }: TransactionsPageProps) {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<TransactionFilters>({
    search: searchQuery,
    type: 'all',
    categoryId: 'all',
    paymentMethod: 'all',
    dateRange: null,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sync search from header
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  }, [searchQuery]);

  const transactions = useMemo(() => {
    const f = { ...filters };
    if (dateFrom || dateTo) {
      f.dateRange = { start: dateFrom || dateTo, end: dateTo || dateFrom };
    } else {
      f.dateRange = null;
    }
    return filterTransactions(f);
  }, [filters, dateFrom, dateTo, refreshKey]);

  const categories = useMemo(
    () => filters.type === 'all' ? getCategories() : getCategoriesByType(filters.type),
    [filters.type, refreshKey]
  );
  const paymentMethods = filters.type === 'income'
    ? ['cash', 'upi', 'net_banking', 'wallet', 'other']
    : ['cash', 'upi', 'credit_card', 'debit_card', 'net_banking', 'wallet', 'other'];

  useEffect(() => {
    setFilters(prev => {
      const categoryIsAvailable = prev.categoryId === 'all'
        || categories.some(category => category.id === prev.categoryId);
      const paymentMethodIsAvailable = prev.paymentMethod === 'all'
        || paymentMethods.includes(prev.paymentMethod);

      if (categoryIsAvailable && paymentMethodIsAvailable) return prev;

      return {
        ...prev,
        categoryId: categoryIsAvailable ? prev.categoryId : 'all',
        paymentMethod: paymentMethodIsAvailable ? prev.paymentMethod : 'all',
      };
    });
  }, [categories, paymentMethods]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    const deleted = deleteTransaction(deleteTarget.id);
    setDeleteTarget(null);
    if (deleted) {
      onRefresh();
      addToast('Transaction deleted', 'success', 5000, {
        label: 'Undo',
        onClick: () => {
          const restored = undoDeleteTransaction();
          if (restored) {
            onRefresh();
            addToast('Transaction restored', 'success');
          }
        }
      });
    }
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      addToast('No transactions to export', 'warning');
      return;
    }
    const csv = exportTransactionsCSV(transactions);
    downloadCSV(csv, `paiseaura_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    addToast('CSV exported successfully', 'success');
  };

  const toggleSort = (field: 'date' | 'amount') => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      search: '',
      type: 'all',
      categoryId: 'all',
      paymentMethod: 'all',
      dateRange: null,
    }));
    setDateFrom('');
    setDateTo('');
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="heading-page">Transactions</h1>
          <p className="text-secondary">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={onAddTransaction}>
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: 'var(--space-xl)' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="text-mono" style={{ marginBottom: 4 }}>TOTAL INCOME</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totalIncome)}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="text-mono" style={{ marginBottom: 4 }}>TOTAL EXPENSES</div>
            <div style={{ fontWeight: 600, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="text-mono" style={{ marginBottom: 4 }}>NET</div>
            <div style={{
              fontWeight: 600, fontSize: 18, fontVariantNumeric: 'tabular-nums',
              color: totalIncome - totalExpenses >= 0 ? 'var(--color-success)' : 'var(--color-error)'
            }}>
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: '1', minWidth: 200, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="filter-input"
            style={{ width: '100%', paddingLeft: 32 }}
            placeholder="Search..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <select
          className="filter-select"
          value={filters.type}
          onChange={e => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select
          className="filter-select"
          value={filters.categoryId}
          onChange={e => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filters.paymentMethod}
          onChange={e => setFilters(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
        >
          <option value="all">All Methods</option>
          {paymentMethods.map(method => (
            <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
          ))}
        </select>
        <input
          type="date"
          className="filter-input"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <span className="text-muted">to</span>
        <input
          type="date"
          className="filter-input"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          aria-label="To date"
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearFilters}
          disabled={!filters.search && filters.type === 'all' && filters.categoryId === 'all' && filters.paymentMethod === 'all' && !dateFrom && !dateTo}
        >
          Clear
        </button>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {transactions.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Category</th>
                  <th>
                    <button onClick={() => toggleSort('date')} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 500
                    }}>
                      Date <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th>Payment</th>
                  <th>
                    <button onClick={() => toggleSort('amount')} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 500
                    }}>
                      Amount <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="transaction-actions-cell" style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const cat = getCategoryById(tx.categoryId);
                  return (
                    <tr
                      key={tx.id}
                      className="transaction-row"
                      onClick={() => setSelectedTransaction(tx)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedTransaction(tx);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open details for ${tx.title}`}
                    >
                      <td>
                        <div className="tx-title-cell">
                          <div className={`tx-icon ${tx.type}`}>
                            <Icon name={cat?.icon || 'Circle'} size={16} />
                          </div>
                          <div className="tx-details">
                            <span className="tx-name">{tx.title}</span>
                            {tx.notes && <span className="tx-category" title={tx.notes}>{tx.notes.length > 30 ? tx.notes.substring(0, 30) + '...' : tx.notes}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{cat?.name || 'Unknown'}</span>
                      </td>
                      <td>
                        <span className="text-mono">{formatDate(tx.date, 'DD MMM YYYY')}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {getPaymentMethodLabel(tx.paymentMethod)}
                        </span>
                      </td>
                      <td>
                        <span className={`tx-amount ${tx.type}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="transaction-actions-cell">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn-icon btn-ghost btn-sm"
                            onClick={event => {
                              event.stopPropagation();
                              onEditTransaction(tx);
                            }}
                            aria-label={`Edit ${tx.title}`}
                            title="Edit transaction"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost btn-sm"
                            onClick={event => {
                              event.stopPropagation();
                              setDeleteTarget(tx);
                            }}
                            aria-label={`Delete ${tx.title}`}
                            title="Delete transaction"
                            style={{ color: 'var(--color-error)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Filter size={24} />
            </div>
            <div className="empty-state-title">No transactions found</div>
            <div className="empty-state-text">
              {filters.search || filters.type !== 'all' || filters.categoryId !== 'all'
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Start tracking your finances by adding your first transaction.'}
            </div>
            {!filters.search && filters.type === 'all' && (
              <button className="btn btn-primary" onClick={onAddTransaction}>
                <Plus size={16} /> Add Your First Transaction
              </button>
            )}
          </div>
        )}
      </div>

      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div
            className="modal"
            onClick={event => event.stopPropagation()}
            style={{ maxWidth: 480 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-details-title"
          >
            <div className="modal-header">
              <h2 className="modal-title" id="transaction-details-title">Transaction Details</h2>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setSelectedTransaction(null)}
                aria-label="Close transaction details"
                title="Cancel"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {(() => {
                const category = getCategoryById(selectedTransaction.categoryId);
                return (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                      <div className="text-mono">TITLE</div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedTransaction.title}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <div className="text-mono">TYPE</div>
                        <div>{selectedTransaction.type === 'income' ? 'Income' : 'Expense'}</div>
                      </div>
                      <div>
                        <div className="text-mono">AMOUNT</div>
                        <div className={`tx-amount ${selectedTransaction.type}`}>
                          {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-mono">CATEGORY</div>
                        <div>{category?.name || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-mono">DATE</div>
                        <div>{formatDate(selectedTransaction.date, 'DD MMM YYYY')}</div>
                      </div>
                      <div>
                        <div className="text-mono">PAYMENT METHOD</div>
                        <div>{getPaymentMethodLabel(selectedTransaction.paymentMethod)}</div>
                      </div>
                    </div>
                    {selectedTransaction.notes && (
                      <div>
                        <div className="text-mono">NOTES</div>
                        <div>{selectedTransaction.notes}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTransaction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  setDeleteTarget(selectedTransaction);
                  setSelectedTransaction(null);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onEditTransaction(selectedTransaction);
                  setSelectedTransaction(null);
                }}
              >
                <Edit2 size={14} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action can be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

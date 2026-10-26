import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getCategories, addCategory, updateCategory, deleteCategory,
  getTransactions, formatCurrency, formatDate, getPaymentMethodLabel
} from '../services/dataService';
import type { Category, Transaction, TransactionType } from '../types';
import { useToast } from '../components/ToastProvider';

interface CategoriesPageProps {
  refreshKey: number;
  onRefresh: () => void;
}

const AVAILABLE_ICONS = [
  'Utensils', 'Car', 'ShoppingBag', 'Home', 'Zap', 'Heart',
  'GraduationCap', 'Tv', 'Plane', 'CreditCard', 'Sparkles',
  'Coffee', 'Smartphone', 'Gift', 'Briefcase', 'Laptop',
  'Building2', 'TrendingUp', 'PiggyBank', 'DollarSign', 'Folder'
];

function CategoryTransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '12px 0',
      borderBottom: '1px solid var(--color-border)'
    }}>
      <div>
        <div style={{ fontWeight: 600 }}>{transaction.title}</div>
        <div className="text-secondary" style={{ fontSize: 12 }}>
          {formatDate(transaction.date, 'DD MMM YYYY')} · {getPaymentMethodLabel(transaction.paymentMethod)}
        </div>
        {transaction.notes && <div className="text-secondary" style={{ fontSize: 12 }}>{transaction.notes}</div>}
      </div>
      <div className={`tx-amount ${transaction.type}`}>
        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
      </div>
    </div>
  );
}

export default function CategoriesPage({ refreshKey, onRefresh }: CategoriesPageProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const categories = useMemo(() => getCategories(), [refreshKey]);
  const transactions = useMemo(() => getTransactions(), [refreshKey]);

  // Compute usage statistics for each category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; totalPaise: number }> = {};
    categories.forEach(c => {
      stats[c.id] = { count: 0, totalPaise: 0 };
    });
    transactions.forEach(t => {
      if (stats[t.categoryId]) {
        stats[t.categoryId].count += 1;
        stats[t.categoryId].totalPaise += t.amount;
      }
    });
    return stats;
  }, [categories, transactions]);

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setType(activeTab);
    setSelectedIcon('Tag');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setSelectedIcon(cat.icon);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter category name', 'error');
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: name.trim(),
        type,
        icon: selectedIcon,
      });
      addToast('Category updated', 'success');
    } else {
      addCategory({
        name: name.trim(),
        type,
        icon: selectedIcon,
      });
      addToast('Category created', 'success');
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      // Check if transactions exist for this category
      const count = categoryStats[deleteTarget.id]?.count || 0;
      if (count > 0) {
        addToast(`Cannot delete category with ${count} existing transactions`, 'error');
        setDeleteTarget(null);
        return;
      }

      deleteCategory(deleteTarget.id);
      addToast('Category deleted', 'info');
      setDeleteTarget(null);
      onRefresh();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Expense / Income Tabs */}
        <div style={{ display: 'flex', background: 'var(--color-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'expense' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('expense')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowDownRight size={14} /> Expense Categories ({categories.filter(c => c.type === 'expense').length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'income' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('income')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowUpRight size={14} /> Income Categories ({categories.filter(c => c.type === 'income').length})
          </button>
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          <span>New Category</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {filteredCategories.map(cat => {
          const stats = categoryStats[cat.id] || { count: 0, totalPaise: 0 };
          return (
            <div
              key={cat.id}
              className="card"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setSelectedCategory(cat)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedCategory(cat);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${cat.name} transactions`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    background: cat.type === 'expense' ? 'var(--color-soft-green)' : 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cat.type === 'expense' ? 'var(--color-primary-action)' : '#2563EB'
                  }}>
                    <Icon name={cat.icon} size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{cat.name}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {cat.type === 'expense' ? 'Expense' : 'Income'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn-icon btn-ghost" onClick={event => { event.stopPropagation(); openEditModal(cat); }} aria-label="Edit category">
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn-icon btn-ghost"
                    onClick={event => { event.stopPropagation(); setDeleteTarget(cat); }}
                    aria-label="Delete category"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)',
                fontSize: '13px',
                color: 'var(--color-text-secondary)'
              }}>
                <span>Transactions: <strong>{stats.count}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCategory && (
        <div className="modal-overlay" onClick={() => setSelectedCategory(null)}>
          <div
            className="modal"
            onClick={event => event.stopPropagation()}
            style={{ maxWidth: 620 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-transactions-title"
          >
            <div className="modal-header">
              <h2 className="modal-title" id="category-transactions-title">
                {selectedCategory.name} Transactions
              </h2>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setSelectedCategory(null)}
                aria-label="Close category transactions"
                title="Cancel"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {transactions
                .filter(transaction => transaction.categoryId === selectedCategory.id)
                .map(transaction => (
                  <CategoryTransactionRow key={transaction.id} transaction={transaction} />
                ))}
              {transactions.filter(transaction => transaction.categoryId === selectedCategory.id).length === 0 && (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="text-secondary">No transactions in this category.</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedCategory(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{editingCategory ? 'Edit Category' : 'Create Category'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Groceries, Gym, Dividends"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="catType"
                      value="expense"
                      checked={type === 'expense'}
                      onChange={() => setType('expense')}
                    />
                    Expense
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="catType"
                      value="income"
                      checked={type === 'income'}
                      onChange={() => setType('income')}
                    />
                    Income
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Choose Icon</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '8px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}>
                  {AVAILABLE_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      className={`btn-icon ${selectedIcon === iconName ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setSelectedIcon(iconName)}
                      style={{ width: '36px', height: '36px' }}
                      title={iconName}
                    >
                      <Icon name={iconName} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Category"
        message={`Are you sure you want to delete ${deleteTarget?.name}?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

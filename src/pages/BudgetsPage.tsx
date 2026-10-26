import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getBudgetsWithSpending, addBudget, updateBudget, deleteBudget,
  getCategories, formatCurrency, toRupees, toPaise, getMonthName
} from '../services/dataService';
import type { BudgetWithSpending, Category } from '../types';
import { useToast } from '../components/ToastProvider';

interface BudgetsPageProps {
  refreshKey: number;
  onRefresh: () => void;
}

export default function BudgetsPage({ refreshKey, onRefresh }: BudgetsPageProps) {
  const { addToast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpending | null>(null);
  const [categoryId, setCategoryId] = useState<string>('overall');
  const [amount, setAmount] = useState<string>('');
  const [warningThreshold, setWarningThreshold] = useState<number>(80);
  const [deleteTarget, setDeleteTarget] = useState<BudgetWithSpending | null>(null);

  const categories = useMemo(() => getCategories(), [refreshKey]);

  const budgets = useMemo(() => {
    return getBudgetsWithSpending(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, refreshKey]);

  const overallBudget = useMemo(() => {
    return budgets.find(b => b.categoryId === 'overall');
  }, [budgets]);

  const categoryBudgets = useMemo(() => {
    return budgets.filter(b => b.categoryId !== 'overall');
  }, [budgets]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const openAddModal = (catId: string = 'overall') => {
    setEditingBudget(null);
    setCategoryId(catId);
    setAmount('');
    setWarningThreshold(80);
    setIsModalOpen(true);
  };

  const openEditModal = (budget: BudgetWithSpending) => {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId);
    setAmount(toRupees(budget.amount).toString());
    setWarningThreshold(budget.warningThreshold || 80);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || !Number.isFinite(warningThreshold) || warningThreshold < 0 || warningThreshold > 100) {
      addToast('Please enter a valid budget amount', 'error');
      return;
    }

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        amount: toPaise(numAmount),
        warningThreshold,
      });
      addToast('Budget updated successfully', 'success');
    } else {
      // Check if budget for this category/month already exists
      const existing = budgets.find(b => b.categoryId === categoryId);
      if (existing) {
        updateBudget(existing.id, {
          amount: toPaise(numAmount),
          warningThreshold,
        });
        addToast('Budget updated successfully', 'success');
      } else {
        addBudget({
          categoryId,
          amount: toPaise(numAmount),
          month: selectedMonth,
          year: selectedYear,
          warningThreshold,
        });
        addToast('Budget created successfully', 'success');
      }
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteBudget(deleteTarget.id);
      addToast('Budget removed', 'info');
      setDeleteTarget(null);
      onRefresh();
    }
  };

  // Unbudgeted categories available to add
  const budgetedCatIds = new Set(categoryBudgets.map(b => b.categoryId));
  const unbudgetedCategories = categories.filter(c => c.type === 'expense' && !budgetedCatIds.has(c.id));

  return (
    <div className="animate-fade-in">
      {/* Month Selector & Action Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            minWidth: '160px',
            textAlign: 'center',
            letterSpacing: '-0.01em'
          }}>
            {getMonthName(selectedMonth)} {selectedYear}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleNextMonth} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
          {(selectedMonth !== now.getMonth() || selectedYear !== now.getFullYear()) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
              style={{ fontSize: '12px' }}
            >
              Current Month
            </button>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => openAddModal()}>
          <Plus size={16} />
          <span>Set Budget</span>
        </button>
      </div>

      {/* Overall Budget Hero Card */}
      {overallBudget ? (
        <div className="card card-dark" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Overall Monthly Limit
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {formatCurrency(overallBudget.amount)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
                onClick={() => openEditModal(overallBudget)}
              >
                <Edit2 size={14} /> Edit Limit
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'rgba(255,255,255,0.85)' }}>
              <span>Spent: <strong>{formatCurrency(overallBudget.spent)}</strong></span>
              <span>
                {overallBudget.remaining > 0 ? (
                  `Remaining: ${formatCurrency(overallBudget.remaining)}`
                ) : (
                  <span style={{ color: '#F87171', fontWeight: 600 }}>
                    Exceeded by {formatCurrency(Math.abs(overallBudget.amount - overallBudget.spent))}
                  </span>
                )}
              </span>
            </div>
            <div className="progress-bar-container" style={{ background: 'rgba(255,255,255,0.15)', height: '10px' }}>
              <div
                className={`progress-bar-fill ${overallBudget.status}`}
                style={{
                  width: `${Math.min(overallBudget.percentage, 100)}%`,
                  background: overallBudget.status === 'exceeded' ? '#EF4444' : overallBudget.status === 'warning' ? '#F59E0B' : '#34D399',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            <div>Used: <strong style={{ color: '#fff' }}>{overallBudget.percentage}%</strong></div>
            <div>Alert at: <strong style={{ color: '#fff' }}>{overallBudget.warningThreshold}%</strong></div>
            {overallBudget.status === 'exceeded' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F87171' }}>
                <AlertTriangle size={14} /> Exceeded monthly limit!
              </div>
            )}
            {overallBudget.status === 'normal' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34D399' }}>
                <CheckCircle size={14} /> Within safe spending range
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '24px', padding: '24px', textAlign: 'center', background: 'var(--color-surface-hover)' }}>
          <PieChart size={32} style={{ color: 'var(--color-primary-action)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No overall budget set for {getMonthName(selectedMonth)}</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Setting an overall monthly limit gives you a clear target to stay disciplined and save more.
          </p>
          <button className="btn btn-primary" onClick={() => openAddModal('overall')}>
            <Plus size={16} /> Set Monthly Limit
          </button>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Category Budgets</h2>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {categoryBudgets.length} active budgets
        </span>
      </div>

      {categoryBudgets.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {categoryBudgets.map(budget => (
            <div key={budget.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '8px',
                    background: 'var(--color-soft-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-action)'
                  }}>
                    <Icon name={budget.categoryIcon || 'Folder'} size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{budget.categoryName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Budget: {formatCurrency(budget.amount)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn-icon btn-ghost" onClick={() => openEditModal(budget)} aria-label="Edit budget">
                    <Edit2 size={14} />
                  </button>
                  <button className="btn-icon btn-ghost" onClick={() => setDeleteTarget(budget)} aria-label="Delete budget" style={{ color: 'var(--color-error)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress & Stats */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>Spent: <strong>{formatCurrency(budget.spent)}</strong></span>
                  <span style={{
                    fontWeight: 600,
                    color: budget.status === 'exceeded' ? 'var(--color-error)' : budget.status === 'warning' ? 'var(--color-warning)' : 'var(--color-text-secondary)'
                  }}>
                    {budget.percentage}%
                  </span>
                </div>
                <div className="progress-bar-container" style={{ height: '8px' }}>
                  <div
                    className={`progress-bar-fill ${budget.status}`}
                    style={{
                      width: `${Math.min(budget.percentage, 100)}%`,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <span>
                  {budget.remaining > 0
                    ? `${formatCurrency(budget.remaining)} remaining`
                    : `Overspent by ${formatCurrency(Math.abs(budget.amount - budget.spent))}`
                  }
                </span>
                <span className={`status-pill ${budget.status}`}>
                  {budget.status === 'exceeded' ? 'Exceeded' : budget.status === 'warning' ? 'Warning' : 'On Track'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '36px', textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            No category budgets configured for this month.
          </p>
          <button className="btn btn-secondary" onClick={() => openAddModal()}>
            <Plus size={16} /> Create Category Budget
          </button>
        </div>
      )}

      {/* Quick Add Unbudgeted Categories */}
      {unbudgetedCategories.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Quick Add Unbudgeted Categories</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unbudgetedCategories.map((cat: Category) => (
              <button
                key={cat.id}
                className="btn btn-ghost btn-sm"
                onClick={() => openAddModal(cat.id)}
                style={{ border: '1px dashed var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon name={cat.icon} size={14} />
                <span>+ {cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{editingBudget ? 'Edit Budget' : 'Set Budget'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  disabled={!!editingBudget}
                >
                  <option value="overall">Overall Monthly Budget</option>
                  <optgroup label="Expense Categories">
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Limit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Warning Threshold: {warningThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  className="form-range"
                  value={warningThreshold}
                  onChange={e => setWarningThreshold(parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  <span>50%</span>
                  <span>Notify when budget reaches this level</span>
                  <span>95%</span>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBudget ? 'Save Changes' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Budget"
        message={`Are you sure you want to remove the budget for ${deleteTarget?.categoryName}? Your transactions won't be deleted.`}
        confirmLabel="Delete Budget"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

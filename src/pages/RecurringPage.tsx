import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Calendar, CheckCircle, AlertCircle, RotateCcw, Clock } from 'lucide-react';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getRecurringPayments, addRecurringPayment, updateRecurringPayment, deleteRecurringPayment,
  addTransaction, getCategoriesByType, getCategoryById, formatCurrency, toRupees, toPaise,
  formatDate, getPaymentMethodLabel, advanceRecurringDate
} from '../services/dataService';
import type { RecurringPayment, RecurrenceFrequency, PaymentMethod } from '../types';
import { useToast } from '../components/ToastProvider';

interface RecurringPageProps {
  refreshKey: number;
  onRefresh: () => void;
}

export default function RecurringPage({ refreshKey, onRefresh }: RecurringPageProps) {
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringPayment | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [deleteTarget, setDeleteTarget] = useState<RecurringPayment | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<RecurringPayment | null>(null);

  const recurringList = useMemo(() => getRecurringPayments(), [refreshKey]);
  const expenseCategories = useMemo(() => getCategoriesByType('expense'), [refreshKey]);

  // Compute stats
  const { monthlyTotal, yearlyTotal, overdueCount, upcomingCount } = useMemo(() => {
    let monthly = 0;
    let yearly = 0;
    let overdue = 0;
    let upcoming = 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    recurringList.forEach(r => {
      if (!r.isActive) return;

      if (r.frequency === 'monthly') {
        monthly += r.amount;
        yearly += r.amount * 12;
      } else if (r.frequency === 'weekly') {
        monthly += r.amount * 4.33;
        yearly += r.amount * 52;
      } else if (r.frequency === 'yearly') {
        monthly += r.amount / 12;
        yearly += r.amount;
      }

      const due = new Date(r.nextDueDate);
      due.setHours(0, 0, 0, 0);
      if (due < now) {
        overdue += 1;
      } else if (due <= in7Days) {
        upcoming += 1;
      }
    });

    return {
      monthlyTotal: Math.round(monthly),
      yearlyTotal: Math.round(yearly),
      overdueCount: overdue,
      upcomingCount: upcoming
    };
  }, [recurringList]);

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setAmount('');
    setCategoryId(expenseCategories[0]?.id || '');
    setFrequency('monthly');
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('upi');
    setIsModalOpen(true);
  };

  const openEditModal = (item: RecurringPayment) => {
    setEditingItem(item);
    setTitle(item.title);
    setAmount(toRupees(item.amount).toString());
    setCategoryId(item.categoryId);
    setFrequency(item.frequency);
    setNextDueDate(item.nextDueDate.split('T')[0]);
    setPaymentMethod(item.paymentMethod);
    setIsModalOpen(true);
  };

  const handleToggleActive = (item: RecurringPayment) => {
    updateRecurringPayment(item.id, { isActive: !item.isActive });
    addToast(`${item.title} ${!item.isActive ? 'activated' : 'paused'}`, 'info');
    onRefresh();
  };

  // Mark Paid advances the due date by frequency & registers transaction
  const handleMarkPaid = (item: RecurringPayment) => {
    // Record actual transaction
    addTransaction({
      type: item.type,
      amount: item.amount,
      title: `${item.title} (Auto-Paid)`,
      categoryId: item.categoryId,
      date: new Date().toISOString(),
      paymentMethod: item.paymentMethod,
      notes: `Recurring payment marked as paid`,
      recurringPaymentId: item.id,
      recurringPaymentDueDate: item.nextDueDate
    });

    // Advance next due date
    const nextDue = advanceRecurringDate(new Date(item.nextDueDate), item.frequency);

    updateRecurringPayment(item.id, {
      nextDueDate: nextDue.toISOString()
    });

    addToast(`Recorded payment of ${formatCurrency(item.amount)} for ${item.title}`, 'success');
    onRefresh();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || !categoryId || !nextDueDate || !Number.isFinite(numAmount) || numAmount <= 0 || Number.isNaN(new Date(nextDueDate).getTime())) {
      addToast('Please provide valid details', 'error');
      return;
    }

    if (editingItem) {
      updateRecurringPayment(editingItem.id, {
        title: title.trim(),
        amount: toPaise(numAmount),
        categoryId,
        frequency,
        nextDueDate: new Date(nextDueDate).toISOString(),
        paymentMethod
      });
      addToast('Recurring bill updated', 'success');
    } else {
      addRecurringPayment({
        title: title.trim(),
        amount: toPaise(numAmount),
        type: 'expense',
        categoryId,
        frequency,
        nextDueDate: new Date(nextDueDate).toISOString(),
        paymentMethod,
        isActive: true
      });
      addToast('Recurring bill added', 'success');
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteRecurringPayment(deleteTarget.id);
      addToast('Recurring payment deleted', 'info');
      setDeleteTarget(null);
      onRefresh();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Metric Cards Banner */}
      <div className="summary-cards" style={{ marginBottom: '24px' }}>
        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <RotateCcw size={20} />
            </div>
          </div>
          <div className="summary-card-label">Monthly Recurring Burn</div>
          <div className="summary-card-amount">{formatCurrency(monthlyTotal)}</div>
          <div className="summary-card-change" style={{ color: 'var(--color-text-muted)' }}>
            Estimated ₹{(toRupees(monthlyTotal)).toLocaleString('en-IN')}/mo
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <Calendar size={20} />
            </div>
          </div>
          <div className="summary-card-label">Annual Subscription Cost</div>
          <div className="summary-card-amount">{formatCurrency(yearlyTotal)}</div>
          <div className="summary-card-change" style={{ color: 'var(--color-text-muted)' }}>
            Per year total commitment
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <Clock size={20} />
            </div>
          </div>
          <div className="summary-card-label">Upcoming (7 Days)</div>
          <div className="summary-card-amount">{upcomingCount} bills</div>
          <div className="summary-card-change" style={{ color: overdueCount > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
            {overdueCount > 0 ? `${overdueCount} overdue bills` : 'All bills up to date'}
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Subscriptions & Recurring Bills</h2>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Track recurring Netflix, Spotify, gym, rent, WiFi & utility charges
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          <span>Add Recurring Bill</span>
        </button>
      </div>

      {/* List of Recurring Payments */}
      {recurringList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recurringList.map(item => {
            const cat = getCategoryById(item.categoryId);
            const dueDate = new Date(item.nextDueDate);
            dueDate.setHours(0, 0, 0, 0);
            const isOverdue = dueDate < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <div
                key={item.id}
                className="card recurring-payment-row"
                style={{ opacity: item.isActive ? 1 : 0.6 }}
              >
                <div className="recurring-payment-info">
                  <div className="recurring-payment-icon">
                    <Icon name={cat?.icon || 'RotateCcw'} size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {cat?.name || 'General'} • {getPaymentMethodLabel(item.paymentMethod)} • <span style={{ textTransform: 'capitalize' }}>{item.frequency}</span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="recurring-payment-amount">
                  <div style={{ fontSize: '16px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(item.amount)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    color: isOverdue ? 'var(--color-error)' : 'var(--color-text-secondary)',
                    fontWeight: isOverdue ? 600 : 400
                  }}>
                    {isOverdue && <AlertCircle size={12} />}
                    Due: {formatDate(item.nextDueDate)}
                  </div>
                </div>

                {/* Actions */}
                <div className="recurring-payment-actions">
                  {item.isActive && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setMarkPaidTarget(item)}
                      title="Mark as paid and advance due date"
                    >
                      <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                      <span>Mark Paid</span>
                    </button>
                  )}
                  <button
                    className={`btn btn-sm ${item.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                    onClick={() => handleToggleActive(item)}
                  >
                    {item.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button className="btn-icon btn-ghost" onClick={() => openEditModal(item)} aria-label="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn-icon btn-ghost"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Delete"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <RotateCcw size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>No recurring bills or subscriptions configured yet.</p>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Subscription
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Recurring Bill' : 'New Recurring Bill'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Subscription / Bill Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Netflix, Gym, Jio Fiber, House Rent"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 649"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  required
                >
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="upi">UPI</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="net_banking">Net Banking</option>
                    <option value="wallet">Wallet</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Next Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={nextDueDate}
                  onChange={e => setNextDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Save Recurring Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!markPaidTarget}
        title="Mark Payment as Paid"
        message={`Record "${markPaidTarget?.title}" as paid and move its next due date forward?`}
        confirmLabel="Mark Paid"
        variant="warning"
        onConfirm={() => {
          if (markPaidTarget) handleMarkPaid(markPaidTarget);
          setMarkPaidTarget(null);
        }}
        onCancel={() => setMarkPaidTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Recurring Bill"
        message={`Are you sure you want to delete ${deleteTarget?.title}?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

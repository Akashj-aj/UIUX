import { useState, useMemo } from 'react';
import { Plus, Target, PiggyBank, Edit2, Trash2, Calendar, TrendingUp, AlertCircle, MoreVertical } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
  addContribution, updateContribution, deleteContribution, getTotalBalance, formatCurrency, toRupees, toPaise, formatDate
} from '../services/dataService';
import type { SavingsContribution, SavingsGoal } from '../types';
import { useToast } from '../components/ToastProvider';

interface SavingsPageProps {
  refreshKey: number;
  onRefresh: () => void;
}

export default function SavingsPage({ refreshKey, onRefresh }: SavingsPageProps) {
  const { addToast } = useToast();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [editingContribution, setEditingContribution] = useState<SavingsContribution | null>(null);
  const [openDepositMenuId, setOpenDepositMenuId] = useState<string | null>(null);
  const [deleteContributionTarget, setDeleteContributionTarget] = useState<{ goal: SavingsGoal; contribution: SavingsContribution } | null>(null);

  // Goal form
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialSaved, setInitialSaved] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Deposit form
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNote, setDepositNote] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [detailsGoal, setDetailsGoal] = useState<SavingsGoal | null>(null);

  const goals = useMemo(() => getSavingsGoals(), [refreshKey]);

  // Overall statistics
  const { totalTarget, totalSaved, overallPercentage, availableToSpend } = useMemo(() => {
    const target = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const saved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
    const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
    return {
      totalTarget: target,
      totalSaved: saved,
      overallPercentage: pct,
      availableToSpend: Math.max(0, getTotalBalance() - saved),
    };
  }, [goals]);

  const openAddModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setInitialSaved('0');
    setTargetDate('');
    setIsGoalModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(toRupees(goal.targetAmount).toString());
    setInitialSaved(toRupees(goal.savedAmount).toString());
    setTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
    setIsGoalModalOpen(true);
  };

  const openDepositModal = (goal: SavingsGoal) => {
    setDepositGoal(goal);
    setEditingContribution(null);
    setDepositAmount('');
    setDepositDate(new Date().toISOString().split('T')[0]);
    setDepositNote('');
    setIsDepositModalOpen(true);
  };

  const openEditDepositModal = (goal: SavingsGoal, contribution: SavingsContribution) => {
    setDepositGoal(goal);
    setEditingContribution(contribution);
    setDepositAmount(toRupees(contribution.amount).toString());
    setDepositDate(contribution.date.split('T')[0]);
    setDepositNote(contribution.note || '');
    setOpenDepositMenuId(null);
    setIsDepositModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(targetAmount);
    const savedNum = parseFloat(initialSaved || '0');

    if (!title.trim() || !Number.isFinite(targetNum) || targetNum <= 0 || !Number.isFinite(savedNum) || savedNum < 0) {
      addToast('Please enter a valid goal title and target amount', 'error');
      return;
    }
    if (!editingGoal && toPaise(savedNum) > availableToSpend) {
      addToast(`Starting amount cannot exceed available funds of ${formatCurrency(availableToSpend)}`, 'error');
      return;
    }

    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, {
        title: title.trim(),
        targetAmount: toPaise(targetNum),
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
      addToast('Savings goal updated', 'success');
    } else {
      addSavingsGoal({
        title: title.trim(),
        targetAmount: toPaise(targetNum),
        savedAmount: toPaise(savedNum),
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
      addToast('New savings goal created', 'success');
    }

    setIsGoalModalOpen(false);
    onRefresh();
  };

  const handleAddDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (!depositGoal || !Number.isFinite(amountNum) || amountNum <= 0) {
      addToast('Please enter a valid deposit amount', 'error');
      return;
    }

    const amountPaise = toPaise(amountNum);
    const availableForDeposit = availableToSpend + (editingContribution?.amount || 0);
    if (amountPaise > availableForDeposit) {
      addToast(`Deposit cannot exceed available funds of ${formatCurrency(availableToSpend)}`, 'error');
      return;
    }

    const date = new Date(`${depositDate}T00:00:00`).toISOString();
    let updatedGoal: SavingsGoal | null;
    if (editingContribution) {
      updatedGoal = updateContribution(depositGoal.id, editingContribution.id, {
        amount: amountPaise,
        date,
        note: depositNote.trim() || undefined,
      });
    } else {
      updatedGoal = addContribution(depositGoal.id, amountPaise, depositNote.trim() || undefined, date);
    }
    if (!updatedGoal) {
      addToast('Unable to save deposit', 'error');
      return;
    }
    if (detailsGoal?.id === updatedGoal.id) setDetailsGoal(updatedGoal);
    addToast(`Added ${formatCurrency(amountPaise)} towards ${depositGoal.title}`, 'success');
    setIsDepositModalOpen(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteSavingsGoal(deleteTarget.id);
      addToast('Savings goal deleted', 'info');
      setDeleteTarget(null);
      onRefresh();
    }
  };

  const handleDeleteContribution = () => {
    if (!deleteContributionTarget) return;
    const updatedGoal = deleteContribution(deleteContributionTarget.goal.id, deleteContributionTarget.contribution.id);
    setDeleteContributionTarget(null);
    if (updatedGoal) setDetailsGoal(updatedGoal);
    addToast('Deposit deleted', 'info');
    onRefresh();
  };

  return (
    <div className="animate-fade-in">
      {/* Overview Cards */}
      <div className="summary-cards" style={{ marginBottom: '24px' }}>
        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <PiggyBank size={20} />
            </div>
          </div>
          <div className="summary-card-label">Total Saved Towards Goals</div>
          <div className="summary-card-amount">{formatCurrency(totalSaved)}</div>
          <div className="summary-card-change positive">
            <TrendingUp size={14} /> Across {goals.length} active goals
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <PiggyBank size={20} />
            </div>
          </div>
          <div className="summary-card-label">Available to Spend</div>
          <div className="summary-card-amount">{formatCurrency(availableToSpend)}</div>
          <div className="summary-card-change" style={{ color: 'var(--color-text-secondary)' }}>
            After goal allocations
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <Target size={20} />
            </div>
          </div>
          <div className="summary-card-label">Total Target</div>
          <div className="summary-card-amount">{formatCurrency(totalTarget)}</div>
          <div className="summary-card-change" style={{ color: 'var(--color-text-secondary)' }}>
            Goal targets combined
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="summary-card-label">Overall Completion</div>
          <div className="summary-card-amount">{overallPercentage}%</div>
          <div className="summary-card-change" style={{ color: 'var(--color-primary-action)' }}>
            {formatCurrency(Math.max(0, totalTarget - totalSaved))} remaining
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
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Active Goals</h2>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Track progress and deposit funds toward life milestones
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {goals.map(goal => {
            const pct = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
            const isCompleted = goal.savedAmount >= goal.targetAmount;
            const targetDay = goal.targetDate ? new Date(goal.targetDate) : null;
            const daysUntilTarget = targetDay
              ? Math.ceil((targetDay.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
              : null;
            const targetStatus = daysUntilTarget !== null && !isCompleted
              ? daysUntilTarget < 0
                ? 'Target date passed'
                : daysUntilTarget <= 30
                  ? `Target date in ${daysUntilTarget} day${daysUntilTarget === 1 ? '' : 's'}`
                  : null
              : null;

            return (
              <div
                key={goal.id}
                className="card"
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                onClick={() => setDetailsGoal(goal)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDetailsGoal(goal);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${goal.title}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      background: isCompleted ? 'rgba(52, 211, 153, 0.15)' : 'var(--color-soft-green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted ? '#059669' : 'var(--color-primary-action)'
                    }}>
                      <Target size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{goal.title}</h3>
                      {goal.targetDate && (
                        <div style={{ fontSize: '12px', color: targetStatus === 'Target date passed' ? 'var(--color-error)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          {targetStatus === 'Target date passed' ? <AlertCircle size={12} /> : <Calendar size={12} />}
                          {targetStatus || `Target: ${formatDate(goal.targetDate)}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-icon btn-ghost" onClick={event => { event.stopPropagation(); openEditModal(goal); }} aria-label="Edit goal">
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-ghost"
                      onClick={event => { event.stopPropagation(); setDeleteTarget(goal); }}
                      aria-label="Delete goal"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Amount Progress */}
                <div style={{ marginBottom: '16px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(goal.savedAmount)}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      of {formatCurrency(goal.targetAmount)} ({pct}%)
                    </span>
                  </div>

                  <div className="progress-bar-container" style={{ height: '10px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: isCompleted ? '#059669' : 'var(--color-primary-action)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                  <span>
                    {isCompleted ? 'Goal Reached' : `${formatCurrency(remaining)} to go`}
                  </span>
                  <span>{goal.contributions?.length || 0} deposits</span>
                </div>

                {/* Add Deposit Button */}
                <button
                  className="btn btn-secondary"
                  onClick={event => { event.stopPropagation(); openDepositModal(goal); }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Plus size={16} /> Add Funds
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <PiggyBank size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            No savings goals set up yet. Dream big and start saving today!
          </p>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Create Goal
          </button>
        </div>
      )}

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGoalModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{editingGoal ? 'Edit Goal' : 'Create Savings Goal'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsGoalModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveGoal} className="modal-body">
              <div className="form-group">
                <label className="form-label">Goal Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Emergency Fund, Japan Trip, MacBook Pro"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 100000"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  required
                />
              </div>

              {!editingGoal && (
                <div className="form-group">
                  <label className="form-label">Starting Saved Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0"
                    value={initialSaved}
                    onChange={e => setInitialSaved(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Target Date (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsGoalModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailsGoal && (
        <div className="modal-overlay" onClick={() => setDetailsGoal(null)}>
          <div className="modal" onClick={event => event.stopPropagation()} style={{ maxWidth: '500px' }} role="dialog" aria-modal="true" aria-labelledby="savings-details-title">
            <div className="modal-header">
              <h2 className="modal-title" id="savings-details-title">{detailsGoal.title}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setDetailsGoal(null)} aria-label="Close goal details">✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const saved = detailsGoal.savedAmount;
                const remaining = Math.max(0, detailsGoal.targetAmount - saved);
                const pct = detailsGoal.targetAmount > 0 ? Math.round((saved / detailsGoal.targetAmount) * 100) : 0;
                return (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div><div className="text-mono">TARGET</div><strong>{formatCurrency(detailsGoal.targetAmount)}</strong></div>
                      <div><div className="text-mono">SAVED</div><strong>{formatCurrency(saved)}</strong></div>
                      <div><div className="text-mono">REMAINING</div><strong>{formatCurrency(remaining)}</strong></div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Progress</span><strong>{pct}%</strong>
                      </div>
                      <div className="progress-bar-container" style={{ height: '10px' }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="text-mono" style={{ marginBottom: '8px' }}>DEPOSIT HISTORY</div>
                      {detailsGoal.contributions?.length ? detailsGoal.contributions.slice().reverse().map(deposit => (
                        <div key={deposit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                          <span>{formatDate(deposit.date)}{deposit.note ? ` · ${deposit.note}` : ''}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>{formatCurrency(deposit.amount)}</strong>
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className="btn-icon btn-ghost btn-sm"
                                onClick={() => setOpenDepositMenuId(openDepositMenuId === deposit.id ? null : deposit.id)}
                                aria-label={`Actions for deposit on ${formatDate(deposit.date)}`}
                                title="Deposit actions"
                              >
                                <MoreVertical size={15} />
                              </button>
                              {openDepositMenuId === deposit.id && (
                                <div style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  zIndex: 2,
                                  minWidth: 100,
                                  padding: 4,
                                  background: 'var(--color-bg-card)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-md)',
                                  boxShadow: 'var(--shadow-lg)'
                                }}>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditDepositModal(detailsGoal, deposit)} style={{ width: '100%', justifyContent: 'flex-start' }}>
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDeleteContributionTarget({ goal: detailsGoal, contribution: deposit }); setOpenDepositMenuId(null); }} style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-error)' }}>
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) : <div className="text-secondary">No deposits recorded.</div>}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailsGoal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { openDepositModal(detailsGoal); setDetailsGoal(null); }}>
                <Plus size={14} /> Add Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {isDepositModalOpen && depositGoal && (
        <div className="modal-overlay" onClick={() => setIsDepositModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{editingContribution ? 'Edit Deposit' : `Deposit to ${depositGoal.title}`}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsDepositModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddDeposit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Deposit Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={depositDate}
                  onChange={e => setDepositDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Note (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Monthly transfer, bonus deposit"
                  value={depositNote}
                  onChange={e => setDepositNote(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDepositModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingContribution ? 'Save Changes' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete ${deleteTarget?.title}? All contribution records for this goal will be removed.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteContributionTarget}
        title="Delete Deposit"
        message={`Delete this deposit from ${deleteContributionTarget?.goal.title}? The saved amount will be restored to Available to Spend.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteContribution}
        onCancel={() => setDeleteContributionTarget(null)}
      />
    </div>
  );
}

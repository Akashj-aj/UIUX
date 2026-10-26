import { useState, useEffect, useRef, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Transaction, TransactionType, PaymentMethod } from '../types';
import {
  getCategoriesByType, toRupees, toPaise, getPaymentMethodLabel
} from '../services/dataService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    type: TransactionType;
    amount: number;
    title: string;
    categoryId: string;
    date: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => boolean | void;
  editTransaction?: Transaction | null;
}

const paymentMethods: PaymentMethod[] = ['cash', 'upi', 'credit_card', 'debit_card', 'net_banking', 'wallet', 'other'];

export default function TransactionModal({ isOpen, onClose, onSave, editTransaction }: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setAmount(toRupees(editTransaction.amount).toString());
      setTitle(editTransaction.title);
      setCategoryId(editTransaction.categoryId);
      setDate(editTransaction.date.split('T')[0]);
      setPaymentMethod(editTransaction.paymentMethod);
      setNotes(editTransaction.notes || '');
    } else {
      resetForm();
    }
  }, [editTransaction, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, onClose]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setTitle('');
    setCategoryId('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('upi');
    setNotes('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) newErrors.amount = 'Enter a valid amount';
    if (!categoryId) newErrors.categoryId = 'Select a category';
    if (!date || Number.isNaN(new Date(date).getTime())) newErrors.date = 'Select a valid date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSaving || !validate()) return;

    setIsSaving(true);
    try {
      const saved = onSave({
        type,
        amount: toPaise(parseFloat(amount)),
        title: title.trim(),
        categoryId,
        date: new Date(date).toISOString(),
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      if (saved === false) {
        setErrors({ form: 'The transaction could not be saved. Please try again.' });
        return;
      }
      resetForm();
      onClose();
    } catch {
      setErrors({ form: 'The transaction could not be saved. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const categories = getCategoriesByType(type);

  return (
    <div className="modal-overlay" onClick={() => !isSaving && onClose()}>
      <div ref={dialogRef} className="modal transaction-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editTransaction ? 'Edit Transaction' : 'Add Transaction'}>
        <div className="modal-header">
          <h2 className="modal-title">{editTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close" disabled={isSaving}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.form && <div className="form-error form-error-summary" role="alert">{errors.form}</div>}
            {/* Type Toggle */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setType('expense'); setCategoryId(''); }}
                  style={{ flex: 1 }}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setType('income'); setCategoryId(''); }}
                  style={{ flex: 1 }}
                >
                  Income
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-amount">Amount (₹)</label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                className={`form-input ${errors.amount ? 'error' : ''}`}
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
              />
              {errors.amount && <div className="form-error">{errors.amount}</div>}
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-title">Title</label>
              <input
                id="tx-title"
                type="text"
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder={type === 'expense' ? 'e.g., Swiggy Order' : 'e.g., Monthly Salary'}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>

            <div className="form-row">
              {/* Category */}
              <div className="form-group">
                <label className="form-label" htmlFor="tx-category">Category</label>
                <select
                  id="tx-category"
                  className={`form-select ${errors.categoryId ? 'error' : ''}`}
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <div className="form-error">{errors.categoryId}</div>}
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="tx-date">Date</label>
                <input
                  id="tx-date"
                  type="date"
                  className={`form-input ${errors.date ? 'error' : ''}`}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                {errors.date && <div className="form-error">{errors.date}</div>}
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-payment">Payment Method</label>
              <select
                id="tx-payment"
                className="form-select"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {paymentMethods.map(m => (
                  <option key={m} value={m}>{getPaymentMethodLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-notes">Notes (optional)</label>
              <textarea
                id="tx-notes"
                className="form-textarea"
                placeholder="Add a note..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : editTransaction ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

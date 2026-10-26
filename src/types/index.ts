// All monetary values stored as paise (integer) to avoid floating-point errors
// Display values are derived by dividing by 100

export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'cash' | 'upi' | 'credit_card' | 'debit_card' | 'net_banking' | 'wallet' | 'other';

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export type ThemeMode = 'light' | 'dark';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string; // Lucide icon name
  color?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // in paise
  title: string;
  categoryId: string;
  date: string; // ISO date string
  paymentMethod: PaymentMethod;
  notes?: string;
  recurringPaymentId?: string;
  recurringPaymentDueDate?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string | 'overall';
  amount: number; // in paise
  month: number; // 0-11
  year: number;
  warningThreshold: number; // 0-100 percentage, default 80
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithSpending extends Budget {
  spent: number; // in paise
  remaining: number; // in paise
  percentage: number; // 0-100+
  status: 'normal' | 'warning' | 'exceeded';
  categoryName?: string;
  categoryIcon?: string;
}

export interface RecurringPayment {
  id: string;
  title: string;
  amount: number; // in paise
  type: TransactionType;
  categoryId: string;
  frequency: RecurrenceFrequency;
  nextDueDate: string; // ISO date
  paymentMethod: PaymentMethod;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number; // in paise
  savedAmount: number; // in paise
  targetDate?: string; // ISO date
  contributions: SavingsContribution[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsContribution {
  id: string;
  amount: number; // in paise
  date: string; // ISO date
  note?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: string; // ISO date
  actionUrl?: string;
}

export interface Toast {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // ms
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AppSettings {
  currency: string; // default 'INR'
  currencySymbol: string; // default '₹'
  dateFormat: DateFormat;
  theme: ThemeMode;
  notificationsEnabled: boolean;
  budgetWarningThreshold: number; // default 80
  startingBalance: number; // in paise
}

export interface DateRange {
  start: string; // ISO date
  end: string; // ISO date
}

export interface TransactionFilters {
  search: string;
  type: TransactionType | 'all';
  categoryId: string | 'all';
  paymentMethod: PaymentMethod | 'all';
  dateRange: DateRange | null;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export interface MonthlyTotals {
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface DailySpending {
  date: string;
  amount: number;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expenses: number;
}

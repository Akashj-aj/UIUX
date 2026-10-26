import type {
  Transaction, Budget, RecurringPayment, SavingsGoal,
  AppNotification, AppSettings, UserProfile, Category,
  TransactionType, BudgetWithSpending, MonthlyTotals,
  CategorySpending, DailySpending, MonthlyComparison,
  TransactionFilters
} from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'paiseaura_transactions',
  BUDGETS: 'paiseaura_budgets',
  RECURRING: 'paiseaura_recurring',
  SAVINGS: 'paiseaura_savings',
  NOTIFICATIONS: 'paiseaura_notifications',
  SETTINGS: 'paiseaura_settings',
  PROFILE: 'paiseaura_profile',
  CATEGORIES: 'paiseaura_categories',
  INITIALIZED: 'paiseaura_initialized',
  DELETED_TRANSACTIONS: 'paiseaura_deleted_transactions',
};

// ==================== Utility Helpers ====================

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function toRupees(paise: number): number {
  return paise / 100;
}

export function formatCurrency(paise: number): string {
  const rupees = toRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatCurrencyShort(paise: number): string {
  const rupees = Math.abs(toRupees(paise));
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return formatCurrency(paise);
}

export function formatDate(dateStr: string, format: string = 'DD/MM/YYYY'): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (format) {
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'DD MMM YYYY': return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'MMM DD': return `${monthNames[d.getMonth()]} ${day}`;
    case 'DD MMM': return `${day} ${monthNames[d.getMonth()]}`;
    default: return `${day}/${month}/${year}`;
  }
}

export function formatDateRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return formatDate(dateStr, 'DD MMM YYYY');
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export function advanceRecurringDate(date: Date, frequency: RecurringPayment['frequency']): Date {
  const result = new Date(date);
  if (frequency === 'weekly') {
    result.setDate(result.getDate() + 7);
    return result;
  }
  if (frequency === 'yearly') {
    result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  const targetDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(targetDay, lastDay));
  return result;
}

export function getMonthName(month: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return names[month];
}

export function getMonthShort(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month];
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ==================== Default Categories ====================

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', type: 'expense', icon: 'UtensilsCrossed' },
  { id: 'groceries', name: 'Groceries', type: 'expense', icon: 'ShoppingCart' },
  { id: 'transport', name: 'Transportation', type: 'expense', icon: 'Car' },
  { id: 'shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag' },
  { id: 'housing', name: 'Housing & Rent', type: 'expense', icon: 'Home' },
  { id: 'utilities', name: 'Utilities', type: 'expense', icon: 'Zap' },
  { id: 'healthcare', name: 'Healthcare', type: 'expense', icon: 'Heart' },
  { id: 'education', name: 'Education', type: 'expense', icon: 'GraduationCap' },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', icon: 'Tv' },
  { id: 'travel', name: 'Travel', type: 'expense', icon: 'Plane' },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', icon: 'CreditCard' },
  { id: 'personal', name: 'Personal Care', type: 'expense', icon: 'Sparkles' },
  { id: 'other_expense', name: 'Other', type: 'expense', icon: 'MoreHorizontal' },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', icon: 'Briefcase' },
  { id: 'freelance', name: 'Freelance', type: 'income', icon: 'Laptop' },
  { id: 'business', name: 'Business', type: 'income', icon: 'Building2' },
  { id: 'investments', name: 'Investments', type: 'income', icon: 'TrendingUp' },
  { id: 'gifts', name: 'Gifts', type: 'income', icon: 'Gift' },
  { id: 'other_income', name: 'Other Income', type: 'income', icon: 'Plus' },
];

export const ALL_DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

export function getCategoryById(id: string): Category | undefined {
  const categories = getCategories();
  return categories.find(c => c.id === id);
}

export function getCategories(): Category[] {
  return getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, ALL_DEFAULT_CATEGORIES);
}

export function getCategoriesByType(type: TransactionType): Category[] {
  return getCategories().filter(c => c.type === type);
}

export function addCategory(category: Omit<Category, 'id'>): Category {
  const categories = getCategories();
  const newCat: Category = { ...category, id: generateId() };
  categories.push(newCat);
  setStorage(STORAGE_KEYS.CATEGORIES, categories);
  return newCat;
}

export function updateCategory(id: string, updates: Partial<Category>): Category | null {
  const categories = getCategories();
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  categories[idx] = { ...categories[idx], ...updates };
  setStorage(STORAGE_KEYS.CATEGORIES, categories);
  return categories[idx];
}

export function deleteCategory(id: string): boolean {
  const categories = getCategories();
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return false;
  categories.splice(idx, 1);
  setStorage(STORAGE_KEYS.CATEGORIES, categories);
  return true;
}

// ==================== Default Settings ====================

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
  notificationsEnabled: true,
  budgetWarningThreshold: 80,
  startingBalance: toPaise(50000), // ₹50,000
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Akash',
  email: 'akash@example.com',
};

// ==================== Settings CRUD ====================

export function getSettings(): AppSettings {
  return getStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function updateSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  setStorage(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

export function getProfile(): UserProfile {
  return getStorage<UserProfile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
}

export function updateProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getProfile();
  const updated = { ...current, ...profile };
  setStorage(STORAGE_KEYS.PROFILE, updated);
  return updated;
}

// ==================== Transaction CRUD ====================

export function getTransactions(): Transaction[] {
  return getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
  const transactions = getTransactions();
  const now = new Date().toISOString();
  const newTx: Transaction = {
    ...tx,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  transactions.push(newTx);
  setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  return newTx;
}

export function updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
  const transactions = getTransactions();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  transactions[idx] = { ...transactions[idx], ...updates, updatedAt: new Date().toISOString() };
  setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  return transactions[idx];
}

export function deleteTransaction(id: string): Transaction | null {
  const transactions = getTransactions();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const deleted = transactions.splice(idx, 1)[0];
  setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  restoreRecurringPaymentForTransaction(deleted);
  // Store for undo
  const deletedStack = getStorage<Transaction[]>(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
  deletedStack.push(deleted);
  if (deletedStack.length > 10) deletedStack.shift();
  setStorage(STORAGE_KEYS.DELETED_TRANSACTIONS, deletedStack);
  return deleted;
}

export function undoDeleteTransaction(): Transaction | null {
  const deletedStack = getStorage<Transaction[]>(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
  if (deletedStack.length === 0) return null;
  const restored = deletedStack.pop()!;
  setStorage(STORAGE_KEYS.DELETED_TRANSACTIONS, deletedStack);
  const transactions = getTransactions();
  transactions.push(restored);
  setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  advanceRecurringPaymentForTransaction(restored);
  return restored;
}

function restoreRecurringPaymentForTransaction(transaction: Transaction): void {
  const recurring = getRecurringPayments();
  const item = transaction.recurringPaymentId
    ? recurring.find(payment => payment.id === transaction.recurringPaymentId)
    : recurring.find(payment =>
      transaction.title === `${payment.title} (Auto-Paid)` &&
      transaction.notes === 'Recurring payment marked as paid'
    );
  if (!item) return;
  const dueDate = transaction.recurringPaymentDueDate
    || reverseRecurringDate(new Date(item.nextDueDate), item.frequency).toISOString();
  const expectedNextDueDate = advanceRecurringDate(new Date(dueDate), item.frequency).toISOString();
  if (item.nextDueDate === expectedNextDueDate) {
    updateRecurringPayment(item.id, { nextDueDate: dueDate });
  }
}

function advanceRecurringPaymentForTransaction(transaction: Transaction): void {
  if (!transaction.recurringPaymentId || !transaction.recurringPaymentDueDate) return;
  const recurring = getRecurringPayments();
  const item = recurring.find(payment => payment.id === transaction.recurringPaymentId);
  if (!item || item.nextDueDate !== transaction.recurringPaymentDueDate) return;
  updateRecurringPayment(item.id, {
    nextDueDate: advanceRecurringDate(new Date(transaction.recurringPaymentDueDate), item.frequency).toISOString()
  });
}

function reverseRecurringDate(date: Date, frequency: RecurringPayment['frequency']): Date {
  const result = new Date(date);
  if (frequency === 'weekly') {
    result.setDate(result.getDate() - 7);
  } else if (frequency === 'monthly') {
    result.setMonth(result.getMonth() - 1);
  } else {
    result.setFullYear(result.getFullYear() - 1);
  }
  return result;
}

// ==================== Transaction Filtering ====================

export function filterTransactions(filters: TransactionFilters): Transaction[] {
  let transactions = getTransactions();

  // Sort
  transactions.sort((a, b) => {
    if (filters.sortBy === 'date') {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return filters.sortOrder === 'desc' ? -diff : diff;
    }
    const diff = a.amount - b.amount;
    return filters.sortOrder === 'desc' ? -diff : diff;
  });

  // Type filter
  if (filters.type !== 'all') {
    transactions = transactions.filter(t => t.type === filters.type);
  }

  // Category filter
  if (filters.categoryId !== 'all') {
    transactions = transactions.filter(t => t.categoryId === filters.categoryId);
  }

  // Payment method filter
  if (filters.paymentMethod !== 'all') {
    transactions = transactions.filter(t => t.paymentMethod === filters.paymentMethod);
  }

  // Date range filter
  if (filters.dateRange) {
    const start = startOfDay(new Date(filters.dateRange.start));
    const end = endOfDay(new Date(filters.dateRange.end));
    transactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }

  // Search filter
  if (filters.search.trim()) {
    const query = filters.search.toLowerCase().trim();
    transactions = transactions.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (getCategoryById(t.categoryId)?.name.toLowerCase().includes(query)) ||
      (t.notes?.toLowerCase().includes(query))
    );
  }

  return transactions;
}

// ==================== Transaction Analytics ====================

export function getTransactionsForMonth(month: number, year: number): Transaction[] {
  return getTransactions().filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

export function getTransactionsInRange(start: Date, end: Date): Transaction[] {
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);
  return getTransactions().filter(t => {
    const d = new Date(t.date);
    return d >= rangeStart && d <= rangeEnd;
  });
}

export function getTotalsForTransactions(txs: Transaction[]): MonthlyTotals {
  const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expenses, net: income - expenses };
}

export function getTotalsInRange(start: Date, end: Date): MonthlyTotals {
  return getTotalsForTransactions(getTransactionsInRange(start, end));
}

export function getMonthlyTotals(month: number, year: number): MonthlyTotals {
  const txs = getTransactionsForMonth(month, year);
  const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expenses, net: income - expenses };
}

export function getTotalBalance(): number {
  const settings = getSettings();
  const transactions = getTransactions();
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return settings.startingBalance + totalIncome - totalExpenses;
}

export function getCategorySpending(month: number, year: number): CategorySpending[] {
  return getCategorySpendingForTransactions(getTransactionsForMonth(month, year));
}

export function getCategorySpendingForTransactions(transactions: Transaction[]): CategorySpending[] {
  const txs = transactions.filter(t => t.type === 'expense');
  const totalExpenses = txs.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = new Map<string, { amount: number; count: number }>();

  txs.forEach(t => {
    const existing = byCategory.get(t.categoryId) || { amount: 0, count: 0 };
    existing.amount += t.amount;
    existing.count += 1;
    byCategory.set(t.categoryId, existing);
  });

  const result: CategorySpending[] = [];
  byCategory.forEach((val, categoryId) => {
    const cat = getCategoryById(categoryId);
    result.push({
      categoryId,
      categoryName: cat?.name || 'Unknown',
      categoryIcon: cat?.icon || 'Circle',
      amount: val.amount,
      percentage: totalExpenses > 0 ? Math.round((val.amount / totalExpenses) * 100) : 0,
      count: val.count,
    });
  });

  return result.sort((a, b) => b.amount - a.amount);
}

export function getDailySpending(month: number, year: number): DailySpending[] {
  const txs = getTransactionsForMonth(month, year).filter(t => t.type === 'expense');
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyMap = new Map<string, number>();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    dailyMap.set(dateStr, 0);
  }

  txs.forEach(t => {
    const dateStr = t.date.split('T')[0];
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.amount);
  });

  return Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }));
}

export function getDailySpendingInRange(start: Date, end: Date): DailySpending[] {
  const rangeStart = startOfDay(start);
  const rangeEnd = startOfDay(end);
  const txs = getTransactionsInRange(start, end).filter(t => t.type === 'expense');
  const dailyMap = new Map<string, number>();
  for (const cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
    const dateStr = localDateKey(cursor);
    dailyMap.set(dateStr, 0);
  }
  txs.forEach(t => {
    const dateStr = localDateKey(new Date(t.date));
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.amount);
  });
  return Array.from(dailyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => ({ date, amount }));
}

export function getMonthlyComparison(numMonths: number = 6, anchorMonth?: number, anchorYear?: number): MonthlyComparison[] {
  const result: MonthlyComparison[] = [];
  const now = new Date();
  const selectedMonth = anchorMonth ?? now.getMonth();
  const selectedYear = anchorYear ?? now.getFullYear();

  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(selectedYear, selectedMonth - i, 1);
    const totals = getMonthlyTotals(d.getMonth(), d.getFullYear());
    result.push({
      month: getMonthShort(d.getMonth()),
      income: totals.income,
      expenses: totals.expenses,
    });
  }

  return result;
}

export function getLargestExpenses(month: number, year: number, limit: number = 5): Transaction[] {
  return getTransactionsForMonth(month, year)
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

// ==================== Budget CRUD ====================

export function getBudgets(): Budget[] {
  return getStorage<Budget[]>(STORAGE_KEYS.BUDGETS, []);
}

export function getBudgetsForMonth(month: number, year: number): Budget[] {
  return getBudgets().filter(b => b.month === month && b.year === year);
}

export function addBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Budget {
  const budgets = getBudgets();
  const now = new Date().toISOString();
  const newBudget: Budget = { ...budget, id: generateId(), createdAt: now, updatedAt: now };
  budgets.push(newBudget);
  setStorage(STORAGE_KEYS.BUDGETS, budgets);
  return newBudget;
}

export function updateBudget(id: string, updates: Partial<Budget>): Budget | null {
  const budgets = getBudgets();
  const idx = budgets.findIndex(b => b.id === id);
  if (idx === -1) return null;
  budgets[idx] = { ...budgets[idx], ...updates, updatedAt: new Date().toISOString() };
  setStorage(STORAGE_KEYS.BUDGETS, budgets);
  return budgets[idx];
}

export function deleteBudget(id: string): boolean {
  const budgets = getBudgets();
  const idx = budgets.findIndex(b => b.id === id);
  if (idx === -1) return false;
  budgets.splice(idx, 1);
  setStorage(STORAGE_KEYS.BUDGETS, budgets);
  return true;
}

export function getBudgetsWithSpending(month: number, year: number): BudgetWithSpending[] {
  const budgets = getBudgetsForMonth(month, year);
  const expenses = getTransactionsForMonth(month, year).filter(t => t.type === 'expense');
  return getBudgetsWithSpendingForTransactions(budgets, expenses, month, year);
}

export function getBudgetsWithSpendingForRange(start: Date, end: Date): BudgetWithSpending[] {
  const budgets = getBudgetsForMonth(start.getMonth(), start.getFullYear());
  return getBudgetsWithSpendingForTransactions(budgets, getTransactionsInRange(start, end), start.getMonth(), start.getFullYear());
}

function getBudgetsWithSpendingForTransactions(
  budgets: Budget[],
  transactions: Transaction[],
  month: number,
  year: number,
): BudgetWithSpending[] {
  const expenses = transactions.filter(t => t.type === 'expense');
  const results = budgets.map(budget => {
    let spent: number;
    if (budget.categoryId === 'overall') {
      spent = expenses.reduce((sum, t) => sum + t.amount, 0);
    } else {
      spent = expenses.filter(t => t.categoryId === budget.categoryId).reduce((sum, t) => sum + t.amount, 0);
    }

    const remaining = budget.amount - spent;
    const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
    const cat = budget.categoryId !== 'overall' ? getCategoryById(budget.categoryId) : null;

    let status: 'normal' | 'warning' | 'exceeded' = 'normal';
    if (percentage >= 100) status = 'exceeded';
    else if (percentage >= budget.warningThreshold) status = 'warning';

    return {
      ...budget,
      spent,
      remaining,
      percentage,
      status,
      categoryName: cat?.name || 'Overall Budget',
      categoryIcon: cat?.icon || 'Wallet',
    };
  });

  syncBudgetNotifications(results, month, year);
  return results;
}

function syncBudgetNotifications(budgets: BudgetWithSpending[], month: number, year: number): void {
  if (!getSettings().notificationsEnabled) return;

  const notifications = getNotifications();
  const nextNotifications = [...notifications];
  let changed = false;

  budgets.forEach(budget => {
    if (budget.status === 'normal') return;
    const key = `budget:${budget.id}:${month}:${year}:${budget.status}`;
    if (nextNotifications.some(notification => notification.actionUrl === key)) return;

    nextNotifications.unshift({
      id: generateId(),
      type: budget.status === 'exceeded' ? 'error' : 'warning',
      title: budget.status === 'exceeded' ? 'Budget exceeded' : 'Budget alert',
      message: `${budget.categoryName} is at ${budget.percentage}% of its ${getMonthName(month)} budget.`,
      isRead: false,
      timestamp: new Date().toISOString(),
      actionUrl: key,
    });
    changed = true;
  });

  if (changed) {
    setStorage(STORAGE_KEYS.NOTIFICATIONS, nextNotifications.slice(0, 50));
  }
}

// ==================== Recurring Payments CRUD ====================

export function getRecurringPayments(): RecurringPayment[] {
  return getStorage<RecurringPayment[]>(STORAGE_KEYS.RECURRING, []);
}

export function addRecurringPayment(rp: Omit<RecurringPayment, 'id' | 'createdAt' | 'updatedAt'>): RecurringPayment {
  const list = getRecurringPayments();
  const now = new Date().toISOString();
  const newRp: RecurringPayment = { ...rp, id: generateId(), createdAt: now, updatedAt: now };
  list.push(newRp);
  setStorage(STORAGE_KEYS.RECURRING, list);
  return newRp;
}

export function updateRecurringPayment(id: string, updates: Partial<RecurringPayment>): RecurringPayment | null {
  const list = getRecurringPayments();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  setStorage(STORAGE_KEYS.RECURRING, list);
  return list[idx];
}

export function deleteRecurringPayment(id: string): boolean {
  const list = getRecurringPayments();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  setStorage(STORAGE_KEYS.RECURRING, list);
  return true;
}

export function getUpcomingPayments(days: number = 7): RecurringPayment[] {
  const list = getRecurringPayments().filter(r => r.isActive);
  const now = startOfDay(new Date());
  const future = endOfDay(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));

  return list.filter(r => {
    const due = startOfDay(new Date(r.nextDueDate));
    return due >= now && due <= future;
  }).sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
}

export function getOverduePayments(): RecurringPayment[] {
  const list = getRecurringPayments().filter(r => r.isActive);
  const now = startOfDay(new Date());
  return list.filter(r => startOfDay(new Date(r.nextDueDate)) < now);
}

// ==================== Savings Goals CRUD ====================

export function getSavingsGoals(): SavingsGoal[] {
  return getStorage<SavingsGoal[]>(STORAGE_KEYS.SAVINGS, []);
}

export function addSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'contributions' | 'createdAt' | 'updatedAt'>): SavingsGoal {
  const list = getSavingsGoals();
  const now = new Date().toISOString();
  const newGoal: SavingsGoal = { ...goal, id: generateId(), contributions: [], createdAt: now, updatedAt: now };
  list.push(newGoal);
  setStorage(STORAGE_KEYS.SAVINGS, list);
  return newGoal;
}

export function updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): SavingsGoal | null {
  const list = getSavingsGoals();
  const idx = list.findIndex(g => g.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  setStorage(STORAGE_KEYS.SAVINGS, list);
  return list[idx];
}

export function deleteSavingsGoal(id: string): boolean {
  const list = getSavingsGoals();
  const idx = list.findIndex(g => g.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  setStorage(STORAGE_KEYS.SAVINGS, list);
  return true;
}

export function addContribution(goalId: string, amount: number, note?: string, date?: string): SavingsGoal | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const list = getSavingsGoals();
  const idx = list.findIndex(g => g.id === goalId);
  if (idx === -1) return null;
  const contribution = {
    id: generateId(),
    amount,
    date: date || new Date().toISOString(),
    note,
  };
  list[idx].contributions.push(contribution);
  list[idx].savedAmount += amount;
  list[idx].updatedAt = new Date().toISOString();
  setStorage(STORAGE_KEYS.SAVINGS, list);
  return list[idx];
}

export function updateContribution(
  goalId: string,
  contributionId: string,
  updates: { amount: number; date: string; note?: string }
): SavingsGoal | null {
  if (!Number.isFinite(updates.amount) || updates.amount <= 0) return null;
  const list = getSavingsGoals();
  const goalIndex = list.findIndex(goal => goal.id === goalId);
  if (goalIndex === -1) return null;
  const contributionIndex = list[goalIndex].contributions.findIndex(item => item.id === contributionId);
  if (contributionIndex === -1) return null;

  const contribution = list[goalIndex].contributions[contributionIndex];
  list[goalIndex].savedAmount += updates.amount - contribution.amount;
  list[goalIndex].contributions[contributionIndex] = {
    ...contribution,
    ...updates,
  };
  list[goalIndex].updatedAt = new Date().toISOString();
  setStorage(STORAGE_KEYS.SAVINGS, list);
  return list[goalIndex];
}

export function deleteContribution(goalId: string, contributionId: string): SavingsGoal | null {
  const list = getSavingsGoals();
  const goalIndex = list.findIndex(goal => goal.id === goalId);
  if (goalIndex === -1) return null;
  const contributionIndex = list[goalIndex].contributions.findIndex(item => item.id === contributionId);
  if (contributionIndex === -1) return null;

  const [deleted] = list[goalIndex].contributions.splice(contributionIndex, 1);
  list[goalIndex].savedAmount -= deleted.amount;
  list[goalIndex].updatedAt = new Date().toISOString();
  setStorage(STORAGE_KEYS.SAVINGS, list);
  return list[goalIndex];
}

// ==================== Notifications ====================

export function getNotifications(): AppNotification[] {
  const notifications = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  let changed = false;
  const normalized = notifications.map(notification => {
    const actionUrl = normalizeNotificationActionUrl(notification);
    if (actionUrl && actionUrl !== notification.actionUrl) {
      changed = true;
      return { ...notification, actionUrl };
    }
    return notification;
  });
  const seenActionUrls = new Set<string>();
  const deduplicated = normalized.filter(notification => {
    if (!notification.actionUrl) return true;
    const [type, target] = notification.actionUrl.split(':');
    const dedupeKey = type === 'budget' || type === 'recurring' || type === 'transaction' || type === 'savings'
      ? `${type}:${target}:${notification.title}`
      : notification.actionUrl;
    if (seenActionUrls.has(dedupeKey)) {
      changed = true;
      return false;
    }
    seenActionUrls.add(dedupeKey);
    return true;
  });
  if (changed) setStorage(STORAGE_KEYS.NOTIFICATIONS, deduplicated);
  return deduplicated;
}

function normalizeNotificationActionUrl(notification: AppNotification): string | undefined {
  const actionUrl = notification.actionUrl;
  if (actionUrl) {
    const [type, target, ...suffix] = actionUrl.split(':');
    if (type === 'budget') {
      const budget = getBudgets().find(item => item.id === target || item.categoryId === target);
      return budget ? `budget:${budget.id}${suffix.length ? `:${suffix.join(':')}` : ''}` : actionUrl;
    }
    if (type === 'recurring') {
      const payment = getRecurringPayments().find(item =>
        item.id === target || item.title.toLowerCase().includes(target.toLowerCase())
      );
      return payment ? `recurring:${payment.id}` : actionUrl;
    }
    return actionUrl;
  }

  const title = notification.title.toLowerCase();
  if (title.includes('upcoming bill')) {
    const payment = getRecurringPayments().find(item =>
      notification.message.toLowerCase().includes(item.title.toLowerCase())
    );
    return payment ? `recurring:${payment.id}` : undefined;
  }
  if (title.includes('budget')) {
    const budget = getBudgets().find(item => {
      const categoryName = item.categoryId === 'overall' ? 'overall budget' : getCategoryById(item.categoryId)?.name.toLowerCase();
      return categoryName && notification.message.toLowerCase().includes(categoryName);
    });
    return budget ? `budget:${budget.id}` : undefined;
  }
  if (title.includes('salary')) {
    const transaction = getTransactions().find(item =>
      item.type === 'income' && (item.categoryId === 'salary' || item.title.toLowerCase().includes('salary'))
    );
    return transaction ? `transaction:${transaction.id}` : undefined;
  }
  if (title.includes('savings') || title.includes('milestone')) {
    const goal = getSavingsGoals().find(item =>
      notification.message.toLowerCase().includes(item.title.toLowerCase())
    );
    return goal ? `savings:${goal.id}` : undefined;
  }
  if (title.includes('transaction')) {
    const transaction = getTransactions().find(item =>
      notification.message.toLowerCase().includes(item.title.toLowerCase())
    );
    return transaction ? `transaction:${transaction.id}` : undefined;
  }
  return undefined;
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>): AppNotification {
  const list = getNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: generateId(),
    isRead: false,
    timestamp: new Date().toISOString(),
  };
  list.unshift(newNotif);
  if (list.length > 50) list.pop();
  setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
  return newNotif;
}

export function markNotificationRead(id: string): void {
  const list = getNotifications();
  const notif = list.find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
    setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
  }
}

export function markAllNotificationsRead(): void {
  const list = getNotifications();
  list.forEach(n => n.isRead = true);
  setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
}

export function dismissNotification(id: string): boolean {
  const list = getNotifications();
  const nextList = list.filter(notification => notification.id !== id);
  if (nextList.length === list.length) return false;
  setStorage(STORAGE_KEYS.NOTIFICATIONS, nextList);
  return true;
}

export function clearNotifications(): void {
  setStorage(STORAGE_KEYS.NOTIFICATIONS, []);
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.isRead).length;
}

// ==================== CSV Export ====================

export function exportTransactionsCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Title', 'Category', 'Amount (₹)', 'Payment Method', 'Notes'];
  const escapeCSV = (value: string): string => `"${value.replace(/"/g, '""')}"`;
  const rows = transactions.map(t => {
    const cat = getCategoryById(t.categoryId);
    return [
      escapeCSV(formatDate(t.date, 'YYYY-MM-DD')),
      escapeCSV(t.type),
      escapeCSV(t.title),
      escapeCSV(cat?.name || ''),
      toRupees(t.amount).toFixed(2),
      escapeCSV(t.paymentMethod.replace(/_/g, ' ')),
      escapeCSV(t.notes || ''),
    ].join(',');
  });
  return [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ==================== Sample Data Seeding ====================

export function isInitialized(): boolean {
  return getStorage<boolean>(STORAGE_KEYS.INITIALIZED, false);
}

export function seedSampleData(): void {
  if (isInitialized()) return;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Helper to make dates in the current or previous months
  const makeDate = (daysAgo: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const sampleTransactions: Transaction[] = [
    // Current month income
    { id: generateId(), type: 'income', amount: toPaise(75000), title: 'Monthly Salary', categoryId: 'salary', date: makeDate(25), paymentMethod: 'net_banking', notes: 'October salary credit', createdAt: makeDate(25), updatedAt: makeDate(25) },
    { id: generateId(), type: 'income', amount: toPaise(15000), title: 'Freelance Project - UI Design', categoryId: 'freelance', date: makeDate(18), paymentMethod: 'upi', notes: 'Logo design for startup', createdAt: makeDate(18), updatedAt: makeDate(18) },
    { id: generateId(), type: 'income', amount: toPaise(3500), title: 'Dividend from Mutual Fund', categoryId: 'investments', date: makeDate(12), paymentMethod: 'net_banking', createdAt: makeDate(12), updatedAt: makeDate(12) },

    // Current month expenses
    { id: generateId(), type: 'expense', amount: toPaise(18000), title: 'House Rent', categoryId: 'housing', date: makeDate(24), paymentMethod: 'net_banking', notes: 'Monthly rent payment', createdAt: makeDate(24), updatedAt: makeDate(24) },
    { id: generateId(), type: 'expense', amount: toPaise(4250), title: 'BigBasket Order', categoryId: 'groceries', date: makeDate(22), paymentMethod: 'upi', createdAt: makeDate(22), updatedAt: makeDate(22) },
    { id: generateId(), type: 'expense', amount: toPaise(1850), title: 'Zomato Orders', categoryId: 'food', date: makeDate(21), paymentMethod: 'upi', createdAt: makeDate(21), updatedAt: makeDate(21) },
    { id: generateId(), type: 'expense', amount: toPaise(2400), title: 'Uber Rides', categoryId: 'transport', date: makeDate(20), paymentMethod: 'wallet', createdAt: makeDate(20), updatedAt: makeDate(20) },
    { id: generateId(), type: 'expense', amount: toPaise(1200), title: 'Netflix + Spotify', categoryId: 'subscriptions', date: makeDate(19), paymentMethod: 'credit_card', notes: 'Monthly subscriptions', createdAt: makeDate(19), updatedAt: makeDate(19) },
    { id: generateId(), type: 'expense', amount: toPaise(3500), title: 'Myntra Shopping', categoryId: 'shopping', date: makeDate(16), paymentMethod: 'credit_card', notes: 'New sneakers', createdAt: makeDate(16), updatedAt: makeDate(16) },
    { id: generateId(), type: 'expense', amount: toPaise(2800), title: 'Electricity Bill', categoryId: 'utilities', date: makeDate(15), paymentMethod: 'upi', createdAt: makeDate(15), updatedAt: makeDate(15) },
    { id: generateId(), type: 'expense', amount: toPaise(750), title: 'Haircut & Grooming', categoryId: 'personal', date: makeDate(14), paymentMethod: 'cash', createdAt: makeDate(14), updatedAt: makeDate(14) },
    { id: generateId(), type: 'expense', amount: toPaise(5000), title: 'Udemy Course Bundle', categoryId: 'education', date: makeDate(10), paymentMethod: 'debit_card', notes: 'React & Node.js courses', createdAt: makeDate(10), updatedAt: makeDate(10) },
    { id: generateId(), type: 'expense', amount: toPaise(1500), title: 'Movie Night - PVR', categoryId: 'entertainment', date: makeDate(8), paymentMethod: 'upi', notes: 'With friends', createdAt: makeDate(8), updatedAt: makeDate(8) },
    { id: generateId(), type: 'expense', amount: toPaise(850), title: 'Doctor Consultation', categoryId: 'healthcare', date: makeDate(7), paymentMethod: 'cash', createdAt: makeDate(7), updatedAt: makeDate(7) },
    { id: generateId(), type: 'expense', amount: toPaise(3200), title: 'Weekly Groceries', categoryId: 'groceries', date: makeDate(5), paymentMethod: 'upi', createdAt: makeDate(5), updatedAt: makeDate(5) },
    { id: generateId(), type: 'expense', amount: toPaise(980), title: 'Swiggy Orders', categoryId: 'food', date: makeDate(3), paymentMethod: 'upi', createdAt: makeDate(3), updatedAt: makeDate(3) },
    { id: generateId(), type: 'expense', amount: toPaise(1600), title: 'Auto & Metro', categoryId: 'transport', date: makeDate(2), paymentMethod: 'cash', createdAt: makeDate(2), updatedAt: makeDate(2) },

    // Previous month transactions (Month -1)
    { id: generateId(), type: 'income', amount: toPaise(75000), title: 'Monthly Salary', categoryId: 'salary', date: makeDate(55), paymentMethod: 'net_banking', createdAt: makeDate(55), updatedAt: makeDate(55) },
    { id: generateId(), type: 'income', amount: toPaise(8000), title: 'Freelance Work', categoryId: 'freelance', date: makeDate(45), paymentMethod: 'upi', createdAt: makeDate(45), updatedAt: makeDate(45) },
    { id: generateId(), type: 'expense', amount: toPaise(18000), title: 'House Rent', categoryId: 'housing', date: makeDate(54), paymentMethod: 'net_banking', createdAt: makeDate(54), updatedAt: makeDate(54) },
    { id: generateId(), type: 'expense', amount: toPaise(6500), title: 'Groceries', categoryId: 'groceries', date: makeDate(50), paymentMethod: 'upi', createdAt: makeDate(50), updatedAt: makeDate(50) },
    { id: generateId(), type: 'expense', amount: toPaise(4200), title: 'Food & Dining', categoryId: 'food', date: makeDate(48), paymentMethod: 'upi', createdAt: makeDate(48), updatedAt: makeDate(48) },
    { id: generateId(), type: 'expense', amount: toPaise(3800), title: 'Transportation', categoryId: 'transport', date: makeDate(44), paymentMethod: 'wallet', createdAt: makeDate(44), updatedAt: makeDate(44) },
    { id: generateId(), type: 'expense', amount: toPaise(2500), title: 'Utilities', categoryId: 'utilities', date: makeDate(42), paymentMethod: 'upi', createdAt: makeDate(42), updatedAt: makeDate(42) },
    { id: generateId(), type: 'expense', amount: toPaise(8500), title: 'Weekend Trip - Goa', categoryId: 'travel', date: makeDate(40), paymentMethod: 'credit_card', createdAt: makeDate(40), updatedAt: makeDate(40) },
    { id: generateId(), type: 'expense', amount: toPaise(1200), title: 'Subscriptions', categoryId: 'subscriptions', date: makeDate(38), paymentMethod: 'credit_card', createdAt: makeDate(38), updatedAt: makeDate(38) },

    // Month -2 transactions
    { id: generateId(), type: 'income', amount: toPaise(75000), title: 'Monthly Salary', categoryId: 'salary', date: makeDate(85), paymentMethod: 'net_banking', createdAt: makeDate(85), updatedAt: makeDate(85) },
    { id: generateId(), type: 'expense', amount: toPaise(18000), title: 'House Rent', categoryId: 'housing', date: makeDate(84), paymentMethod: 'net_banking', createdAt: makeDate(84), updatedAt: makeDate(84) },
    { id: generateId(), type: 'expense', amount: toPaise(7200), title: 'Supermarket Groceries', categoryId: 'groceries', date: makeDate(80), paymentMethod: 'upi', createdAt: makeDate(80), updatedAt: makeDate(80) },
    { id: generateId(), type: 'expense', amount: toPaise(5100), title: 'Restaurants & Cafes', categoryId: 'food', date: makeDate(78), paymentMethod: 'upi', createdAt: makeDate(78), updatedAt: makeDate(78) },
    { id: generateId(), type: 'expense', amount: toPaise(3400), title: 'Metro & Cab Rides', categoryId: 'transport', date: makeDate(74), paymentMethod: 'wallet', createdAt: makeDate(74), updatedAt: makeDate(74) },
    { id: generateId(), type: 'expense', amount: toPaise(2600), title: 'Power & Water Bills', categoryId: 'utilities', date: makeDate(72), paymentMethod: 'upi', createdAt: makeDate(72), updatedAt: makeDate(72) },
    { id: generateId(), type: 'expense', amount: toPaise(4500), title: 'Bookstore & Tech Gadgets', categoryId: 'shopping', date: makeDate(68), paymentMethod: 'credit_card', createdAt: makeDate(68), updatedAt: makeDate(68) },

    // Month -3 transactions
    { id: generateId(), type: 'income', amount: toPaise(75000), title: 'Monthly Salary', categoryId: 'salary', date: makeDate(115), paymentMethod: 'net_banking', createdAt: makeDate(115), updatedAt: makeDate(115) },
    { id: generateId(), type: 'income', amount: toPaise(14000), title: 'Freelance App Consulting', categoryId: 'freelance', date: makeDate(110), paymentMethod: 'upi', createdAt: makeDate(110), updatedAt: makeDate(110) },
    { id: generateId(), type: 'expense', amount: toPaise(18000), title: 'House Rent', categoryId: 'housing', date: makeDate(114), paymentMethod: 'net_banking', createdAt: makeDate(114), updatedAt: makeDate(114) },
    { id: generateId(), type: 'expense', amount: toPaise(6800), title: 'Monthly Provision', categoryId: 'groceries', date: makeDate(108), paymentMethod: 'upi', createdAt: makeDate(108), updatedAt: makeDate(108) },
    { id: generateId(), type: 'expense', amount: toPaise(6200), title: 'Festive Clothing', categoryId: 'shopping', date: makeDate(105), paymentMethod: 'credit_card', createdAt: makeDate(105), updatedAt: makeDate(105) },
    { id: generateId(), type: 'expense', amount: toPaise(4500), title: 'Dining Out', categoryId: 'food', date: makeDate(102), paymentMethod: 'upi', createdAt: makeDate(102), updatedAt: makeDate(102) },
    { id: generateId(), type: 'expense', amount: toPaise(3200), title: 'Fuel & Cab Rides', categoryId: 'transport', date: makeDate(98), paymentMethod: 'wallet', createdAt: makeDate(98), updatedAt: makeDate(98) },

    // Month -4 transactions
    { id: generateId(), type: 'income', amount: toPaise(72000), title: 'Monthly Salary', categoryId: 'salary', date: makeDate(145), paymentMethod: 'net_banking', createdAt: makeDate(145), updatedAt: makeDate(145) },
    { id: generateId(), type: 'expense', amount: toPaise(18000), title: 'House Rent', categoryId: 'housing', date: makeDate(144), paymentMethod: 'net_banking', createdAt: makeDate(144), updatedAt: makeDate(144) },
    { id: generateId(), type: 'expense', amount: toPaise(6400), title: 'Groceries', categoryId: 'groceries', date: makeDate(140), paymentMethod: 'upi', createdAt: makeDate(140), updatedAt: makeDate(140) },
    { id: generateId(), type: 'expense', amount: toPaise(4800), title: 'Weekend Dining', categoryId: 'food', date: makeDate(138), paymentMethod: 'upi', createdAt: makeDate(138), updatedAt: makeDate(138) },
    { id: generateId(), type: 'expense', amount: toPaise(3500), title: 'Concert Passes', categoryId: 'entertainment', date: makeDate(135), paymentMethod: 'credit_card', createdAt: makeDate(135), updatedAt: makeDate(135) },
    { id: generateId(), type: 'expense', amount: toPaise(3000), title: 'Transportation', categoryId: 'transport', date: makeDate(130), paymentMethod: 'wallet', createdAt: makeDate(130), updatedAt: makeDate(130) },
    { id: generateId(), type: 'expense', amount: toPaise(2400), title: 'Utilities', categoryId: 'utilities', date: makeDate(128), paymentMethod: 'upi', createdAt: makeDate(128), updatedAt: makeDate(128) },

    // Month -5 transactions
    { id: generateId(), type: 'income', amount: toPaise(72000), title: 'Monthly Salary', categoryId: 'salary', date: makeDate(175), paymentMethod: 'net_banking', createdAt: makeDate(175), updatedAt: makeDate(175) },
    { id: generateId(), type: 'expense', amount: toPaise(18000), title: 'House Rent', categoryId: 'housing', date: makeDate(174), paymentMethod: 'net_banking', createdAt: makeDate(174), updatedAt: makeDate(174) },
    { id: generateId(), type: 'expense', amount: toPaise(6100), title: 'Supermarket', categoryId: 'groceries', date: makeDate(170), paymentMethod: 'upi', createdAt: makeDate(170), updatedAt: makeDate(170) },
    { id: generateId(), type: 'expense', amount: toPaise(4200), title: 'Food Deliveries', categoryId: 'food', date: makeDate(168), paymentMethod: 'upi', createdAt: makeDate(168), updatedAt: makeDate(168) },
    { id: generateId(), type: 'expense', amount: toPaise(2900), title: 'Commute', categoryId: 'transport', date: makeDate(164), paymentMethod: 'cash', createdAt: makeDate(164), updatedAt: makeDate(164) },
    { id: generateId(), type: 'expense', amount: toPaise(2300), title: 'Utility Bills', categoryId: 'utilities', date: makeDate(160), paymentMethod: 'upi', createdAt: makeDate(160), updatedAt: makeDate(160) },
  ];

  setStorage(STORAGE_KEYS.TRANSACTIONS, sampleTransactions);

  // Sample budgets
  const sampleBudgets: Budget[] = [
    { id: generateId(), categoryId: 'overall', amount: toPaise(55000), month: currentMonth, year: currentYear, warningThreshold: 80, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), categoryId: 'food', amount: toPaise(5000), month: currentMonth, year: currentYear, warningThreshold: 80, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), categoryId: 'groceries', amount: toPaise(8000), month: currentMonth, year: currentYear, warningThreshold: 80, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), categoryId: 'transport', amount: toPaise(5000), month: currentMonth, year: currentYear, warningThreshold: 80, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), categoryId: 'entertainment', amount: toPaise(3000), month: currentMonth, year: currentYear, warningThreshold: 80, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), categoryId: 'shopping', amount: toPaise(5000), month: currentMonth, year: currentYear, warningThreshold: 80, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  ];

  setStorage(STORAGE_KEYS.BUDGETS, sampleBudgets);

  // Sample recurring payments
  const sampleRecurring: RecurringPayment[] = [
    { id: generateId(), title: 'House Rent', amount: toPaise(18000), type: 'expense', categoryId: 'housing', frequency: 'monthly', nextDueDate: new Date(currentYear, currentMonth + 1, 1).toISOString(), paymentMethod: 'net_banking', isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), title: 'Netflix Subscription', amount: toPaise(649), type: 'expense', categoryId: 'subscriptions', frequency: 'monthly', nextDueDate: new Date(currentYear, currentMonth, 28).toISOString(), paymentMethod: 'credit_card', isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), title: 'Spotify Premium', amount: toPaise(119), type: 'expense', categoryId: 'subscriptions', frequency: 'monthly', nextDueDate: new Date(currentYear, currentMonth, 15).toISOString(), paymentMethod: 'credit_card', isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), title: 'Gym Membership', amount: toPaise(2500), type: 'expense', categoryId: 'healthcare', frequency: 'monthly', nextDueDate: new Date(currentYear, currentMonth + 1, 5).toISOString(), paymentMethod: 'upi', isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: generateId(), title: 'Mobile Recharge', amount: toPaise(599), type: 'expense', categoryId: 'utilities', frequency: 'monthly', nextDueDate: new Date(currentYear, currentMonth, 20).toISOString(), paymentMethod: 'upi', isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  ];

  setStorage(STORAGE_KEYS.RECURRING, sampleRecurring);

  // Sample savings goals
  const sampleGoals: SavingsGoal[] = [
    {
      id: generateId(), title: 'Emergency Fund', targetAmount: toPaise(200000), savedAmount: toPaise(85000),
      targetDate: new Date(currentYear + 1, 5, 30).toISOString(),
      contributions: [
        { id: generateId(), amount: toPaise(25000), date: makeDate(90), note: 'Initial deposit' },
        { id: generateId(), amount: toPaise(30000), date: makeDate(60), note: 'Monthly savings' },
        { id: generateId(), amount: toPaise(30000), date: makeDate(30), note: 'Monthly savings' },
      ],
      createdAt: makeDate(90), updatedAt: makeDate(30),
    },
    {
      id: generateId(), title: 'New Laptop', targetAmount: toPaise(90000), savedAmount: toPaise(42000),
      targetDate: new Date(currentYear, currentMonth + 4, 1).toISOString(),
      contributions: [
        { id: generateId(), amount: toPaise(20000), date: makeDate(75) },
        { id: generateId(), amount: toPaise(12000), date: makeDate(45) },
        { id: generateId(), amount: toPaise(10000), date: makeDate(15) },
      ],
      createdAt: makeDate(75), updatedAt: makeDate(15),
    },
    {
      id: generateId(), title: 'Goa Trip', targetAmount: toPaise(30000), savedAmount: toPaise(12000),
      targetDate: new Date(currentYear, currentMonth + 2, 15).toISOString(),
      contributions: [
        { id: generateId(), amount: toPaise(5000), date: makeDate(50) },
        { id: generateId(), amount: toPaise(7000), date: makeDate(20) },
      ],
      createdAt: makeDate(50), updatedAt: makeDate(20),
    },
  ];

  setStorage(STORAGE_KEYS.SAVINGS, sampleGoals);

  // Sample notifications
  const sampleNotifications: AppNotification[] = [
    { id: generateId(), type: 'warning', title: 'Budget Alert', message: 'Your Food & Dining budget is at 57%. Keep an eye on spending.', isRead: false, timestamp: makeDate(1), actionUrl: `budget:${sampleBudgets.find(b => b.categoryId === 'food')?.id || ''}` },
    { id: generateId(), type: 'info', title: 'Upcoming Bill', message: 'Netflix subscription of ₹649 is due on the 28th.', isRead: false, timestamp: makeDate(2), actionUrl: `recurring:${sampleRecurring.find(r => r.title === 'Netflix Subscription')?.id || ''}` },
    { id: generateId(), type: 'success', title: 'Salary Credited', message: '₹75,000 salary has been credited to your account.', isRead: true, timestamp: makeDate(25), actionUrl: `transaction:${sampleTransactions.find(t => t.title === 'Monthly Salary' && t.type === 'income')?.id || ''}` },
    { id: generateId(), type: 'info', title: 'Savings Milestone', message: 'Emergency Fund has reached 42.5% of its goal!', isRead: true, timestamp: makeDate(30), actionUrl: `savings:${sampleGoals.find(g => g.title === 'Emergency Fund')?.id || ''}` },
  ];

  setStorage(STORAGE_KEYS.NOTIFICATIONS, sampleNotifications);
  setStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  setStorage(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  setStorage(STORAGE_KEYS.CATEGORIES, ALL_DEFAULT_CATEGORIES);
  setStorage(STORAGE_KEYS.INITIALIZED, true);
}

// ==================== Data Reset ====================

export function resetAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    net_banking: 'Net Banking',
    wallet: 'Wallet',
    other: 'Other',
  };
  return labels[method] || method;
}

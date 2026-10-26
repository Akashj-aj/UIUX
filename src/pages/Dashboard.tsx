import { useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  ArrowUpRight, ArrowDownRight, ChevronRight,
  Calendar, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  Legend
} from 'recharts';
import Icon from '../components/Icon';
import {
  getTotalBalance, getMonthlyTotals, getCategorySpending,
  getDailySpending, getMonthlyComparison, formatCurrency,
  toRupees, getCategoryById, getTransactionsForMonth,
  getBudgetsWithSpending, getBudgetsWithSpendingForRange, getUpcomingPayments, getOverduePayments,
  getSavingsGoals, formatDate, getMonthName
} from '../services/dataService';
import { getTotalsInRange, getCategorySpendingForTransactions, getDailySpendingInRange, getTransactionsInRange } from '../services/dataService';
import type { DateRange } from '../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onEditTransaction: (transaction: import('../types').Transaction) => void;
  onOpenTransactions: (search?: string) => void;
  refreshKey: number;
  selectedMonth: number;
  selectedYear: number;
  dateRange: DateRange | null;
}

const CHART_COLORS = ['#087651', '#4D9B7B', '#0B3023', '#18794E', '#6BA894', '#92958E', '#B7791F', '#3B82F6'];

export default function Dashboard({ onNavigate, onEditTransaction, onOpenTransactions, refreshKey, selectedMonth: month, selectedYear: year, dateRange }: DashboardProps) {
  const data = useMemo(() => {
    const rangeStart = dateRange ? new Date(`${dateRange.start}T00:00:00`) : null;
    const rangeEnd = dateRange ? new Date(`${dateRange.end}T00:00:00`) : null;
    const rangeTransactions = rangeStart && rangeEnd ? getTransactionsInRange(rangeStart, rangeEnd) : null;
    const balance = getTotalBalance();
    const currentTotals = rangeTransactions
      ? getTotalsInRange(rangeStart!, rangeEnd!)
      : getMonthlyTotals(month, year);
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevTotals = getMonthlyTotals(prevMonth, prevYear);
    const categorySpending = rangeTransactions
      ? getCategorySpendingForTransactions(rangeTransactions)
      : getCategorySpending(month, year);
    const dailySpending = rangeTransactions
      ? getDailySpendingInRange(rangeStart!, rangeEnd!)
      : getDailySpending(month, year);
    const monthlyComparison = rangeTransactions
      ? [{ month: 'Selected range', income: currentTotals.income, expenses: currentTotals.expenses }]
      : getMonthlyComparison(6, month, year);
    const budgets = rangeStart && rangeEnd
      ? getBudgetsWithSpendingForRange(rangeStart, rangeEnd)
      : getBudgetsWithSpending(month, year);
    const overallBudget = budgets.find(b => b.categoryId === 'overall');
    const upcomingPayments = getUpcomingPayments(7);
    const overduePayments = getOverduePayments();
    const savingsGoals = getSavingsGoals();
    const recentTransactions = (rangeTransactions || getTransactionsForMonth(month, year))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    const incomeChange = prevTotals.income > 0
      ? Math.round(((currentTotals.income - prevTotals.income) / prevTotals.income) * 100) : 0;
    const expenseChange = prevTotals.expenses > 0
      ? Math.round(((currentTotals.expenses - prevTotals.expenses) / prevTotals.expenses) * 100) : 0;

    return {
      balance, currentTotals, prevTotals, categorySpending,
      dailySpending, monthlyComparison, budgets, overallBudget,
      upcomingPayments, overduePayments, savingsGoals,
      recentTransactions, incomeChange, expenseChange
    };
  }, [month, year, dateRange, refreshKey]);

  const budgetRemaining = data.overallBudget?.remaining ?? null;
  const periodLabel = dateRange
    ? 'Selected range'
    : `${getMonthName(month).substring(0, 3)} ${year}`;

  const pieData = data.categorySpending.map(cs => ({
    name: cs.categoryName,
    value: toRupees(cs.amount),
  }));

  const dailyChartData = data.dailySpending.map(d => ({
    date: formatDate(d.date, 'DD MMM'),
    fullDate: d.date,
    amount: toRupees(d.amount),
  }));

  const monthlyChartData = data.monthlyComparison.map(m => ({
    month: m.month,
    income: toRupees(m.income),
    expenses: toRupees(m.expenses),
  }));

  return (
    <div>
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card card-dark summary-card animate-card stagger-1">
          <div className="summary-card-header">
            <div className="summary-card-icon dark-bg">
              <Wallet size={20} />
            </div>
          </div>
          <div className="summary-card-label">Total Balance</div>
          <div className="summary-card-amount">{formatCurrency(data.balance)}</div>
          <div className="summary-card-change positive">
            <ArrowUpRight size={14} /> Updated just now
          </div>
        </div>

        <div className="card summary-card animate-card stagger-2">
          <div className="summary-card-header">
            <div className="summary-card-icon green-bg">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="summary-card-label">Income · {periodLabel}</div>
          <div className="summary-card-amount" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(data.currentTotals.income)}
          </div>
          <div className={`summary-card-change ${data.incomeChange >= 0 ? 'positive' : 'negative'}`}>
            {data.incomeChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {dateRange ? 'Within selected range' : `${Math.abs(data.incomeChange)}% vs last month`}
          </div>
        </div>

        <div className="card summary-card animate-card stagger-3">
          <div className="summary-card-header">
            <div className="summary-card-icon green-bg">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="summary-card-label">Expenses · {periodLabel}</div>
          <div className="summary-card-amount">{formatCurrency(data.currentTotals.expenses)}</div>
          <div className={`summary-card-change ${data.expenseChange <= 0 ? 'positive' : 'negative'}`}>
            {data.expenseChange <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {dateRange ? 'Within selected range' : `${Math.abs(data.expenseChange)}% vs last month`}
          </div>
        </div>

        <div className="card summary-card animate-card stagger-4">
          <div className="summary-card-header">
            <div className="summary-card-icon green-bg">
              <PiggyBank size={20} />
            </div>
          </div>
          <div className="summary-card-label">Budget Remaining</div>
          <div className="summary-card-amount" style={{
            color: budgetRemaining !== null && budgetRemaining < 0 ? 'var(--color-error)' : 'var(--color-text-primary)'
          }}>
            {formatCurrency(budgetRemaining ?? data.currentTotals.net)}
          </div>
          {data.overallBudget ? (
            <div className="summary-card-change" style={{
              color: data.overallBudget.status === 'exceeded'
                ? 'var(--color-error)' : data.overallBudget.status === 'warning' ? 'var(--color-warning)'
                : 'var(--color-text-muted)'
            }}>
              {data.overallBudget.status === 'exceeded'
                ? `${formatCurrency(Math.abs(data.overallBudget.remaining))} over limit`
                : `${data.overallBudget.percentage}% of budget used`}
            </div>
          ) : (
            <div className="summary-card-change" style={{ color: 'var(--color-text-muted)' }}>
              Net income for period
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-3-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Income vs Expenses Chart */}
        <div className="card animate-card" style={{ animationDelay: '0.25s' }}>
          <div className="card-header">
            <span className="card-title">Income vs Expenses</span>
            <span className="text-mono">{dateRange ? periodLabel : '6 months'}</span>
          </div>
          <div className="chart-container" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} barGap={4} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EAE4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#92958E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#92958E' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${v/1000}K` : v} />
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    `₹${Number(value || 0).toLocaleString('en-IN')}`,
                    item?.dataKey === 'income' ? 'Income' : 'Expenses'
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E9EAE4', fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#087651" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#4D9B7B" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card animate-card" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <span className="card-title">Spending by Category</span>
            <span className="text-mono">{dateRange ? 'SELECTED RANGE' : `${getMonthName(month).substring(0, 3)} ${year}`}</span>
          </div>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 150, height: 150, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={2}
                      onClick={(entry: { name?: string }) => {
                        const category = data.categorySpending.find(item => item.categoryName === entry.name);
                        if (category) onOpenTransactions(category.categoryName);
                      }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, _name: any, item: any) => [
                        `₹${Number(value || 0).toLocaleString('en-IN')}`,
                        item?.payload?.name || 'Category'
                      ]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E9EAE4', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                {data.categorySpending.slice(0, 5).map((cs, i) => (
                  <button key={cs.categoryId} type="button" onClick={() => onOpenTransactions(cs.categoryName)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0', border: 0, borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none',
                    background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: CHART_COLORS[i % CHART_COLORS.length]
                      }} />
                      <span style={{ fontSize: 13 }}>{cs.categoryName}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(cs.amount)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{cs.percentage}%</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="text-secondary">No expenses this month</div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Spending + Budget */}
      <div className="grid-3-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Daily Spending */}
        <div className="card animate-card" style={{ animationDelay: '0.35s' }}>
          <div className="card-header">
            <span className="card-title">Daily Spending</span>
            <span className="text-mono">{periodLabel}</span>
          </div>
          <div className="chart-container" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087651" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#087651" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EAE4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#92958E' }} axisLine={false} tickLine={false}
                  interval={Math.floor(dailyChartData.length / 8)} />
                <YAxis tick={{ fontSize: 10, fill: '#92958E' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ? formatDate(payload[0].payload.fullDate, 'DD MMM YYYY') : ''}
                  formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Spent']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E9EAE4', fontSize: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="#087651" strokeWidth={2}
                  fill="url(#spendingGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="card animate-card" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <span className="card-title">Budget Progress</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('budgets')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {data.budgets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.budgets.slice(0, 4).map(b => (
                <button key={b.id} type="button" onClick={() => onNavigate('budgets')} style={{
                  display: 'block', width: '100%', textAlign: 'left', border: 0, padding: 0,
                  background: 'transparent', cursor: 'pointer', color: 'inherit'
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13
                  }}>
                    <span style={{ fontWeight: 500 }}>{b.categoryName}</span>
                    <span className="text-mono" style={{ fontSize: 11 }}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-bar-fill ${b.status}`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 3
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {b.percentage}% used
                    </span>
                    {b.status === 'warning' && (
                      <span className="badge badge-amber" style={{ fontSize: 10 }}>Near limit</span>
                    )}
                    {b.status === 'exceeded' && (
                      <span className="badge badge-red" style={{ fontSize: 10 }}>Exceeded</span>
                    )}
                    {b.status !== 'exceeded' ? (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {formatCurrency(b.remaining)} remaining
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--color-error)', fontWeight: 600 }}>
                        {formatCurrency(b.remaining)} remaining
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="text-secondary" style={{ marginBottom: 8 }}>No budgets set</div>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('budgets')}>
                Create Budget
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions + Upcoming */}
      <div className="grid-3-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Recent Transactions */}
        <div className="card animate-card" style={{ animationDelay: '0.45s' }}>
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('transactions')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {data.recentTransactions.length > 0 ? (
            <div>
              {data.recentTransactions.map((tx, i) => {
                const cat = getCategoryById(tx.categoryId);
                return (
                  <button key={tx.id} type="button" onClick={() => onEditTransaction(tx)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0',
                    border: 0, borderBottom: i < data.recentTransactions.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`tx-icon ${tx.type}`}>
                        <Icon name={cat?.icon || 'Circle'} size={16} />
                      </div>
                      <div>
                        <div className="tx-name">{tx.title}</div>
                        <div className="tx-category">{cat?.name} · {formatDate(tx.date, 'DD MMM')}</div>
                      </div>
                    </div>
                    <div className={`tx-amount ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="text-secondary">No transactions yet</div>
            </div>
          )}
        </div>

        {/* Upcoming & Savings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {/* Upcoming Bills */}
          <div className="card animate-card" style={{ animationDelay: '0.5s' }}>
            <div className="card-header">
              <span className="card-title">Upcoming Bills</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('recurring')}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            {(data.overduePayments.length > 0 || data.upcomingPayments.length > 0) ? (
              <div>
                {data.overduePayments.map(rp => (
                  <button key={rp.id} type="button" onClick={() => onNavigate('recurring')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid var(--color-border)'
                    , border: 0, background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={16} color="var(--color-error)" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{rp.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-error)' }}>Overdue · {formatDate(rp.nextDueDate, 'DD MMM YYYY')}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(rp.amount)}
                    </div>
                  </button>
                ))}
                {data.upcomingPayments.map(rp => (
                  <button key={rp.id} type="button" onClick={() => onNavigate('recurring')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', border: 0, borderBottom: '1px solid var(--color-border)',
                    background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Calendar size={14} color="var(--color-text-muted)" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{rp.title}</div>
                        <div className="text-mono">
                          {formatDate(rp.nextDueDate, 'DD MMM YYYY')} · {new Date(rp.nextDueDate).toDateString() === new Date().toDateString() ? 'Due today' : 'Upcoming'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(rp.amount)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                No upcoming bills
              </div>
            )}
          </div>

          {/* Savings Goals */}
          <div className="card animate-card" style={{ animationDelay: '0.55s' }}>
            <div className="card-header">
              <span className="card-title">Savings Goals</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('savings')}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            {data.savingsGoals.length > 0 ? (
              <div>
                {data.savingsGoals.slice(0, 3).map((goal, i) => {
                  const pct = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <button key={goal.id} type="button" onClick={() => onNavigate('savings')} style={{
                      padding: '8px 0',
                      border: 0, borderBottom: i < Math.min(data.savingsGoals.length, 3) - 1 ? '1px solid var(--color-border)' : 'none',
                      background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{goal.title}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{pct}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                        <span className="text-mono">{formatCurrency(goal.savedAmount)}</span>
                        <span className="text-mono">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                No savings goals yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

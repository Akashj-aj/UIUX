import { useState, useMemo } from 'react';
import { Download, ArrowUpRight, ArrowDownRight, TrendingUp, CreditCard } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  getTransactions, getCategories, formatCurrency, toRupees,
  formatDate, exportTransactionsCSV, downloadCSV, getPaymentMethodLabel
} from '../services/dataService';
import type { Transaction } from '../types';

interface ReportsPageProps {
  refreshKey: number;
}

const PIE_COLORS = ['#087651', '#4D9B7B', '#0B3023', '#18794E', '#6BA894', '#92958E', '#B7791F', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function ReportsPage({ refreshKey }: ReportsPageProps) {
  const [timeRange, setTimeRange] = useState<'this_month' | 'last_3' | 'last_6' | 'all' | 'custom'>('last_6');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [donutView, setDonutView] = useState<'category' | 'payment'>('category');

  const transactions = useMemo(() => getTransactions(), [refreshKey]);
  const categories = useMemo(() => getCategories(), [refreshKey]);

  // Filter transactions by time range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (timeRange === 'custom') {
      if (!customStart || !customEnd) return [];
      const start = new Date(`${customStart}T00:00:00`);
      const end = new Date(`${customEnd}T23:59:59`);
      return start <= end ? transactions.filter(t => {
        const date = new Date(t.date);
        return date >= start && date <= end;
      }) : [];
    }
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (timeRange === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'last_3') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return d >= threeMonthsAgo;
      }
      if (timeRange === 'last_6') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return d >= sixMonthsAgo;
      }
      return true;
    });
  }, [transactions, timeRange, customStart, customEnd]);

  // Aggregate totals
  const { totalIncome, totalExpenses, netSavings, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });
    const net = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;
    return { totalIncome: inc, totalExpenses: exp, netSavings: net, savingsRate: rate };
  }, [filteredTransactions]);

  const filteredCategoryTransactions = useMemo(() => (
    filteredTransactions.filter(t =>
      t.type === 'expense' && (categoryFilter === 'all' || t.categoryId === categoryFilter)
    )
  ), [filteredTransactions, categoryFilter]);

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    filteredCategoryTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Other';
      if (!map[name]) {
        map[name] = { name, amount: 0, count: 0 };
      }
      map[name].amount += t.amount;
      map[name].count += 1;
    });

    const list = Object.values(map).sort((a, b) => b.amount - a.amount);
    return list.map(item => ({
      ...item,
      percentage: filteredCategoryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) > 0
        ? Math.round((item.amount / filteredCategoryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)) * 100)
        : 0
    }));
  }, [filteredCategoryTransactions, categories]);

  // Payment method breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      const method = getPaymentMethodLabel(t.paymentMethod);
      map[method] = (map[method] || 0) + t.amount;
    });
    const total = Object.values(map).reduce((sum, amount) => sum + amount, 0);
    return Object.entries(map).map(([name, amount]) => ({
      name,
      value: toRupees(amount),
      percentage: total > 0
        ? Math.round((amount / total) * 100)
        : 0,
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const donutData = donutView === 'category'
    ? categoryBreakdown.map(category => ({
      name: category.name,
      value: toRupees(category.amount),
      percentage: category.percentage,
    }))
    : paymentMethodBreakdown;

  // Monthly trends
  const monthlyTrends = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map: Record<string, { month: string; income: number; expenses: number; sortKey: string }> = {};

    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const useDays = timeRange === 'this_month' ||
        (timeRange === 'custom' && customStart && customEnd &&
          (new Date(`${customEnd}T00:00:00`).getTime() - new Date(`${customStart}T00:00:00`).getTime()) <= 31 * 86400000);
      const key = useDays
        ? `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
        : `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = useDays
        ? `${d.getDate().toString().padStart(2, '0')} ${monthNames[d.getMonth()]}`
        : `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (!map[key]) {
        map[key] = { month: label, income: 0, expenses: 0, sortKey: key };
      }
      if (t.type === 'income') {
        map[key].income += toRupees(t.amount);
      } else {
        map[key].expenses += toRupees(t.amount);
      }
    });

    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredTransactions, timeRange, customStart, customEnd]);

  // Top 5 largest single expenses
  const topExpenses = useMemo(() => {
    return [...filteredTransactions]
      .filter(t => t.type === 'expense'
        && (categoryFilter === 'all' || t.categoryId === categoryFilter))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions, categoryFilter]);

  const handleExport = () => {
    const csv = exportTransactionsCSV(filteredTransactions);
    downloadCSV(csv, `paiseaura_report_${timeRange}.csv`);
  };

  return (
    <div className="animate-fade-in">
      {/* Top Header & Range Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Time Range Pills */}
        <div style={{ display: 'flex', background: 'var(--color-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <button
            className={`btn btn-sm ${timeRange === 'this_month' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTimeRange('this_month')}
          >
            This Month
          </button>
          <button
            className={`btn btn-sm ${timeRange === 'last_3' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTimeRange('last_3')}
          >
            3 Months
          </button>
          <button
            className={`btn btn-sm ${timeRange === 'last_6' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTimeRange('last_6')}
          >
            6 Months
          </button>
          <button
            className={`btn btn-sm ${timeRange === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
          <button
            className={`btn btn-sm ${timeRange === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTimeRange('custom')}
          >
            Custom
          </button>
        </div>

        {timeRange === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="date" className="filter-input" value={customStart} onChange={event => setCustomStart(event.target.value)} aria-label="Report start date" />
            <span className="text-muted">to</span>
            <input type="date" className="filter-input" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} aria-label="Report end date" />
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
              }}
              disabled={!customStart && !customEnd}
            >
              Clear
            </button>
          </div>
        )}

        <button className="btn btn-secondary" onClick={handleExport}>
          <Download size={16} />
          <span>Export Report CSV</span>
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="summary-cards" style={{ marginBottom: '24px' }}>
        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon positive-bg">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="summary-card-label">Total Inflow</div>
          <div className="summary-card-amount">{formatCurrency(totalIncome)}</div>
          <div className="summary-card-change positive">
            {filteredTransactions.filter(t => t.type === 'income').length} earnings recorded
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="summary-card-label">Total Outflow</div>
          <div className="summary-card-amount">{formatCurrency(totalExpenses)}</div>
          <div className="summary-card-change" style={{ color: 'var(--color-text-muted)' }}>
            {filteredTransactions.filter(t => t.type === 'expense').length} purchases made
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="summary-card-label">Net Savings</div>
          <div className="summary-card-amount" style={{ color: netSavings >= 0 ? 'var(--color-primary-action)' : 'var(--color-error)' }}>
            {formatCurrency(netSavings)}
          </div>
          <div className="summary-card-change" style={{ color: netSavings >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            Savings Rate: {savingsRate}%
          </div>
        </div>
      </div>

      {/* Main Charts: Trends + Donut */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Monthly Trend Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Income vs Expense Over Time</h3>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} barGap={4} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EAE4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#92958E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#92958E' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    `₹${Number(value || 0).toLocaleString('en-IN')}`,
                    item?.dataKey === 'income' ? 'Income' : 'Expenses'
                  ]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E9EAE4', fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#087651" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#4D9B7B" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spending breakdown donut */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Spending by {donutView === 'category' ? 'Category' : 'Payment Method'}
            </h3>
            <select className="filter-select" value={donutView} onChange={event => setDonutView(event.target.value as 'category' | 'payment')} aria-label="Spending breakdown">
              <option value="category">By Category</option>
              <option value="payment">By Payment Method</option>
            </select>
          </div>
          {donutData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', height: '260px' }}>
              <div style={{ width: '160px', height: '100%', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, name]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E9EAE4', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, paddingLeft: '16px', overflowY: 'auto', maxHeight: '240px' }}>
                {donutData.map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>₹{item.value.toLocaleString('en-IN')} ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">No payment data in this range</div>
          )}
        </div>
      </div>

      {/* Category Spending Table + Top Expenses */}
      <div className="grid-2">
        {/* Category breakdown table */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Expense Breakdown by Category</h3>
            <select className="filter-select" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter expense category">
              <option value="all">All Categories</option>
              {categories.filter(category => category.type === 'expense').map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="transactions-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                  <th>Share</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map(cat => (
                  <tr key={cat.name}>
                    <td style={{ fontWeight: 500 }}>{cat.name}</td>
                    <td>{cat.count}</td>
                    <td>{cat.percentage}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(cat.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 largest expenses */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Largest Outflows</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topExpenses.map((t: Transaction) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--color-surface-hover)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{t.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{formatDate(t.date)}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CreditCard size={11} /> {getPaymentMethodLabel(t.paymentMethod)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-error)' }}>
                  {formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

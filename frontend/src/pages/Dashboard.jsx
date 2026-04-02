import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsAPI } from '../api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Receipt, Euro, DollarSign } from 'lucide-react';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const HEX_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ date_from: '', date_to: '' });
  const [currency, setCurrency] = useState('both');
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [companyData, setCompanyData] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState([]);
  const [expenseTypeData, setExpenseTypeData] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (params = {}) => {
    setLoading(true);
    try {
      const [summaryRes, monthlyRes, companyRes, paymentFormRes, expenseTypeRes] =
        await Promise.all([
          analyticsAPI.getSummary(params),
          analyticsAPI.getMonthlyTotals(params),
          analyticsAPI.getTotalsByCompany(params),
          analyticsAPI.getTotalsByPaymentForm(params),
          analyticsAPI.getTotalsByExpenseType(params),
        ]);
      setSummary(summaryRes.data);
      setMonthlyData(monthlyRes.data);
      setCompanyData(companyRes.data.slice(0, 10));
      setPaymentFormData(paymentFormRes.data);
      setExpenseTypeData(expenseTypeRes.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const params = {};
    if (dateRange.date_from) params.date_from = dateRange.date_from;
    if (dateRange.date_to) params.date_to = dateRange.date_to;
    fetchAllData(params);
  };

  const fmt = (value, curr) => {
    if (!value) return '—';
    if (curr === 'EUR') return `€${parseFloat(value).toFixed(2)}`;
    if (curr === 'PYG') return `₲${parseInt(value).toLocaleString()}`;
    return value;
  };

  const monthlyChartData = monthlyData.map((item) => ({
    month: new Date(item.month + '-01').toLocaleDateString('default', {
      month: 'short',
      year: '2-digit',
    }),
    EUR: currency === 'pyg' ? 0 : parseFloat(item.total_eur || 0),
    PYG: currency === 'eur' ? 0 : parseFloat(item.total_pyg || 0),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="date"
              value={dateRange.date_from}
              onChange={(e) => setDateRange((p) => ({ ...p, date_from: e.target.value }))}
              className="sm:w-44"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateRange.date_to}
              onChange={(e) => setDateRange((p) => ({ ...p, date_to: e.target.value }))}
              className="sm:w-44"
              placeholder="To"
            />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">EUR &amp; PYG</SelectItem>
                <SelectItem value="eur">EUR only</SelectItem>
                <SelectItem value="pyg">PYG only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleApply} className="sm:w-auto">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{summary.total_expenses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5" /> Total EUR
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-primary">
                {fmt(summary.total_eur, 'EUR')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Total PYG
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-emerald-500">
                {fmt(summary.total_pyg, 'PYG')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> With EUR
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{summary.expenses_with_eur}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyChartData}>
              <defs>
                <linearGradient id="eurGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pygGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend />
              {currency !== 'pyg' && (
                <Area type="monotone" dataKey="EUR" stroke="#3B82F6" fill="url(#eurGrad)" strokeWidth={2} name="EUR (€)" />
              )}
              {currency !== 'eur' && (
                <Area type="monotone" dataKey="PYG" stroke="#10B981" fill="url(#pygGrad)" strokeWidth={2} name="PYG (₲)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top companies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={companyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="company__name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend />
              {currency !== 'pyg' && <Bar dataKey="total_eur" fill="#3B82F6" name="EUR (€)" radius={[0, 4, 4, 0]} />}
              {currency !== 'eur' && <Bar dataKey="total_pyg" fill="#10B981" name="PYG (₲)" radius={[0, 4, 4, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Payment Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentFormData.map((item, index) => (
              <div key={item.payment_form__id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: HEX_COLORS[index % HEX_COLORS.length] }}
                  />
                  <span className="text-sm">{item.payment_form__name}</span>
                </div>
                <div className="text-sm font-medium text-right">
                  {currency !== 'pyg' && item.total_eur && (
                    <span className="text-primary">{fmt(item.total_eur, 'EUR')}</span>
                  )}
                  {currency === 'both' && item.total_eur && item.total_pyg && (
                    <span className="text-muted-foreground mx-1">/</span>
                  )}
                  {currency !== 'eur' && item.total_pyg && (
                    <span className="text-emerald-500">{fmt(item.total_pyg, 'PYG')}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Expense Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenseTypeData.map((item, index) => (
              <div key={item.expense_type__id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: HEX_COLORS[index % HEX_COLORS.length] }}
                  />
                  <span className="text-sm">{item.expense_type__name}</span>
                </div>
                <div className="text-sm font-medium text-right">
                  {currency !== 'pyg' && item.total_eur && (
                    <span className="text-primary">{fmt(item.total_eur, 'EUR')}</span>
                  )}
                  {currency === 'both' && item.total_eur && item.total_pyg && (
                    <span className="text-muted-foreground mx-1">/</span>
                  )}
                  {currency !== 'eur' && item.total_pyg && (
                    <span className="text-emerald-500">{fmt(item.total_pyg, 'PYG')}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

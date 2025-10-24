import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { expenseTypeAPI } from '../api/expenses';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);

  // Get first day of current month in YYYY-MM-DD format
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const [dateRange, setDateRange] = useState({
    date_from: getFirstDayOfMonth(),
    date_to: '',
  });
  const [currency, setCurrency] = useState('eur'); // 'both', 'eur', 'pyg'
  const [selectedExpenseTypes, setSelectedExpenseTypes] = useState([]); // Array of expense type IDs
  const [availableExpenseTypes, setAvailableExpenseTypes] = useState([]); // All expense types from API

  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [companyData, setCompanyData] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState([]);
  const [expenseTypeData, setExpenseTypeData] = useState([]);

  useEffect(() => {
    fetchExpenseTypes();
    fetchAllData();
  }, []);

  const fetchExpenseTypes = async () => {
    try {
      const response = await expenseTypeAPI.getAll();
      setAvailableExpenseTypes(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load expense types:', err);
    }
  };

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
      setCompanyData(companyRes.data.slice(0, 10)); // Top 10
      setPaymentFormData(paymentFormRes.data);
      setExpenseTypeData(expenseTypeRes.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    const params = {};
    if (dateRange.date_from) params.date_from = dateRange.date_from;
    if (dateRange.date_to) params.date_to = dateRange.date_to;
    if (selectedExpenseTypes.length > 0) {
      params.expense_type_ids = selectedExpenseTypes.join(',');
    }
    fetchAllData(params);
  };

  const handleExpenseTypeToggle = (typeId) => {
    setSelectedExpenseTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (value, curr) => {
    if (!value) return '-';
    if (curr === 'EUR') return `€${parseFloat(value).toFixed(2)}`;
    if (curr === 'PYG') return `₲${parseInt(value).toLocaleString()}`;
    return value;
  };

  // Prepare monthly chart data based on currency and expense type selection
  const getMonthlyChartData = () => {
    // If expense types are selected, group by expense type
    if (selectedExpenseTypes.length > 0) {
      // Group data by month and expense type
      const groupedByMonth = {};

      monthlyData.forEach((item) => {
        const monthKey = new Date(item.month).toLocaleDateString('default', {
          month: 'short',
          year: 'numeric',
        });

        if (!groupedByMonth[monthKey]) {
          groupedByMonth[monthKey] = { month: monthKey };
        }

        // Add data for each expense type
        const typeName = item.expense_type__name;
        if (currency === 'eur') {
          groupedByMonth[monthKey][typeName] = item.total_eur || 0;
        } else if (currency === 'pyg') {
          groupedByMonth[monthKey][typeName] = item.total_pyg || 0;
        } else {
          // For 'both', use EUR by default (could also add separate lines for EUR and PYG)
          groupedByMonth[monthKey][typeName] = item.total_eur || 0;
        }
      });

      return Object.values(groupedByMonth);
    } else {
      // Normal view without expense type breakdown
      return monthlyData.map((item) => ({
        month: new Date(item.month).toLocaleDateString('default', {
          month: 'short',
          year: 'numeric',
        }),
        EUR: currency === 'pyg' ? 0 : item.total_eur || 0,
        PYG: currency === 'eur' ? 0 : item.total_pyg || 0,
      }));
    }
  };

  // Colors for charts
  const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#6366F1',
    '#84CC16',
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="date_from"
              value={dateRange.date_from}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="date_to"
              value={dateRange.date_to}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">Both (EUR & PYG)</option>
              <option value="eur">EUR only</option>
              <option value="pyg">PYG only</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilterApply}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Expense Type Multi-Select Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Expense Type (Multi-select)
          </label>
          <div className="flex flex-wrap gap-2">
            {availableExpenseTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleExpenseTypeToggle(type.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedExpenseTypes.includes(type.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
          {selectedExpenseTypes.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedExpenseTypes.length} type(s) selected
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.total_expenses}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total EUR</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.total_eur, 'EUR')}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total PYG</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_pyg, 'PYG')}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Expenses w/ Both</div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.expenses_with_eur + summary.expenses_with_pyg - summary.total_expenses}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Monthly Trend
          {selectedExpenseTypes.length > 0 && ' (by Expense Type)'}
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={getMonthlyChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedExpenseTypes.length > 0 ? (
              // Render a line for each selected expense type
              availableExpenseTypes
                .filter((type) => selectedExpenseTypes.includes(type.id))
                .map((type, index) => (
                  <Line
                    key={type.id}
                    type="monotone"
                    dataKey={type.name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    name={type.name}
                  />
                ))
            ) : (
              // Default view: show EUR and/or PYG lines
              <>
                {currency !== 'pyg' && (
                  <Line
                    type="monotone"
                    dataKey="EUR"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="EUR (€)"
                  />
                )}
                {currency !== 'eur' && (
                  <Line
                    type="monotone"
                    dataKey="PYG"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="PYG (₲)"
                  />
                )}
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Companies Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Top 10 Companies by Spending
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={companyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="company__name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            {currency !== 'pyg' && (
              <Bar dataKey="total_eur" fill="#3B82F6" name="EUR (€)" />
            )}
            {currency !== 'eur' && (
              <Bar dataKey="total_pyg" fill="#10B981" name="PYG (₲)" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Form & Expense Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Payment Form Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Expenses by Payment Form
          </h2>
          <div className="space-y-2">
            {paymentFormData.map((item, index) => (
              <div key={item.payment_form__id} className="flex justify-between items-center">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-700">{item.payment_form__name}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {currency !== 'pyg' && item.total_eur && formatCurrency(item.total_eur, 'EUR')}
                  {currency === 'both' && item.total_eur && item.total_pyg && ' / '}
                  {currency !== 'eur' && item.total_pyg && formatCurrency(item.total_pyg, 'PYG')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Type Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Expenses by Type
          </h2>
          <div className="space-y-2">
            {expenseTypeData.map((item, index) => (
              <div key={item.expense_type__id} className="flex justify-between items-center">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-700">{item.expense_type__name}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {currency !== 'pyg' && item.total_eur && formatCurrency(item.total_eur, 'EUR')}
                  {currency === 'both' && item.total_eur && item.total_pyg && ' / '}
                  {currency !== 'eur' && item.total_pyg && formatCurrency(item.total_pyg, 'PYG')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

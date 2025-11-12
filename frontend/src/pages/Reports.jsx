import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsAPI } from '../api/analytics';
import { expenseTypeAPI, companyAPI } from '../api/expenses';
import { expenseAPI } from '../api/expenses';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Get last 6 months date range by default
  const getDefaultDateRange = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const year = sixMonthsAgo.getFullYear();
    const month = String(sixMonthsAgo.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Filters
  const [dateRange, setDateRange] = useState({
    date_from: getDefaultDateRange(),
    date_to: '',
  });
  const [selectedExpenseType, setSelectedExpenseType] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [currency, setCurrency] = useState('eur');

  // Master data
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Report data
  const [monthlyData, setMonthlyData] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [threeMonthAverage, setThreeMonthAverage] = useState(null);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (expenseTypes.length > 0 && companies.length > 0) {
      fetchReportData();
    }
  }, [expenseTypes, companies]);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [typesRes, companiesRes] = await Promise.all([
        expenseTypeAPI.getAll(),
        companyAPI.getAll(),
      ]);
      setExpenseTypes(typesRes.data.results || typesRes.data);
      setCompanies(companiesRes.data.results || companiesRes.data);
    } catch (err) {
      console.error('Failed to load master data:', err);
      alert('Failed to load expense types and companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.date_from) params.date_from = dateRange.date_from;
      if (dateRange.date_to) params.date_to = dateRange.date_to;
      if (selectedExpenseType) params.expense_type_ids = selectedExpenseType;
      if (selectedCompany) params.company_id = selectedCompany;

      const monthlyRes = await analyticsAPI.getMonthlyTotals(params);
      const monthlyDataProcessed = processMonthlyData(monthlyRes.data);
      setMonthlyData(monthlyDataProcessed);

      // Calculate comparison data
      const comparison = calculateMonthlyComparison(monthlyDataProcessed);
      setComparisonData(comparison);

      // Calculate 3-month average if expense type is selected
      if (selectedExpenseType) {
        const avg = calculate3MonthAverage(monthlyDataProcessed);
        setThreeMonthAverage(avg);
      } else {
        setThreeMonthAverage(null);
      }

      // Fetch expenses for the table
      await fetchExpenses(params);
    } catch (err) {
      console.error('Failed to load report data:', err);
      alert('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (analyticsParams) => {
    setExpensesLoading(true);
    try {
      // Convert analytics params to expense API params
      const expenseParams = {
        ordering: '-date',
        page_size: 100,
      };

      if (analyticsParams.date_from) {
        expenseParams.date__gte = analyticsParams.date_from;
      }
      if (analyticsParams.date_to) {
        expenseParams.date__lte = analyticsParams.date_to;
      }
      if (analyticsParams.expense_type_ids) {
        expenseParams.expense_type = analyticsParams.expense_type_ids;
      }
      if (analyticsParams.company_id) {
        expenseParams.company = analyticsParams.company_id;
      }

      const response = await expenseAPI.getAll(expenseParams);
      setExpenses(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setExpensesLoading(false);
    }
  };

  const processMonthlyData = (data) => {
    // Group by month and sum totals
    const monthMap = {};

    data.forEach((item) => {
      const monthKey = item.month;
      const monthLabel = new Date(item.month).toLocaleDateString('default', {
        month: 'short',
        year: 'numeric',
      });

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          monthLabel,
          total_eur: 0,
          total_pyg: 0,
        };
      }

      monthMap[monthKey].total_eur += parseFloat(item.total_eur || 0);
      monthMap[monthKey].total_pyg += parseFloat(item.total_pyg || 0);
    });

    // Sort by month
    return Object.values(monthMap).sort((a, b) =>
      new Date(a.month) - new Date(b.month)
    );
  };

  const calculateMonthlyComparison = (data) => {
    if (data.length < 2) return null;

    const currentMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];

    const currentTotal = currency === 'eur' ? currentMonth.total_eur : currentMonth.total_pyg;
    const previousTotal = currency === 'eur' ? previousMonth.total_eur : previousMonth.total_pyg;

    const difference = currentTotal - previousTotal;
    const percentageChange = previousTotal !== 0
      ? ((difference / previousTotal) * 100).toFixed(1)
      : 0;

    return {
      current: currentTotal,
      previous: previousTotal,
      difference,
      percentageChange,
      isIncrease: difference > 0,
    };
  };

  const calculate3MonthAverage = (data) => {
    if (data.length < 3) return null;

    const lastThreeMonths = data.slice(-3);
    const total = lastThreeMonths.reduce((sum, month) => {
      return sum + (currency === 'eur' ? month.total_eur : month.total_pyg);
    }, 0);

    return (total / 3).toFixed(2);
  };

  const handleFilterApply = () => {
    fetchReportData();
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (value, curr = currency) => {
    if (!value) return '-';
    if (curr === 'eur') return `€${parseFloat(value).toFixed(2)}`;
    if (curr === 'pyg') return `₲${parseInt(value).toLocaleString()}`;
    return value;
  };

  const getChartData = () => {
    return monthlyData.map((item) => ({
      month: item.monthLabel,
      [currency === 'eur' ? 'EUR' : 'PYG']:
        currency === 'eur' ? item.total_eur : item.total_pyg,
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              Expense Type
            </label>
            <select
              value={selectedExpenseType}
              onChange={(e) => setSelectedExpenseType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
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
              <option value="eur">EUR (€)</option>
              <option value="pyg">PYG (₲)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleFilterApply}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Month-to-Month Comparison */}
        {comparisonData && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-2">Month-to-Month Change</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(Math.abs(comparisonData.difference))}
              </div>
              <div
                className={`text-sm font-medium ${
                  comparisonData.isIncrease ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {comparisonData.isIncrease ? '↑' : '↓'} {Math.abs(comparisonData.percentageChange)}%
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Previous: {formatCurrency(comparisonData.previous)}
            </div>
          </div>
        )}

        {/* 3-Month Average */}
        {threeMonthAverage && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-2">
              3-Month Average
              {selectedExpenseType && (
                <span className="ml-1 text-blue-600 font-medium">
                  ({expenseTypes.find((t) => t.id === parseInt(selectedExpenseType))?.name})
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(threeMonthAverage)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last 3 months average
            </div>
          </div>
        )}

        {/* Total in Period */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 mb-2">Total in Period</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(
              monthlyData.reduce((sum, month) =>
                sum + (currency === 'eur' ? month.total_eur : month.total_pyg), 0
              )
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {monthlyData.length} month(s) | {expenses.length} expense(s)
          </div>
        </div>
      </div>

      {/* Monthly Trend Graph */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Monthly Trend
          {selectedExpenseType && (
            <span className="ml-2 text-base font-normal text-gray-600">
              ({expenseTypes.find((t) => t.id === parseInt(selectedExpenseType))?.name})
            </span>
          )}
          {selectedCompany && (
            <span className="ml-2 text-base font-normal text-gray-600">
              ({companies.find((c) => c.id === parseInt(selectedCompany))?.name})
            </span>
          )}
        </h2>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={currency === 'eur' ? 'EUR' : 'PYG'}
                stroke="#3B82F6"
                strokeWidth={3}
                name={currency === 'eur' ? 'EUR (€)' : 'PYG (₲)'}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No data available for the selected filters
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Expense Details</h2>
        </div>
        {expensesLoading ? (
          <div className="text-center py-12 text-gray-500">Loading expenses...</div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Form
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount EUR
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount PYG
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.expense_type_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.payment_form_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                      {expense.amount_eur ? formatCurrency(expense.amount_eur, 'eur') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      {expense.amount_pyg ? formatCurrency(expense.amount_pyg, 'pyg') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No expenses found for the selected filters
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { expenseAPI } from '../api/expenses';

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    date__gte: '',
    date__lte: '',
  });
  const [nextPage, setNextPage] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const tableContainerRef = useRef(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async (filterParams = {}, page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      // Add ordering parameter
      const orderingParam = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const params = { ...filterParams, page_size: 100, page, ordering: orderingParam };
      const response = await expenseAPI.getAll(params);

      if (append) {
        setExpenses(prev => [...prev, ...(response.data.results || response.data)]);
      } else {
        setExpenses(response.data.results || response.data);
      }

      setHasMore(!!response.data.next);
      setNextPage(response.data.next ? page + 1 : null);
    } catch (err) {
      setError('Failed to load expenses. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreExpenses = () => {
    if (!loadingMore && hasMore && nextPage) {
      const filterParams = {};
      if (filters.search) filterParams.search = filters.search;
      if (filters.date__gte) filterParams.date__gte = filters.date__gte;
      if (filters.date__lte) filterParams.date__lte = filters.date__lte;
      fetchExpenses(filterParams, nextPage, true);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      loadMoreExpenses();
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.date__gte) params.date__gte = filters.date__gte;
    if (filters.date__lte) params.date__lte = filters.date__lte;
    // Don't pass page parameter - fetchExpenses will add page_size
    fetchExpenses(params);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    try {
      await expenseAPI.delete(id);
      fetchExpenses();
    } catch (err) {
      alert('Failed to delete expense');
      console.error(err);
    }
  };

  const formatCurrency = (amount, currency) => {
    if (!amount) return '-';
    if (currency === 'EUR') {
      return `€${parseFloat(amount).toFixed(2)}`;
    } else if (currency === 'PYG') {
      return `₲${parseInt(amount).toLocaleString()}`;
    }
    return amount;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default desc order
      setSortField(field);
      setSortOrder('desc');
    }
    // Refresh data with new sorting
    const filterParams = {};
    if (filters.search) filterParams.search = filters.search;
    if (filters.date__gte) filterParams.date__gte = filters.date__gte;
    if (filters.date__lte) filterParams.date__lte = filters.date__lte;
    fetchExpenses(filterParams);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const handleExportCSV = () => {
    // Build query params from current filters
    const params = new URLSearchParams();
    if (filters.date__gte) params.append('date_from', filters.date__gte);
    if (filters.date__lte) params.append('date_to', filters.date__lte);

    // Get auth token
    const token = localStorage.getItem('token');

    // Create download link
    const url = `http://127.0.0.1:8000/api/analytics/export-csv/?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'expenses_export.csv');

    // Add authorization header via fetch and create blob
    fetch(url, {
      headers: {
        'Authorization': `Token ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Export failed:', err);
        alert('Failed to export CSV');
      });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading expenses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600">{error}</div>
        <button
          onClick={() => fetchExpenses()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <div className="flex gap-3">
          <Link
            to="/expenses/import"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Import
          </Link>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
          <Link
            to="/expenses/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add New Expense
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-4 rounded-lg shadow-sm mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="date__gte"
              value={filters.date__gte}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="date__lte"
              value={filters.date__lte}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
            >
              Filter
            </button>
          </div>
        </div>
      </form>

      {/* Expenses Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div
          ref={tableContainerRef}
          onScroll={handleScroll}
          className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto"
        >
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th
                onClick={() => handleSort('date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Date{getSortIcon('date')}
              </th>
              <th
                onClick={() => handleSort('company__name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Company{getSortIcon('company__name')}
              </th>
              <th
                onClick={() => handleSort('expense_type__name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Expense Type{getSortIcon('expense_type__name')}
              </th>
              <th
                onClick={() => handleSort('payment_form__name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Payment Form{getSortIcon('payment_form__name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                EUR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PYG
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  No expenses found. Create your first expense!
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.expense_type_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.payment_form_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(expense.amount_eur, 'EUR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(expense.amount_pyg, 'PYG')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {expense.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/expenses/${expense.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="text-center py-4">
            <div className="text-gray-600">Loading more expenses...</div>
          </div>
        )}

        {/* End of List Indicator */}
        {!loading && !hasMore && expenses.length > 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            All expenses loaded ({expenses.length} total)
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseList;

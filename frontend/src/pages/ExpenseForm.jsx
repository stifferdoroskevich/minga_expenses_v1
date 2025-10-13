import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  expenseAPI,
  companyAPI,
  paymentFormAPI,
  expenseTypeAPI,
} from '../api/expenses';
import SelectWithCreate from '../components/SelectWithCreate';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [paymentForms, setPaymentForms] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount_eur: '',
    amount_pyg: '',
    company: '',
    payment_form: '',
    expense_type: '',
  });

  useEffect(() => {
    fetchMasterLists();
    if (isEditMode) {
      fetchExpense();
    }
  }, [id]);

  const fetchMasterLists = async () => {
    try {
      const [companiesRes, paymentFormsRes, expenseTypesRes] =
        await Promise.all([
          companyAPI.getAll(),
          paymentFormAPI.getAll(),
          expenseTypeAPI.getAll(),
        ]);

      setCompanies(companiesRes.data.results || companiesRes.data);
      setPaymentForms(paymentFormsRes.data.results || paymentFormsRes.data);
      setExpenseTypes(expenseTypesRes.data.results || expenseTypesRes.data);
    } catch (err) {
      console.error('Failed to load master lists:', err);
      alert('Failed to load form data. Please refresh the page.');
    }
  };

  const handleCreateCompany = async (data) => {
    try {
      const response = await companyAPI.create(data);
      await fetchMasterLists();
      return response.data;
    } catch (err) {
      console.error('Failed to create company:', err);
      throw err;
    }
  };

  const handleCreatePaymentForm = async (data) => {
    try {
      const response = await paymentFormAPI.create(data);
      await fetchMasterLists();
      return response.data;
    } catch (err) {
      console.error('Failed to create payment form:', err);
      throw err;
    }
  };

  const handleCreateExpenseType = async (data) => {
    try {
      const response = await expenseTypeAPI.create(data);
      await fetchMasterLists();
      return response.data;
    } catch (err) {
      console.error('Failed to create expense type:', err);
      throw err;
    }
  };

  const fetchExpense = async () => {
    setLoading(true);
    try {
      const response = await expenseAPI.get(id);
      const expense = response.data;
      setFormData({
        date: expense.date,
        description: expense.description || '',
        amount_eur: expense.amount_eur || '',
        amount_pyg: expense.amount_pyg || '',
        company: expense.company,
        payment_form: expense.payment_form,
        expense_type: expense.expense_type,
      });
    } catch (err) {
      console.error('Failed to load expense:', err);
      alert('Failed to load expense. Redirecting to list...');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.payment_form)
      newErrors.payment_form = 'Payment form is required';
    if (!formData.expense_type)
      newErrors.expense_type = 'Expense type is required';

    // At least one currency must be filled
    if (!formData.amount_eur && !formData.amount_pyg) {
      newErrors.amount_eur = 'At least one currency amount is required';
      newErrors.amount_pyg = 'At least one currency amount is required';
    }

    // Amounts must be positive
    if (formData.amount_eur && parseFloat(formData.amount_eur) <= 0) {
      newErrors.amount_eur = 'EUR amount must be greater than zero';
    }
    if (formData.amount_pyg && parseFloat(formData.amount_pyg) <= 0) {
      newErrors.amount_pyg = 'PYG amount must be greater than zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare data
      const data = {
        ...formData,
        amount_eur: formData.amount_eur || null,
        amount_pyg: formData.amount_pyg || null,
        description: formData.description || null,
      };

      if (isEditMode) {
        await expenseAPI.update(id, data);
      } else {
        await expenseAPI.create(data);
      }

      navigate('/expenses');
    } catch (err) {
      console.error('Failed to save expense:', err);
      if (err.response && err.response.data) {
        setErrors(err.response.data);
      } else {
        alert('Failed to save expense. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading expense...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditMode ? 'Edit Expense' : 'New Expense'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
        {/* Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && (
            <p className="text-red-500 text-sm mt-1">{errors.date}</p>
          )}
        </div>

        {/* Company */}
        <div className="mb-4">
          <SelectWithCreate
            label="Company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            options={companies}
            onCreateNew={handleCreateCompany}
            error={errors.company}
            required={true}
          />
        </div>

        {/* Expense Type */}
        <div className="mb-4">
          <SelectWithCreate
            label="Expense Type"
            name="expense_type"
            value={formData.expense_type}
            onChange={handleChange}
            options={expenseTypes}
            onCreateNew={handleCreateExpenseType}
            error={errors.expense_type}
            required={true}
          />
        </div>

        {/* Payment Form */}
        <div className="mb-4">
          <SelectWithCreate
            label="Payment Form"
            name="payment_form"
            value={formData.payment_form}
            onChange={handleChange}
            options={paymentForms}
            onCreateNew={handleCreatePaymentForm}
            error={errors.payment_form}
            required={true}
          />
        </div>

        {/* Currency Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (EUR)
            </label>
            <input
              type="number"
              name="amount_eur"
              value={formData.amount_eur}
              onChange={handleChange}
              step="0.01"
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount_eur ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amount_eur && (
              <p className="text-red-500 text-sm mt-1">{errors.amount_eur}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (PYG)
            </label>
            <input
              type="number"
              name="amount_pyg"
              value={formData.amount_pyg}
              onChange={handleChange}
              step="1"
              placeholder="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount_pyg ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amount_pyg && (
              <p className="text-red-500 text-sm mt-1">{errors.amount_pyg}</p>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          * At least one currency amount (EUR or PYG) is required
        </p>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            placeholder="Add notes about this expense..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Expense' : 'Create Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  expenseAPI,
  companyAPI,
  paymentFormAPI,
  expenseTypeAPI,
} from '../api/expenses';
import ComboboxField from '../components/ComboboxField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

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
    if (isEditMode) fetchExpense();
  }, [id]);

  const fetchMasterLists = async () => {
    try {
      const [companiesRes, paymentFormsRes, expenseTypesRes] = await Promise.all([
        companyAPI.getAll(),
        paymentFormAPI.getAll(),
        expenseTypeAPI.getAll(),
      ]);
      const sortByName = (a, b) => a.name.localeCompare(b.name);
      setCompanies((companiesRes.data.results || companiesRes.data).sort(sortByName));
      setPaymentForms((paymentFormsRes.data.results || paymentFormsRes.data).sort(sortByName));
      setExpenseTypes((expenseTypesRes.data.results || expenseTypesRes.data).sort(sortByName));
    } catch (err) {
      console.error('Failed to load master lists:', err);
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
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.payment_form) newErrors.payment_form = 'Payment form is required';
    if (!formData.expense_type) newErrors.expense_type = 'Expense type is required';
    if (!formData.amount_eur && !formData.amount_pyg) {
      newErrors.amount_eur = 'At least one currency amount is required';
      newErrors.amount_pyg = 'At least one currency amount is required';
    }
    if (formData.amount_eur && parseFloat(formData.amount_eur) <= 0)
      newErrors.amount_eur = 'EUR amount must be greater than zero';
    if (formData.amount_pyg && parseFloat(formData.amount_pyg) <= 0)
      newErrors.amount_pyg = 'PYG amount must be greater than zero';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    try {
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
      if (err.response?.data) {
        setErrors(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (data) => {
    const response = await companyAPI.create(data);
    await fetchMasterLists();
    return response.data;
  };

  const handleCreatePaymentForm = async (data) => {
    const response = await paymentFormAPI.create(data);
    await fetchMasterLists();
    return response.data;
  };

  const handleCreateExpenseType = async (data) => {
    const response = await expenseTypeAPI.create(data);
    await fetchMasterLists();
    return response.data;
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading expense...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/expenses')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'Edit Expense' : 'New Expense'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground font-normal">
            {isEditMode ? 'Update the expense details below.' : 'Fill in the details for the new expense.'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && (
                <p className="text-destructive text-sm">{errors.date}</p>
              )}
            </div>

            <Separator />

            {/* Selects */}
            <ComboboxField
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              options={companies}
              onCreateNew={handleCreateCompany}
              error={errors.company}
              required
            />

            <ComboboxField
              label="Expense Type"
              name="expense_type"
              value={formData.expense_type}
              onChange={handleChange}
              options={expenseTypes}
              onCreateNew={handleCreateExpenseType}
              error={errors.expense_type}
              required
            />

            <ComboboxField
              label="Payment Form"
              name="payment_form"
              value={formData.payment_form}
              onChange={handleChange}
              options={paymentForms}
              onCreateNew={handleCreatePaymentForm}
              error={errors.payment_form}
              required
            />

            <Separator />

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount_eur">Amount (EUR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <Input
                    id="amount_eur"
                    type="number"
                    name="amount_eur"
                    value={formData.amount_eur}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="0.00"
                    className={`pl-7 ${errors.amount_eur ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.amount_eur && (
                  <p className="text-destructive text-sm">{errors.amount_eur}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount_pyg">Amount (PYG)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₲</span>
                  <Input
                    id="amount_pyg"
                    type="number"
                    name="amount_pyg"
                    value={formData.amount_pyg}
                    onChange={handleChange}
                    step="1"
                    placeholder="0"
                    className={`pl-7 ${errors.amount_pyg ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.amount_pyg && (
                  <p className="text-destructive text-sm">{errors.amount_pyg}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              At least one currency amount (EUR or PYG) is required.
            </p>

            <Separator />

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add notes about this expense..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/expenses')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseForm;

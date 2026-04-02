import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { expenseAPI } from '../api/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Upload,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';

const ExpenseList = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
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
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const orderingParam = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const params = { ...filterParams, page_size: 100, page, ordering: orderingParam };
      const response = await expenseAPI.getAll(params);
      if (append) {
        setExpenses((prev) => [...prev, ...(response.data.results || response.data)]);
      } else {
        setExpenses(response.data.results || response.data);
      }
      setHasMore(!!response.data.next);
      setNextPage(response.data.next ? page + 1 : null);
    } catch (err) {
      setError('Failed to load expenses.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getFilterParams = () => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.date__gte) params.date__gte = filters.date__gte;
    if (filters.date__lte) params.date__lte = filters.date__lte;
    return params;
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight * 1.2 && !loadingMore && hasMore && nextPage) {
      fetchExpenses(getFilterParams(), nextPage, true);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchExpenses(getFilterParams());
  };

  const handleSort = (field) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    fetchExpenses(getFilterParams());
  };

  const confirmDelete = async () => {
    try {
      await expenseAPI.delete(deleteId);
      setDeleteId(null);
      fetchExpenses(getFilterParams());
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.date__gte) params.append('date_from', filters.date__gte);
    if (filters.date__lte) params.append('date_to', filters.date__lte);
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'}analytics/export-csv/?${params.toString()}`;
    fetch(url, { headers: { Authorization: `Token ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = 'expenses_export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Failed to export CSV'));
  };

  const formatCurrency = (amount, currency) => {
    if (!amount) return null;
    if (currency === 'EUR') return `€${parseFloat(amount).toFixed(2)}`;
    if (currency === 'PYG') return `₲${parseInt(amount).toLocaleString()}`;
    return amount;
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading expenses...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => fetchExpenses()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="hidden sm:flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/expenses/import">
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button size="sm" onClick={() => navigate('/expenses/new')}>
            <Plus className="h-4 w-4 mr-1.5" />
            New
          </Button>
        </div>
        {/* Mobile action row */}
        <div className="flex sm:hidden gap-2">
          <Button variant="outline" size="icon" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link to="/expenses/import"><Upload className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search company, type, description..."
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          name="date__gte"
          value={filters.date__gte}
          onChange={(e) => setFilters((p) => ({ ...p, date__gte: e.target.value }))}
          className="sm:w-40"
        />
        <Input
          type="date"
          name="date__lte"
          value={filters.date__lte}
          onChange={(e) => setFilters((p) => ({ ...p, date__lte: e.target.value }))}
          className="sm:w-40"
        />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {/* Table */}
      <div
        ref={tableContainerRef}
        onScroll={handleScroll}
        className="rounded-md border overflow-auto max-h-[calc(100vh-320px)]"
      >
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <TableRow>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('date')}
              >
                <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('company__name')}
              >
                <span className="flex items-center gap-1">Company <SortIcon field="company__name" /></span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hidden md:table-cell"
                onClick={() => handleSort('expense_type__name')}
              >
                <span className="flex items-center gap-1">Type <SortIcon field="expense_type__name" /></span>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Payment</TableHead>
              <TableHead className="text-right">EUR</TableHead>
              <TableHead className="text-right">PYG</TableHead>
              <TableHead className="hidden lg:table-cell">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  No expenses found. Tap + to add your first one.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id} className="group">
                  <TableCell className="whitespace-nowrap text-sm">
                    {expense.date}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {expense.company_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="font-normal text-xs">
                      {expense.expense_type_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {expense.payment_form_name}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatCurrency(expense.amount_eur, 'EUR') ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatCurrency(expense.amount_pyg, 'PYG') ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                    {expense.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                        <Link to={`/expenses/${expense.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {loadingMore && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading more...
          </div>
        )}
        {!loading && !hasMore && expenses.length > 0 && (
          <div className="text-center py-3 text-xs text-muted-foreground border-t">
            All {expenses.length} expenses loaded
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseList;

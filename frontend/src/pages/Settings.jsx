import { useState, useEffect } from 'react';
import { companyAPI, paymentFormAPI, expenseTypeAPI } from '../api/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Pencil, Trash2, Building2, CreditCard, Tag } from 'lucide-react';

const TABS = [
  { key: 'companies', label: 'Companies', icon: Building2, api: companyAPI },
  { key: 'paymentForms', label: 'Payment Forms', icon: CreditCard, api: paymentFormAPI },
  { key: 'expenseTypes', label: 'Expense Types', icon: Tag, api: expenseTypeAPI },
];

const Settings = () => {
  const [data, setData] = useState({ companies: [], paymentForms: [], expenseTypes: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');

  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, eRes] = await Promise.all([
        companyAPI.getAll(),
        paymentFormAPI.getAll(),
        expenseTypeAPI.getAll(),
      ]);
      const sort = (a, b) => a.name.localeCompare(b.name);
      setData({
        companies: (cRes.data.results || cRes.data).sort(sort),
        paymentForms: (pRes.data.results || pRes.data).sort(sort),
        expenseTypes: (eRes.data.results || eRes.data).sort(sort),
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentAPI = () => TABS.find((t) => t.key === activeTab)?.api;
  const currentList = () => data[activeTab] || [];

  const openEdit = (item = null) => {
    setEditingItem(item);
    setFormData({ name: item?.name || '', description: item?.description || '' });
    setFormErrors({});
    setEditDialog(true);
  };

  const closeEdit = () => {
    setEditDialog(false);
    setEditingItem(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      const api = currentAPI();
      const payload = { name: formData.name.trim(), description: formData.description || null };
      if (editingItem) {
        await api.update(editingItem.id, payload);
      } else {
        await api.create(payload);
      }
      await fetchAll();
      closeEdit();
    } catch (err) {
      if (err.response?.data) setFormErrors(err.response.data);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await currentAPI().delete(deletingItem.id);
      await fetchAll();
      setDeleteDialog(false);
      setDeletingItem(null);
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete. This item may be in use by expenses.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your master lists.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-1.5">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => openEdit()}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add {tab.label.replace(/s$/, '')}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentList().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                          No items yet. Add your first one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentList().map((item) => (
                        <TableRow key={item.id} className="group">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {item.description || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => { setDeletingItem(item); setDeleteDialog(true); }}
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
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit / Create dialog */}
      <Dialog open={editDialog} onOpenChange={closeEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'}{' '}
              {TABS.find((t) => t.key === activeTab)?.label.replace(/s$/, '')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter name"
                autoFocus
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-destructive text-sm">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                Description{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Add description..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialog} onOpenChange={() => setDeleteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deletingItem?.name}"?</DialogTitle>
            <DialogDescription>
              This cannot be undone. If this item is linked to any expenses, deletion will fail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;

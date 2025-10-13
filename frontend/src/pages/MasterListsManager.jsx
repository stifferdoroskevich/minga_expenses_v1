import { useState, useEffect } from 'react';
import { companyAPI, paymentFormAPI, expenseTypeAPI } from '../api/expenses';
import Modal from '../components/Modal';

const MasterListsManager = () => {
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [paymentForms, setPaymentForms] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [companiesRes, paymentFormsRes, expenseTypesRes] = await Promise.all([
        companyAPI.getAll(),
        paymentFormAPI.getAll(),
        expenseTypeAPI.getAll(),
      ]);

      // Sort all lists alphabetically by name
      const sortByName = (a, b) => a.name.localeCompare(b.name);

      setCompanies((companiesRes.data.results || companiesRes.data).sort(sortByName));
      setPaymentForms((paymentFormsRes.data.results || paymentFormsRes.data).sort(sortByName));
      setExpenseTypes((expenseTypesRes.data.results || expenseTypesRes.data).sort(sortByName));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAPI = () => {
    switch (activeTab) {
      case 'companies':
        return companyAPI;
      case 'paymentForms':
        return paymentFormAPI;
      case 'expenseTypes':
        return expenseTypeAPI;
      default:
        return companyAPI;
    }
  };

  const getCurrentList = () => {
    switch (activeTab) {
      case 'companies':
        return companies;
      case 'paymentForms':
        return paymentForms;
      case 'expenseTypes':
        return expenseTypes;
      default:
        return [];
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '' });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }

    try {
      const api = getCurrentAPI();
      const data = {
        name: formData.name,
        description: formData.description || null,
      };

      if (editingItem) {
        await api.update(editingItem.id, data);
      } else {
        await api.create(data);
      }

      await fetchAllData();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save:', err);
      if (err.response?.data) {
        setFormErrors(err.response.data);
      } else {
        alert('Failed to save. Please try again.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const api = getCurrentAPI();
      await api.delete(id);
      await fetchAllData();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete. This item may be in use by expenses.');
    }
  };

  const tabs = [
    { key: 'companies', label: 'Companies', icon: '🏢' },
    { key: 'paymentForms', label: 'Payment Forms', icon: '💳' },
    { key: 'expenseTypes', label: 'Expense Types', icon: '📁' },
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Master Lists</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Add Button */}
      <div className="mb-4">
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add New
        </button>
      </div>

      {/* List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
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
            {getCurrentList().length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                  No items found. Add your first item!
                </td>
              </tr>
            ) : (
              getCurrentList().map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter name"
            />
            {formErrors.name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add description..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterListsManager;

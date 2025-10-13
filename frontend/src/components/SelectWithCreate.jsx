import { useState } from 'react';
import Modal from './Modal';

const SelectWithCreate = ({
  label,
  name,
  value,
  onChange,
  options,
  onCreateNew,
  error,
  required = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newItemName.trim()) {
      setCreateError('Name is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      console.log('Creating new item:', { name: newItemName.trim(), description: newItemDescription.trim() || null });
      const newItem = await onCreateNew({
        name: newItemName.trim(),
        description: newItemDescription.trim() || null,
      });
      console.log('Created item:', newItem);

      // Set the newly created item as selected
      onChange({ target: { name, value: newItem.id } });

      // Close modal and reset
      setIsModalOpen(false);
      setNewItemName('');
      setNewItemDescription('');
    } catch (err) {
      console.error('Failed to create:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.name?.[0]
        || err.response?.data?.detail
        || err.message
        || 'Failed to create item';
      setCreateError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewItemName('');
    setNewItemDescription('');
    setCreateError('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
          title="Add new"
        >
          + New
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Add New ${label}`}
      >
        <form onSubmit={handleCreate}>
          {createError && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
              {createError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add description..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className={`px-4 py-2 rounded-md text-white ${
                creating
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SelectWithCreate;

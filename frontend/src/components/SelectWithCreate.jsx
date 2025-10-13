import { useState, useRef, useEffect } from 'react';
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

  // Search/autocomplete state
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newItemName.trim()) {
      setCreateError('Name is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const newItem = await onCreateNew({
        name: newItemName.trim(),
        description: newItemDescription.trim() || null,
      });

      // Set the newly created item as selected
      onChange({ target: { name, value: newItem.id } });

      // Close modal and reset
      setIsModalOpen(false);
      setNewItemName('');
      setNewItemDescription('');
    } catch (err) {
      console.error('Failed to create:', err);
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

  // Get the selected option's name for display
  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = selectedOption ? selectedOption.name : '';

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update search term when value changes externally
  useEffect(() => {
    if (value && selectedOption) {
      setSearchTerm(selectedOption.name);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedOption]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    // Clear selection if user clears the input
    if (!newValue) {
      onChange({ target: { name, value: '' } });
    }
  };

  const handleOptionSelect = (option) => {
    setSearchTerm(option.name);
    onChange({ target: { name, value: option.id } });
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsDropdownOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Type to search..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            autoComplete="off"
          />

          {/* Dropdown list */}
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.id}
                    onClick={() => handleOptionSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 cursor-pointer ${
                      highlightedIndex === index
                        ? 'bg-blue-100'
                        : value === option.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {option.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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

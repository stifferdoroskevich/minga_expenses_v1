import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const ImportExpenses = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Results
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState({
    date: null,
    description: null,
    amount_eur: null,
    amount_pyg: null,
    company: null,
    payment_form: null,
    expense_type: null,
  });
  const [importResults, setImportResults] = useState(null);

  const systemFields = [
    { key: 'date', label: 'Date', required: true },
    { key: 'company', label: 'Company', required: true },
    { key: 'expense_type', label: 'Expense Type', required: true },
    { key: 'payment_form', label: 'Payment Form', required: true },
    { key: 'amount_eur', label: 'Amount EUR', required: false },
    { key: 'amount_pyg', label: 'Amount PYG', required: false },
    { key: 'description', label: 'Description', required: false },
  ];

  // Common Spanish to English mapping
  const defaultMapping = {
    'fecha': 'date',
    'fec': 'date',
    'date': 'date',
    'descripción': 'description',
    'descripcion': 'description',
    'obs': 'description',
    'observaciones': 'description',
    'description': 'description',
    'eur': 'amount_eur',
    'euros': 'amount_eur',
    'euro': 'amount_eur',
    'pyg': 'amount_pyg',
    'gs': 'amount_pyg',
    'guaranies': 'amount_pyg',
    'guaraníes': 'amount_pyg',
    'empresa': 'company',
    'company': 'company',
    'fp': 'payment_form',
    'forma de pago': 'payment_form',
    'payment form': 'payment_form',
    'tipo': 'expense_type',
    'tipo de gasto': 'expense_type',
    'expense type': 'expense_type',
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      if (extension !== 'xlsx' && extension !== 'csv') {
        alert('Please upload an Excel (.xlsx) or CSV (.csv) file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('import/preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(response.data);

      // Auto-detect column mapping based on headers
      const detectedMapping = { ...mapping };
      response.data.headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        const systemField = defaultMapping[normalizedHeader];
        if (systemField) {
          detectedMapping[systemField] = index;
        }
      });
      setMapping(detectedMapping);

      setStep(2);
    } catch (err) {
      console.error('Upload failed:', err);
      alert(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (systemField, columnIndex) => {
    setMapping((prev) => ({
      ...prev,
      [systemField]: columnIndex === '' ? null : parseInt(columnIndex),
    }));
  };

  const handleImport = async () => {
    // Validate required fields are mapped
    const requiredFields = systemFields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => mapping[f.key] === null);

    if (missingFields.length > 0) {
      alert(
        `Please map the following required fields: ${missingFields
          .map((f) => f.label)
          .join(', ')}`
      );
      return;
    }

    // Check at least one amount field is mapped
    if (mapping.amount_eur === null && mapping.amount_pyg === null) {
      alert('Please map at least one amount field (EUR or PYG)');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const response = await apiClient.post('import/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResults(response.data);
      setStep(3);
    } catch (err) {
      console.error('Import failed:', err);
      alert(err.response?.data?.error || 'Failed to import expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    navigate('/expenses');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Import Expenses</h1>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Upload File', 'Map Columns', 'Results'].map((label, index) => (
            <div key={index} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step > index + 1
                    ? 'bg-green-600 text-white'
                    : step === index + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step > index + 1 ? '✓' : index + 1}
              </div>
              <div
                className={`ml-2 text-sm font-medium ${
                  step === index + 1 ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {label}
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step > index + 1 ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Step 1: Select File to Import
          </h2>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Upload an Excel (.xlsx) or CSV (.csv) file containing your expenses.
              The file should have a header row with column names.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>For Excel files:</strong> We'll look for a sheet named "transacciones".
              If not found, we'll use the first sheet.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose File
            </label>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`px-6 py-2 rounded-md text-white ${
              !file || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Uploading...' : 'Next: Map Columns'}
          </button>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && previewData && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Step 2: Map Columns to Fields
          </h2>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              File: <span className="font-medium">{file.name}</span>
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Sheet: <span className="font-medium">{previewData.sheet_name}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Total rows: <span className="font-medium">{previewData.total_rows}</span>
            </p>
            <p className="text-sm text-gray-500 italic">
              Map each system field to the corresponding column in your file. Fields marked
              with * are required.
            </p>
          </div>

          {/* Column Mapping */}
          <div className="mb-6 space-y-4">
            {systemFields.map((field) => (
              <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapping[field.key] !== null ? mapping[field.key] : ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Not Mapped --</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      Column {String.fromCharCode(65 + index)}: {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview Data */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Preview (First 5 Rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {String.fromCharCode(65 + index)}: {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.preview_rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {cell !== null && cell !== undefined ? String(cell) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className={`px-6 py-2 rounded-md text-white ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Importing...' : 'Import Expenses'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResults && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Step 3: Import Complete
          </h2>

          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Total Rows</div>
                <div className="text-2xl font-bold text-blue-900">
                  {importResults.total_rows}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Successful</div>
                <div className="text-2xl font-bold text-green-900">
                  {importResults.successful}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 mb-1">Errors</div>
                <div className="text-2xl font-bold text-red-900">
                  {importResults.errors.length}
                </div>
              </div>
            </div>

            {/* Master Lists Created */}
            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">
                New Master List Items Created
              </h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-purple-600">Companies:</span>{' '}
                  <span className="font-medium">
                    {importResults.master_lists_created.companies}
                  </span>
                </div>
                <div>
                  <span className="text-purple-600">Payment Forms:</span>{' '}
                  <span className="font-medium">
                    {importResults.master_lists_created.payment_forms}
                  </span>
                </div>
                <div>
                  <span className="text-purple-600">Expense Types:</span>{' '}
                  <span className="font-medium">
                    {importResults.master_lists_created.expense_types}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {importResults.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3">Errors</h3>
                <div className="bg-red-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  {importResults.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleFinish}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Expenses
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportExpenses;

const MasterLists = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Master Lists</h1>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <p className="text-gray-600 mb-4">
          Manage your master lists (Companies, Payment Forms, and Expense Types) through the Django Admin interface for now.
        </p>
        <a
          href="/admin/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Open Django Admin
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Companies</h2>
          <p className="text-gray-600">Manage the list of companies/merchants where expenses are made.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Payment Forms</h2>
          <p className="text-gray-600">Manage payment methods like Cash, Credit Card, Bank Transfer, etc.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Expense Types</h2>
          <p className="text-gray-600">Manage expense categories like Food, Transport, Utilities, etc.</p>
        </div>
      </div>
    </div>
  );
};

export default MasterLists;

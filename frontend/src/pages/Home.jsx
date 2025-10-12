import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to Minga Expenses
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Track your expenses with dual currency support (EUR/PYG)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
        <Link
          to="/expenses"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="text-blue-600 text-4xl mb-2">📊</div>
          <h2 className="text-xl font-semibold mb-2">View Expenses</h2>
          <p className="text-gray-600">Browse and filter all your expenses</p>
        </Link>

        <Link
          to="/expenses/new"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="text-green-600 text-4xl mb-2">➕</div>
          <h2 className="text-xl font-semibold mb-2">Add Expense</h2>
          <p className="text-gray-600">Record a new expense entry</p>
        </Link>

        <Link
          to="/master-lists"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="text-purple-600 text-4xl mb-2">📋</div>
          <h2 className="text-xl font-semibold mb-2">Master Lists</h2>
          <p className="text-gray-600">Manage companies, payment forms, and expense types</p>
        </Link>
      </div>
    </div>
  );
};

export default Home;

// src/pages/AdminDashboard.tsx

import { Link, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectCurrentUser } from "../features/auth/authSlice";
import { clearCart } from "../features/cart/cartSlice";

export function AdminDashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const location = useLocation(); // Hook to get the current URL

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart()); // Good practice to clear cart on admin logout too
  };

  // Helper function to determine if a link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-800 text-white flex">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-gray-900 p-4 flex flex-col">
        <div>
          <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
          <p className="text-sm text-gray-400 mb-8">Welcome, {user?.email}</p>

          <ul className="space-y-2">
            <li>
              <Link
                to="/admin/products"
                className={`block py-2 px-4 rounded transition-colors ${
                  isActive("/admin/products")
                    ? "bg-blue-600"
                    : "hover:bg-gray-700"
                }`}
              >
                Manage Products
              </Link>
            </li>
            <li>
              <Link
                to="/admin/inventory"
                className={`block py-2 px-4 rounded transition-colors ${
                  isActive("/admin/inventory")
                    ? "bg-blue-600"
                    : "hover:bg-gray-700"
                }`}
              >
                Inventory Insights
              </Link>
            </li>
          </ul>
        </div>

        {/* Logout button at the bottom of the sidebar */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* The Outlet component renders the matched child route (e.g., AdminProductPage) */}
        <Outlet />
      </main>
    </div>
  );
}

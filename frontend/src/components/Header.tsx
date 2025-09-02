// src/components/Header.tsx - Final Simplified Version

import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectCartItemCount } from "../features/cart/cartSlice";
import { logout } from "../features/auth/authSlice";
import { clearCart } from "../features/cart/cartSlice";

// 1. The 'showBackButton' prop is no longer needed.
interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const itemCount = useSelector(selectCartItemCount);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
  };

  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        {/* 2. This is now always a Link to the homepage. */}
        <Link to="/" className="text-2xl sm:text-3xl font-bold text-gray-800">
          Fusion E-commerce
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* 3. We can always show "My Orders" now. */}
          <Link to="/orders" className="text-base hover:text-blue-600">
            My Orders
          </Link>
          <button
            onClick={onCartClick}
            className="relative cursor-pointer text-base"
          >
            <span>Cart ({itemCount})</span>
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

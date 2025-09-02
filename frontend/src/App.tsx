// src/App.tsx - CORRECTED AND COMPLETE

import { useState } from "react"; // 1. Import useState
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectToken, selectCurrentUser } from "./features/auth/authSlice";
import { clearCart } from "./features/cart/cartSlice";

// Import all your pages and global components
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { OrderHistoryPage } from "./pages/OrderHistoryPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminProductPage } from "./pages/AdminProductPage";
import { AdminChatPage } from "./pages/AdminChatPage";
import { AdminInventoryPage } from "./pages/AdminInventoryPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { Cart } from "./components/Cart";
import { CheckoutModal } from "./components/CheckoutModal";
import { PaymentSuccess } from "./components/PaymentSuccess";
import { ChatWidget } from "./components/ChatWidget";

function App() {
  const token = useSelector(selectToken);
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  // 2. Add the state management for modals here, at the top level
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // 3. Add the handler functions here
  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    dispatch(clearCart());
    setIsCheckoutOpen(false);
    setShowPaymentSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowPaymentSuccess(false);
  };

  return (
    <BrowserRouter>
      {/* 4. Render the global components for logged-in users */}
      {/* These now live outside the <Routes> so they are always available */}
      {token && !user?.is_staff && (
        <>
          <Cart
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onCheckout={handleProceedToCheckout}
          />
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onPaymentSuccess={handlePaymentSuccess}
          />
          {showPaymentSuccess && (
            <PaymentSuccess onClose={handleCloseSuccess} />
          )}
          <ChatWidget />
        </>
      )}

      <Routes>
        {/* If there is NO token, only the LoginPage is accessible */}
        {!token && (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}

        {/* If there IS a token, check if the user is an admin */}
        {token && user?.is_staff && (
          <>
            <Route path="/admin" element={<AdminDashboard />}>
              <Route
                index
                element={
                  <p className="text-center text-lg text-gray-400">
                    Welcome, Admin! Select an option from the sidebar.
                  </p>
                }
              />
              <Route path="chats" element={<AdminChatPage />} />
              <Route path="products" element={<AdminProductPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" />} />
          </>
        )}

        {/* If there IS a token and the user is NOT an admin */}
        {token && !user?.is_staff && (
          <>
            {/* 5. Pass the onCartClick prop down to each page component */}
            <Route
              path="/"
              element={<HomePage onCartClick={() => setIsCartOpen(true)} />}
            />
            <Route
              path="/orders"
              element={
                <OrderHistoryPage onCartClick={() => setIsCartOpen(true)} />
              }
            />
            <Route
              path="/product/:productId"
              element={
                <ProductDetailPage onCartClick={() => setIsCartOpen(true)} />
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

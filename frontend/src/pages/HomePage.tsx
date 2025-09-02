// src/pages/HomePage.tsx

import { useState } from "react";
import { useDispatch } from "react-redux";
import { ProductList } from "../components/ProductList";
import { Cart } from "../components/Cart";
import { CheckoutModal } from "../components/CheckoutModal";
import { PaymentSuccess } from "../components/PaymentSuccess";
import { ChatWidget } from "../components/ChatWidget";
import { clearCart } from "../features/cart/cartSlice";
import { Header } from "../components/Header";

interface HomePageProps {
  onCartClick: () => void;
}

export function HomePage({ onCartClick }: HomePageProps) {
  const dispatch = useDispatch();

  // State for managing the visibility of our modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Handlers are now more focused on the page's logic
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onCartClick={onCartClick} />

      <main className="flex-grow  flex flex-col container mx-auto px-4 py-6">
        <ProductList />
      </main>

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

      {showPaymentSuccess && <PaymentSuccess onClose={handleCloseSuccess} />}

      <ChatWidget />
    </div>
  );
}

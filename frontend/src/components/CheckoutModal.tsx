// src/components/CheckoutModal.tsx

import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCartItems, selectCartTotal } from "../features/cart/cartSlice";
import { CheckoutForm } from "./CheckoutForm"; // 1. Import the new form

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void; // Optional callback for payment success
}

export function CheckoutModal({
  isOpen,
  onClose,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const cartItems = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);

  if (!isOpen) {
    return null;
  }

  // No more paymentSuccess or isProcessing state needed here!

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Checkout</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-medium mb-4">Order Summary</h3>
          <div className="space-y-2 mb-6 bg-gray-50 p-4 rounded-md">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.name} (x{item.quantity})
                </span>
                <span>
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <h3 className="text-xl font-medium mb-4">Payment Information</h3>

          {/* 2. Render the CheckoutForm component */}
          <CheckoutForm onPaymentSuccess={onPaymentSuccess} />
        </div>
      </div>
    </div>
  );
}

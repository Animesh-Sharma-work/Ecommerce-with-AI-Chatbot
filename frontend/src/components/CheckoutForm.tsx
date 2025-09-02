import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useSelector } from "react-redux";
import { selectCartItems, selectCartTotal } from "../features/cart/cartSlice";
import { useCreatePaymentIntentMutation } from "../features/api/apiSlice";

interface CheckoutFormProps {
  onPaymentSuccess?: () => void;
}

// It's a good practice to define a type for the expected API error shape
interface ApiError {
  status: number;
  data: {
    error?: string;
    // Add other potential error fields from your backend here
  };
}

// A "type guard" to check if an unknown error is an ApiError
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "data" in error
  );
}

export function CheckoutForm({ onPaymentSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const cartItems = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  //  Initialize the mutation hook
  const [createPaymentIntent] = useCreatePaymentIntentMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);

    // 3. Call the backend to create the Payment Intent
    try {
      // 1. Call the mutation and '.unwrap()'. This will throw an error on failure.
      const data = await createPaymentIntent({ items: cartItems }).unwrap();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        // This case is unlikely but good to have
        throw new Error("Card element not found");
      }

      // 2. Use the clientSecret to confirm the payment
      const { error: paymentError } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: { card: cardElement },
        }
      );

      if (paymentError) {
        // If Stripe itself returns an error (e.g., insufficient funds)
        throw new Error(
          paymentError.message || "An unexpected error occurred during payment."
        );
      }

      // 3. If we reach here, everything was successful
      console.log("Payment successful!");
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err) {
      // 'err' is of type 'unknown'
      console.error("Payment failed:", err);
      let message = "An unknown error occurred.";

      if (isApiError(err)) {
        // We now know 'err' is an ApiError, so we can safely access its properties
        message = err.data.error || "Could not process payment.";
      } else if (err instanceof Error) {
        // Handle standard JavaScript errors (like the ones we throw manually)
        message = err.message;
      }

      setErrorMessage(message);
    } finally {
      // 5. This block always runs, ensuring the button is re-enabled
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 bg-white p-4 border rounded-md">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>

      {errorMessage && (
        <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
      >
        {isProcessing ? "Processing..." : `Pay $${cartTotal.toFixed(2)}`}
      </button>
    </form>
  );
}

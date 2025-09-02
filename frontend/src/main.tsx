import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 1. Import Provider and the store
import { Provider } from "react-redux";
import { store } from "./app/store.ts";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import { GoogleOAuthProvider } from "@react-oauth/google";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ADD THIS LINE FOR PROOF
console.log("CLIENT ID LOADED BY VITE:", googleClientId);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        <Elements stripe={stripePromise}>
          <App />
        </Elements>
      </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

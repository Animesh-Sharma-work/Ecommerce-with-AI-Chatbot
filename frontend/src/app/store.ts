import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "../features/api/apiSlice";
import cartReducer from "../features/cart/cartSlice";
import authReducer from "../features/auth/authSlice";
import chatReducer from "../features/chat/chatSlice";
import {
  loadCartState,
  saveCartState,
  loadAuthState,
  saveAuthState,
  loadUserState,
  saveUserState,
  loadRefreshToken,
  saveRefreshToken,
} from "../utils/localStorage";

const preloadedState = {
  cart: {
    items: loadCartState() || [],
  },
  auth: {
    accessToken: loadAuthState(),
    refreshToken: loadRefreshToken(),
    user: loadUserState() || null,
  },
};

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    cart: cartReducer,
    auth: authReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  preloadedState,
});

// 3. Subscribe to store updates to save both cart and auth state
store.subscribe(() => {
  const state = store.getState();
  saveCartState(state.cart.items);
  saveAuthState(state.auth.accessToken);
  saveRefreshToken(state.auth.refreshToken);
  saveUserState(state.auth.user); // Save the user state
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

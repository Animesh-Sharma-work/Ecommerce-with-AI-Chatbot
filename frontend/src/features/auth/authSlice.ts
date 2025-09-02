// src/features/auth/authSlice.ts
// NOTE: This is a placeholder. We will implement the full login flow later.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { jwtDecode } from "jwt-decode";

// This is the shape of the data from our login/refresh endpoints
interface AuthResponse {
  access: string;
  refresh: string;
}

// This interface represents the actual payload of our JWT
interface DecodedToken {
  user_id: number;
  email: string;
  is_staff: boolean;
  // It also has 'exp' and 'jti', but we only need these
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: DecodedToken | null; // Use the more accurate DecodedToken type // Store user info
}

const initialState: AuthState = {
  accessToken: null, // Initially, the user is not logged in
  refreshToken: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      state.user = jwtDecode<DecodedToken>(action.payload.access);
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null; //clear or logout
      state.user = null;
    },
  },
});

export const { setToken, logout } = authSlice.actions;

export const selectToken = (state: RootState) => state.auth.accessToken;
// New selector for the user object
export const selectCurrentUser = (state: RootState) => state.auth.user;

export default authSlice.reducer;

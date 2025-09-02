// src/utils/localStorage.ts - CORRECTED AND ROBUST

import type { CartItem } from "../types";

type StoredUser = { user_id: number; email: string; is_staff: boolean } | null;

// A generic loader function to avoid repetition
function loadItem<T>(key: string): T | null {
  try {
    const serializedState = localStorage.getItem(key);
    // If nothing is there, or it's the string "undefined", return null
    if (serializedState === null || serializedState === "undefined") {
      return null;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error(
      `Could not load state for key "${key}" from localStorage`,
      err
    );
    return null; // Return null on any parsing error
  }
}

// A generic save function
function saveItem<T>(key: string, state: T) {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (err) {
    console.error(`Could not save state for key "${key}" to localStorage`, err);
  }
}

// --- Cart State ---
export const loadCartState = (): CartItem[] =>
  loadItem<CartItem[]>("cartItems") || [];
export const saveCartState = (state: CartItem[]) =>
  saveItem("cartItems", state);

// --- Auth Token State ---
export const loadAuthState = (): string | null => loadItem<string>("authToken");
export const saveAuthState = (token: string | null) =>
  saveItem("authToken", token);

// --- Refresh Token State ---
export const loadRefreshToken = (): string | null =>
  loadItem<string>("refreshToken");
export const saveRefreshToken = (token: string | null) =>
  saveItem("refreshToken", token);

// --- User State ---
export const loadUserState = (): StoredUser | null =>
  loadItem<StoredUser>("authUser");
export const saveUserState = (user: StoredUser) => saveItem("authUser", user);

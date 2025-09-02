// src/pages/LoginPage.tsx

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import {
  useGoogleLoginMutation,
  useLoginMutation,
  useRegisterMutation,
} from "../features/api/apiSlice";
import { setToken } from "../features/auth/authSlice";

export function LoginPage() {
  const dispatch = useDispatch();
  const [mode, setMode] = useState<"Login" | "Sign Up">("Login");

  const [googleLogin, { isLoading: isGoogleLoading }] =
    useGoogleLoginMutation();
  const [login, { isLoading: isLoginLoading, error: loginError }] =
    useLoginMutation();
  const [register, { isLoading: isRegisterLoading, error: registerError }] =
    useRegisterMutation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    const googleToken = credentialResponse.credential;
    if (googleToken) {
      try {
        const authResponse = await googleLogin({ token: googleToken }).unwrap();
        dispatch(setToken(authResponse));
      } catch (err) {
        console.error("Failed to login with Google:", err);
      }
    } else {
      console.error("Google login succeeded but did not return a credential.");
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "Login") {
        const { email, password } = formData;
        const authResponse = await login({ email, password }).unwrap();
        dispatch(setToken(authResponse));
      } else {
        // 'Sign Up' mode
        await register(formData).unwrap();
        // After successful registration, automatically log the user in
        const { email, password } = formData;
        const authResponse = await login({ email, password }).unwrap();
        dispatch(setToken(authResponse));
      }
    } catch (err) {
      console.error(`Failed to ${mode}:`, err);
    }
  };

  const isLoading = isGoogleLoading || isLoginLoading || isRegisterLoading;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          {mode}
        </h2>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {mode === "Sign Up" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                name="first_name"
                type="text"
                placeholder="First Name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                name="last_name"
                type="text"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />

          {mode === "Sign Up" && (
            <input
              name="password2"
              type="password"
              placeholder="Confirm Password"
              value={formData.password2}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          )}

          {loginError && mode === "Login" && (
            <p className="text-sm text-red-500 text-center">
              Login failed. Please check your credentials.
            </p>
          )}
          {registerError && mode === "Sign Up" && (
            <p className="text-sm text-red-500 text-center">
              Registration failed. The email may already be in use.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Processing..." : mode}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {mode === "Login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              onClick={() => setMode(mode === "Login" ? "Sign Up" : "Login")}
              className="font-medium text-blue-600 hover:text-blue-500 ml-1"
            >
              {mode === "Login" ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="flex justify-center">
          {isLoading ? (
            <p className="text-sm text-gray-500">Please wait...</p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.error("Google login failed.")}
              useOneTap
            />
          )}
        </div>
      </div>
    </div>
  );
}

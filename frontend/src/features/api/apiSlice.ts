// src/features/api/apiSlice.ts - FINAL VERSION WITH TOKEN REFRESH

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
// 1. Import the necessary types for the re-authentication wrapper
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import type {
  Product,
  CartItem,
  User,
  Category,
  ProductFormData,
  Order,
  PaginatedResponse,
  Message,
  AIGeneratedContent,
  Review,
  ProductInventoryInsight,
} from "../../types";
import type { RootState } from "../../app/store";
import { setToken } from "../auth/authSlice"; // 2. Import the setToken action

// Define a type for our token response
interface AuthResponse {
  refresh: string;
  access: string;
}

interface ChatUser {
  id: number;
  email: string;
}

// 3. Define the original base query
const baseQuery = fetchBaseQuery({
  baseUrl: "http://127.0.0.1:8000/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// 4. Create the wrapper function that adds the re-authentication logic
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // If we receive a 401 error, it means our access token is expired
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;

    if (refreshToken) {
      // Try to get a new access token using the refresh token
      const refreshResult = await baseQuery(
        {
          url: "/auth/token/refresh/",
          method: "POST",
          body: { refresh: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // If we get a new token, update the Redux store
        const newTokens = refreshResult.data as AuthResponse;
        api.dispatch(setToken(newTokens));

        // Retry the original request that failed
        result = await baseQuery(args, api, extraOptions);
      }
      // If the refresh fails, the user will be logged out by other logic
    }
  }

  return result;
};

// 5. Define the final API slice, now using our smart base query
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth, // Use the wrapper
  tagTypes: ["Product", "Category", "Order", "Chat", "Review", "Inventory"],
  endpoints: (builder) => ({
    // ALL YOUR ENDPOINTS REMAIN EXACTLY THE SAME
    getProducts: builder.query<PaginatedResponse<Product>, number>({
      query: (page = 1) => `/products/?page=${page}`,
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: "Product" as const,
                id,
              })),
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],
    }),
    getCategories: builder.query<PaginatedResponse<Category>, void>({
      query: () => "/products/categories/",
      providesTags: ["Category"],
    }),
    getProductRecommendations: builder.query<Product[], number>({
      query: (productId) => `/products/${productId}/recommendations/`,
    }),

    getProductById: builder.query<Product, number>({
      query: (id) => `/products/${id}/`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
    getOrders: builder.query<PaginatedResponse<Order>, number | void>({
      query: (page = 1) => `/orders/?page=${page}`,
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: "Order" as const,
                id,
              })),
              { type: "Order", id: "LIST" },
            ]
          : [{ type: "Order", id: "LIST" }],
    }),
    getMessageHistory: builder.query<PaginatedResponse<Message>, number>({
      query: (userId) => `/chat/history/${userId}/`,
      providesTags: (result, error, userId) => [{ type: "Chat", id: userId }],
    }),

    // 2. Add new query to get reviews for a specific product
    getReviewsForProduct: builder.query<PaginatedResponse<Review>, number>({
      query: (productId) => `/products/${productId}/reviews/`,
      providesTags: (result, error, productId) => [
        { type: "Review", id: productId },
      ],
    }),

    // 3. Add new mutation to post a review
    addReview: builder.mutation<
      Review,
      { productId: number; rating: number; text: string }
    >({
      query: ({ productId, ...body }) => ({
        url: `/products/${productId}/reviews/`,
        method: "POST",
        body,
      }),
      // When a review is added, we invalidate the tag to force a refetch of the list
      invalidatesTags: (result, error, { productId }) => [
        { type: "Review", id: productId },
      ],
    }),

    googleLogin: builder.mutation<AuthResponse, { token: string }>({
      query: (credentials) => ({
        url: "/auth/google/",
        method: "POST",
        body: credentials,
      }),
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (credentials) => ({
        url: "/auth/token/",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation<User, { [key: string]: string }>({
      query: (credentials) => ({
        url: "/auth/register/",
        method: "POST",
        body: credentials,
      }),
    }),
    createPaymentIntent: builder.mutation<
      { clientSecret: string },
      { items: CartItem[] }
    >({
      query: (body) => ({
        url: "/orders/create-payment-intent/",
        method: "POST",
        body,
      }),
    }),
    getChatUsers: builder.query<ChatUser[], void>({
      query: () => "/chat/user-chats/",
    }),
    addNewProduct: builder.mutation<Product, ProductFormData>({
      query: (initialProduct) => ({
        url: "/products/admin/manage/",
        method: "POST",
        body: initialProduct,
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Category"],
    }),
    updateProduct: builder.mutation<
      Product,
      Partial<ProductFormData> & { id: number }
    >({
      query: ({ id, ...patch }) => ({
        url: `/products/admin/manage/${id}/`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Product", id }],
    }),
    deleteProduct: builder.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `/products/admin/manage/${id}/`,
          method: "DELETE",
        };
      },
      invalidatesTags: (_result, _error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    //  Add the new mutation for AI content generation
    generateProductContent: builder.mutation<
      AIGeneratedContent,
      { name: string; category: string; image: string }
    >({
      query: (productInfo) => ({
        url: "/products/admin/generate-content/",
        method: "POST",
        body: productInfo,
      }),
    }),

    // --- ADD THE NEW QUERY FOR INVENTORY INSIGHTS ---
    getInventoryInsights: builder.query<ProductInventoryInsight[], void>({
      query: () => "/products/admin/inventory-insights/",
      // Provides a tag for this specific query, allowing for easy refetching if needed later.
      providesTags: ["Inventory"],
    }),
  }),
});

// The exported hooks remain the same
export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useCreatePaymentIntentMutation,
  useGoogleLoginMutation,
  useLoginMutation,
  useRegisterMutation,
  useGetChatUsersQuery,
  useAddNewProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetOrdersQuery,
  useGetMessageHistoryQuery,
  useGenerateProductContentMutation,
  useGetProductByIdQuery,
  useGetReviewsForProductQuery,
  useAddReviewMutation,
  useGetProductRecommendationsQuery,
  useGetInventoryInsightsQuery,
} = apiSlice;

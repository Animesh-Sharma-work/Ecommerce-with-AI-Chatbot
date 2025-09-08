// src/features/api/apiSlice.ts - CORRECTED AND CLEANED

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
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
  AIGeneratedContent,
  Review,
  ProductInventoryInsight,
} from "../../types";
import type { RootState } from "../../app/store";
import { setToken } from "../auth/authSlice";

// Type definitions...
interface AuthResponse {
  refresh: string;
  access: string;
}

interface GenerateContentInput {
  name: string;
  category: string;
  image: File;
}

export interface Document {
  id: number;
  original_filename: string;
  // status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  uploaded_at: string;
  user_email: string;
}

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

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (refreshToken) {
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
        api.dispatch(setToken(refreshResult.data as AuthResponse));
        result = await baseQuery(args, api, extraOptions);
      }
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Product",
    "Category",
    "Order",
    "Chat",
    "Review",
    "Inventory",
    "Document",
  ],
  endpoints: (builder) => ({
    // --- PRODUCT QUERIES ---
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
    getProductById: builder.query<Product, number>({
      query: (id) => `/products/${id}/`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
    getCategories: builder.query<PaginatedResponse<Category>, void>({
      query: () => "/products/categories/",
      providesTags: ["Category"],
    }),
    getProductRecommendations: builder.query<Product[], number>({
      query: (productId) => `/products/${productId}/recommendations/`,
    }),

    // --- PRODUCT MUTATIONS ---
    addNewProduct: builder.mutation<Product, ProductFormData>({
      query: (productData) => {
        const formData = new FormData();
        Object.entries(productData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formData.append(key, value as string | Blob);
          }
        });
        return {
          url: "/products/admin/manage/",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Category"],
    }),
    updateProduct: builder.mutation<
      Product,
      { id: number; data: ProductFormData }
    >({
      query: ({ id, data }) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key === "image" && !value) return;
          if (value !== null && value !== undefined) {
            formData.append(key, value as string | Blob);
          }
        });
        return {
          url: `/products/admin/manage/${id}/`,
          method: "PATCH",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: "Product", id }],
    }),
    deleteProduct: builder.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return { url: `/products/admin/manage/${id}/`, method: "DELETE" };
      },
      invalidatesTags: (_result, _error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),
    generateProductContent: builder.mutation<
      AIGeneratedContent,
      GenerateContentInput
    >({
      query: (data) => {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("category", data.category);
        formData.append("image", data.image);
        return {
          url: "/products/admin/generate-content/",
          method: "POST",
          body: formData,
        };
      },
    }),

    // --- DOCUMENT QUERIES & MUTATIONS ---
    getDocuments: builder.query<PaginatedResponse<Document>, void>({
      query: () => "/qa/documents/",
      providesTags: (result) =>
        result && result.results
          ? [
              ...result.results.map(({ id }) => ({
                type: "Document" as const,
                id,
              })),
              { type: "Document", id: "LIST" },
            ]
          : [{ type: "Document", id: "LIST" }],
    }),
    uploadDocument: builder.mutation<Document, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return { url: "/qa/documents/", method: "POST", body: formData };
      },
      invalidatesTags: [{ type: "Document", id: "LIST" }],
    }),
    deleteDocument: builder.mutation<{ success: boolean; id: number }, number>({
      // --- THIS IS THE FIX ---
      // The URL should not have a colon before the ID.
      query: (id) => ({
        url: `/qa/documents/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Document", id },
        { type: "Document", id: "LIST" },
      ],
    }),

    // --- OTHER QUERIES & MUTATIONS ---
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
    getReviewsForProduct: builder.query<PaginatedResponse<Review>, number>({
      query: (productId) => `/products/${productId}/reviews/`,
      providesTags: (result, error, productId) => [
        { type: "Review", id: productId },
      ],
    }),
    addReview: builder.mutation<
      Review,
      { productId: number; rating: number; text: string }
    >({
      query: ({ productId, ...body }) => ({
        url: `/products/${productId}/reviews/`,
        method: "POST",
        body,
      }),
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
    getInventoryInsights: builder.query<ProductInventoryInsight[], void>({
      query: () => "/products/admin/inventory-insights/",
      providesTags: ["Inventory"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetCategoriesQuery,
  useGetProductRecommendationsQuery,
  useAddNewProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGenerateProductContentMutation,
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useGetOrdersQuery,
  useGetReviewsForProductQuery,
  useAddReviewMutation,
  useGoogleLoginMutation,
  useLoginMutation,
  useRegisterMutation,
  useCreatePaymentIntentMutation,
  useGetInventoryInsightsQuery,
} = apiSlice;

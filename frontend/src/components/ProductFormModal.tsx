// src/components/ProductFormModal.tsx

import { useState, useEffect } from "react";
import type { Product, Category, ProductFormData } from "../types";
import {
  useGetCategoriesQuery,
  useGenerateProductContentMutation,
} from "../features/api/apiSlice";

// Defines the expected structure of a validation error from our API.
interface ApiError {
  data: {
    error: string;
  };
}

// // A "type guard" function to safely check if an unknown error is an ApiError.
// function isApiError(error: unknown): error is ApiError {
//   return (
//     typeof error === "object" &&
//     error !== null &&
//     "data" in error &&
//     typeof (error as any).data === "object" &&
//     "error" in (error as any).data
//   );
// }

/**
 * A robust, type-safe "type guard" to check if an unknown error is an ApiError.
 * This function satisfies strict linting rules by avoiding 'any' casts. It checks
 * each property's existence and type before trying to access nested properties.
 * This is the standard way to solve the "Unexpected any" error in a catch block.
 */
function isApiError(error: unknown): error is ApiError {
  // 1. Ensure the error is an object and not null.
  if (typeof error !== "object" || error === null) {
    return false;
  }

  // 2. Check if the 'data' property exists on the error object.
  if (!("data" in error)) {
    return false;
  }

  // 3. We can now safely assume 'data' exists. Let's check its contents.
  const data = (error as { data: unknown }).data;
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  );
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData) => void;
  productToEdit?: Product | null;
  isLoading?: boolean;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  isLoading = false,
}: ProductFormModalProps) {
  // RTK Query hooks for fetching categories and generating content
  const { data: paginatedCategories, isLoading: isLoadingCategories } =
    useGetCategoriesQuery();
  const [generateContent, { isLoading: isGenerating }] =
    useGenerateProductContentMutation();

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    category: "",
    price: "0.00",
    quantity: 0,
    description: "",
    image: "",
    ai_meta_title: "",
    ai_meta_description: "",
    ai_keywords: "",
    ai_tags: "",
  });

  // State for the "new category" input field
  const [newCategory, setNewCategory] = useState("");
  // State to hold and display the AI validation error message
  const [validationError, setValidationError] = useState<string | null>(null);

  // This effect runs when the modal is opened or the product to edit changes.
  // It populates the form for editing or resets it for creating a new product.
  useEffect(() => {
    if (productToEdit) {
      setFormData(productToEdit);
      setNewCategory(""); // Clear the new category field when editing
    } else {
      // Reset form for creating a new product
      setFormData({
        name: "",
        category: "",
        price: "0.00",
        quantity: 0,
        description: "",
        image: "",
        ai_meta_title: "",
        ai_meta_description: "",
        ai_keywords: "",
        ai_tags: "",
      });
      setNewCategory("");
    }
    setValidationError(null); // Reset validation error when modal opens/changes
  }, [productToEdit, isOpen]);

  // Don't render the component if it's not open
  if (!isOpen) return null;

  // Generic handler for updating form state from input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    // When the dropdown (<select>) changes, we need to clear the 'new category' text input
    if (name === "category") {
      setNewCategory("");
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value, 10) || 0 : value,
    }));
  };

  // Specific handler for the "new category" text input
  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewCategory(value);
    // When the user starts typing a new category, we clear the dropdown selection
    if (value) {
      setFormData((prev) => ({ ...prev, category: "" }));
    }
  };

  //  Handles the "Generate with AI" button click
  const handleGenerateContent = async () => {
    setValidationError(null); // Clear previous errors before making new request
    const category = newCategory.trim() || formData.category;

    try {
      // Call the mutation. .unwrap() will throw an error if the request fails.
      const aiContent = await generateContent({
        name: formData.name,
        category,
        image: formData.image,
      }).unwrap();
      // 4. On success, Update the form state with the AI's response
      setFormData((prev) => ({
        ...prev,
        description: aiContent.description, // Use ai_description from backend if you changed the field name
        ai_meta_title: aiContent.meta_title,
        ai_meta_description: aiContent.meta_description,
        ai_keywords: aiContent.keywords,
        ai_tags: aiContent.tags,
        // We need to add the AI fields to our ProductFormData type
      }));
      // We'll also need to add inputs for the new meta fields
      alert("AI content generated and populated!");
    } catch (err) {
      // On failure, use our type guard to safely check the error structure
      if (isApiError(err)) {
        // If it's a known API error, display the specific message from the backend
        setValidationError(err.data.error);
      } else {
        // Otherwise, show a generic error message
        setValidationError(
          "An unknown error occurred while generating content."
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prioritize the 'newCategory' input. If it's empty, use the dropdown's value.
    const finalFormData = {
      ...formData,
      category: newCategory.trim() || formData.category,
    };

    // Simple validation to ensure a category was provided
    if (!finalFormData.category) {
      alert("Please either select an existing category or enter a new one.");
      return;
    }

    onSave(finalFormData);
  };

  // Determines if the "Generate with AI" button should be enabled
  const canGenerate =
    formData.name && (formData.category || newCategory) && formData.image;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center p-4">
      <div className="bg-gray-800 text-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {productToEdit ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            type="button"
            onClick={handleGenerateContent}
            disabled={isGenerating || !canGenerate}
            className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✨ {isGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>

        {/* This block conditionally renders the validation error message from the AI */}
        {validationError && (
          <div
            className="bg-yellow-900 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-md relative mb-4 text-sm"
            role="alert"
          >
            <strong className="font-bold">Validation Failed: </strong>
            <span className="block sm:inline">{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- Core Product Details --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Product Name"
              required
              className="w-full p-2 bg-gray-700 rounded"
            />
            <input
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="Image URL"
              required
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              placeholder="Price"
              required
              className="w-full p-2 bg-gray-700 rounded"
            />
            <input
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="Stock Quantity"
              required
              className="w-full p-2 bg-gray-700 rounded"
            />

            <div className="space-y-2">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2 bg-gray-700 rounded"
                required={!newCategory} // The dropdown is only required if the text input is empty
              >
                <option value="" disabled>
                  {isLoadingCategories ? "Loading..." : "-- Select Category --"}
                </option>
                {paginatedCategories?.results.map((cat: Category) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                name="newCategory"
                value={newCategory}
                onChange={handleNewCategoryChange}
                placeholder="Or Enter New Category"
                className="w-full p-2 bg-gray-700 rounded text-sm"
              />
            </div>
          </div>

          {/* --- AI Generated Content Section --- */}
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300">
              Content & SEO
            </h3>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Product Description"
              className="w-full p-2 bg-gray-700 rounded h-24"
            />
            <input
              name="ai_meta_title"
              value={formData.ai_meta_title || ""}
              onChange={handleChange}
              placeholder="SEO Meta Title"
              className="w-full p-2 bg-gray-700 rounded"
            />
            <textarea
              name="ai_meta_description"
              value={formData.ai_meta_description || ""}
              onChange={handleChange}
              placeholder="SEO Meta Description"
              className="w-full p-2 bg-gray-700 rounded h-20"
            />
            <input
              name="ai_keywords"
              value={formData.ai_keywords || ""}
              onChange={handleChange}
              placeholder="SEO Keywords (comma-separated)"
              className="w-full p-2 bg-gray-700 rounded"
            />
            <input
              name="ai_tags"
              value={formData.ai_tags || ""}
              onChange={handleChange}
              placeholder="AI Tags (for recommendations)"
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-blue-400"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

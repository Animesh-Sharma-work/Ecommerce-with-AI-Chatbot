// src/components/ProductFormModal.tsx

import { useState, useEffect } from "react";
import type { Product, Category } from "../types";
import {
  useGetCategoriesQuery,
  useGenerateProductContentMutation,
} from "../features/api/apiSlice";

// Type for the data passed up to the parent component
type ProductSaveData = {
  name: string;
  category: string;
  price: string;
  quantity: number;
  description: string;
  image: File | null;
  ai_meta_title?: string;
  ai_meta_description?: string;
  ai_keywords?: string;
  ai_tags?: string;
};

// Type for API error handling
interface ApiError {
  data: { error: string };
}

function isApiError(error: unknown): error is ApiError {
  if (typeof error !== "object" || error === null || !("data" in error))
    return false;
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
  onSave: (productData: ProductSaveData) => void;
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
  const { data: paginatedCategories, isLoading: isLoadingCategories } =
    useGetCategoriesQuery();
  const [generateContent, { isLoading: isGenerating }] =
    useGenerateProductContentMutation();

  // State for text-based form fields
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "0.00",
    quantity: 0,
    description: "",
    ai_meta_title: "",
    ai_meta_description: "",
    ai_keywords: "",
    ai_tags: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      // --- THIS IS THE FIX ---
      // Instead of destructuring with unused variables, we build the state object directly.
      // This is cleaner and avoids all TypeScript/ESLint errors.
      setFormData({
        name: productToEdit.name,
        category: productToEdit.category,
        price: productToEdit.price,
        quantity: productToEdit.quantity,
        description: productToEdit.description,
        // Provide default empty strings for AI fields if they are null or undefined
        ai_meta_title: productToEdit.ai_meta_title || "",
        ai_meta_description: productToEdit.ai_meta_description || "",
        ai_keywords: productToEdit.ai_keywords || "",
        ai_tags: productToEdit.ai_tags || "",
      });
    } else {
      // Reset form to its initial empty state
      setFormData({
        name: "",
        category: "",
        price: "0.00",
        quantity: 0,
        description: "",
        ai_meta_title: "",
        ai_meta_description: "",
        ai_keywords: "",
        ai_tags: "",
      });
    }
    // Reset non-text fields separately
    setImageFile(null);
    setNewCategory("");
    setValidationError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      const files = (e.target as HTMLInputElement).files;
      setImageFile(files && files.length > 0 ? files[0] : null);
      return;
    }

    if (name === "category") setNewCategory("");
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewCategory(value);
    if (value) setFormData((prev) => ({ ...prev, category: "" }));
  };

  const handleGenerateContent = async () => {
    setValidationError(null);
    const category = newCategory.trim() || formData.category;

    if (!imageFile) {
      alert("Please select an image file before generating content.");
      return;
    }

    try {
      const aiContent = await generateContent({
        name: formData.name,
        category,
        image: imageFile,
      }).unwrap();

      setFormData((prev) => ({
        ...prev,
        description: aiContent.description,
        ai_meta_title: aiContent.meta_title,
        ai_meta_description: aiContent.meta_description,
        ai_keywords: aiContent.keywords,
        ai_tags: aiContent.tags,
      }));
      alert("AI content generated and populated!");
    } catch (err) {
      if (isApiError(err)) {
        setValidationError(err.data.error);
      } else {
        setValidationError(
          "An unknown error occurred while generating content."
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalProductData: ProductSaveData = {
      ...formData,
      category: newCategory.trim() || formData.category,
      image: imageFile,
    };

    if (!finalProductData.category) {
      alert("Please either select an existing category or enter a new one.");
      return;
    }

    if (!productToEdit && !finalProductData.image) {
      alert("Please select an image for the new product.");
      return;
    }

    onSave(finalProductData);
  };

  const canGenerate =
    formData.name && (formData.category || newCategory) && imageFile;

  let imagePreviewSrc: string | null = null;
  if (imageFile) {
    // If a new file is selected, create a temporary URL for its preview.
    imagePreviewSrc = URL.createObjectURL(imageFile);
  } else if (productToEdit && productToEdit.image) {
    // If in edit mode and no new file is selected, use the existing image URL.
    imagePreviewSrc = productToEdit.image;
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Product Name"
              required
              className="w-full p-2 bg-gray-700 rounded"
            />
            <div>
              <label htmlFor="image-upload" className="text-sm text-gray-400">
                Product Image
              </label>
              <input
                id="image-upload"
                name="image"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleChange}
                className="w-full p-2 bg-gray-700 rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              />

              {imagePreviewSrc && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Image Preview:</p>
                  <img
                    src={imagePreviewSrc}
                    alt={imageFile ? "New image preview" : "Current image"}
                    className="w-24 h-24 object-contain rounded-md bg-gray-700 border border-gray-600"
                  />
                </div>
              )}
            </div>
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
              value={formData.quantity.toString()}
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
                required={!newCategory}
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

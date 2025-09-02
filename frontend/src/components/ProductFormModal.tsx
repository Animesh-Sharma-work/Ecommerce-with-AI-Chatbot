// src/components/ProductFormModal.tsx

import { useState, useEffect } from "react";
import type { Product, Category, ProductFormData } from "../types";
import {
  useGetCategoriesQuery,
  useGenerateProductContentMutation,
} from "../features/api/apiSlice";

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
  const { data: paginatedCategories, isLoading: isLoadingCategories } =
    useGetCategoriesQuery();

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

  // Add state to specifically handle the 'new category' text input
  const [newCategory, setNewCategory] = useState("");

  //  Initialize the mutation hook
  const [generateContent, { isLoading: isGenerating }] =
    useGenerateProductContentMutation();

  // When the modal opens, populate the form if we are editing a product
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
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

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

  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewCategory(value);
    // When the user starts typing a new category, we clear the dropdown selection
    if (value) {
      setFormData((prev) => ({ ...prev, category: "" }));
    }
  };

  //  Create the handler for the AI button
  const handleGenerateContent = async () => {
    const category = newCategory.trim() || formData.category;
    if (!formData.name || !category) {
      alert(
        "Please enter a Product Name and select a Category before generating content."
      );
      return;
    }

    try {
      const aiContent = await generateContent({
        name: formData.name,
        category,
      }).unwrap();
      // 4. Update the form state with the AI's response
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
      console.error("Failed to generate AI content:", err);
      alert("An error occurred while generating content.");
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
            disabled={isGenerating}
            className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✨ {isGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>

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

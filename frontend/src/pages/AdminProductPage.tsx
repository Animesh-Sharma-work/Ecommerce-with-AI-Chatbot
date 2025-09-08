// src/pages/AdminProductPage.tsx

import { useState } from "react";
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useAddNewProductMutation,
  useUpdateProductMutation,
} from "../features/api/apiSlice";
import { ProductFormModal } from "../components/ProductFormModal";
import { Pagination } from "../components/Pagination";
import type { Product } from "../types";

// This is the type the ProductFormModal will pass up in its onSave callback
type ProductSaveData = {
  name: string;
  category: string;
  price: string;
  quantity: number;
  description: string;
  image: File | null; // Can be a File or null if not changed during edit
  ai_meta_title?: string;
  ai_meta_description?: string;
  ai_keywords?: string;
  ai_tags?: string;
};

export function AdminProductPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const {
    data: paginatedResponse,
    isLoading,
    isError,
    isFetching,
  } = useGetProductsQuery(currentPage);

  const [deleteProduct] = useDeleteProductMutation();
  const [addNewProduct, { isLoading: isAdding }] = useAddNewProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const handleOpenAddModal = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  // This function is now corrected to match the API slice definitions
  const handleSaveProduct = async (productData: ProductSaveData) => {
    try {
      if (productToEdit) {
        // --- THIS IS THE FIX ---
        // The updateProduct hook expects an object with `id` and `data` properties.
        // We pass the product ID and the form data object separately.
        await updateProduct({
          id: productToEdit.id,
          data: productData,
        }).unwrap();
      } else {
        // The addNewProduct hook expects the productData object directly.
        // A check ensures the image is not null for new products.
        if (!productData.image) {
          alert("An image is required for a new product.");
          return;
        }
        await addNewProduct(productData as Required<ProductSaveData>).unwrap();
      }
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product. Please check the console for errors.");
    }
  };

  if (isLoading) {
    return <p className="text-center text-gray-300">Loading products...</p>;
  }

  if (isError) {
    return <p className="text-center text-red-400">Error loading products.</p>;
  }

  const products = paginatedResponse?.results;
  const totalProducts = paginatedResponse?.count || 0;
  const totalPages = Math.ceil(totalProducts / 6);

  return (
    <>
      <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-xl font-semibold text-white">
            Manage Products ({totalProducts})
          </h2>
          <button
            onClick={handleOpenAddModal}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-md transition-colors"
          >
            Add New Product
          </button>
        </div>

        {isFetching && (
          <p className="text-center text-gray-400 my-2">Fetching page...</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-300">
            <thead className="bg-gray-800">
              <tr className="border-b border-gray-600">
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-800 hover:bg-gray-600"
                >
                  <td className="p-3">{product.name}</td>
                  <td className="p-3">{product.category}</td>
                  <td className="p-3">${product.price}</td>
                  <td className="p-3">{product.quantity}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenEditModal(product)}
                      className="text-blue-400 hover:text-blue-300 font-semibold mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-400 hover:text-red-300 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        isLoading={isAdding || isUpdating}
      />
    </>
  );
}

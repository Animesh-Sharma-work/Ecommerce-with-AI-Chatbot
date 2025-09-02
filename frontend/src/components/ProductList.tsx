import { useState } from "react"; // Import useState
import { useGetProductsQuery } from "../features/api/apiSlice";
import { ProductCard } from "./ProductCard";
import { Pagination } from "./Pagination";

export function ProductList() {
  const [currentPage, setCurrentPage] = useState(1); // Add state for current page
  const {
    data: paginatedResponse, // Rename data to reflect its new shape
    isLoading,
    isError,
    error,
  } = useGetProductsQuery(currentPage); // Pass the current page to the hook

  if (isLoading) {
    return (
      <p className="text-lg text-center text-gray-500">Loading products...</p>
    );
  }

  if (isError) {
    console.error("An error occurred while fetching products:", error);
    return (
      <p className="text-lg text-center text-red-500">
        Error: Could not fetch products.
      </p>
    );
  }

  const products = paginatedResponse?.results;
  const totalProducts = paginatedResponse?.count || 0;
  const totalPages = Math.ceil(totalProducts / 6); // 6 is our PAGE_SIZE

  if (!products || products.length === 0) {
    return (
      <p className="text-lg text-center text-gray-500">No products found.</p>
    );
  }

  return (
    <div className="flex flex-col flex-grow">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}

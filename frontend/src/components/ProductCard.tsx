// src/components/ProductCard.tsx

import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { addToCart } from "../features/cart/cartSlice";
import type { Product } from "../types";
import { ShoppingCart } from "lucide-react";

// Define the base URL of your Django backend.
// It's good practice to put this in an environment variable (.env file).

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useDispatch();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(addToCart(product));
  };

  // --- THIS IS THE FIX ---
  // The product.image from the API is a relative path (e.g., /media/products/image.jpg).
  // We must prepend the backend's base URL to create a full, valid URL for the <img> src.
  const imageUrl = product.image || "https://via.placeholder.com/300"; // A fallback image if none is provided

  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group flex flex-col"
    >
      <div className="relative h-48 w-full overflow-hidden bg-gray-50 flex-shrink-0">
        <img
          src={imageUrl} // Use the corrected, full URL
          alt={product.name}
          className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="p-3 flex flex-col flex-grow">
        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full mb-2 self-start">
          {product.category}
        </span>

        <h3
          className="text-base font-semibold text-gray-900 mb-1 truncate"
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-lg font-bold text-gray-900">${product.price}</p>

          <button
            onClick={handleAddToCart}
            className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart size={14} />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </Link>
  );
}

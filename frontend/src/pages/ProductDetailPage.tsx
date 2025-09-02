// src/pages/ProductDetailPage.tsx - CORRECTED

import { useParams } from "react-router-dom";
import { useGetProductByIdQuery } from "../features/api/apiSlice";
import { Header } from "../components/Header";
import { BackButton } from "../components/BackButton";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../features/cart/cartSlice";
import { ReviewList } from "../components/ReviewList";
import { ReviewForm } from "../components/ReviewForm";
import { selectToken } from "../features/auth/authSlice";
import { RecommendedProducts } from "../components/RecommendedProducts";

// 1. Define an interface for the component's props
interface ProductDetailPageProps {
  onCartClick: () => void;
}

// 2. Use the interface to type the props
export function ProductDetailPage({ onCartClick }: ProductDetailPageProps) {
  const { productId } = useParams<{ productId: string }>();
  const dispatch = useDispatch();
  const token = useSelector(selectToken);

  const numericProductId = productId ? Number(productId) : undefined;
  const {
    data: product,
    isLoading,
    isError,
  } = useGetProductByIdQuery(numericProductId!, {
    skip: numericProductId === undefined,
  });

  if (isLoading) {
    return <div>Loading product...</div>;
  }
  if (isError || !product) {
    return <div>Error: Product not found.</div>;
  }

  const handleAddToCart = () => {
    dispatch(addToCart(product));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 3. Pass the received prop down to the Header */}
      <Header onCartClick={onCartClick} />
      <BackButton />
      <main className="container mx-auto p-4 sm:p-6">
        <div className="bg-white p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-auto object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full mb-3 self-start">
              {product.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>
            <p className="text-3xl font-bold text-gray-800 mb-6">
              ${product.price}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description}
            </p>
            <div className="mt-auto">
              <button
                onClick={handleAddToCart}
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        {numericProductId && (
          <RecommendedProducts productId={numericProductId} />
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            {numericProductId && <ReviewList productId={numericProductId} />}
            {token && numericProductId && (
              <ReviewForm productId={numericProductId} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

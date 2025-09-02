// src/components/RecommendedProducts.tsx

import { useGetProductRecommendationsQuery } from "../features/api/apiSlice";
import { ProductCard } from "./ProductCard";

interface RecommendedProductsProps {
  productId: number;
}

export function RecommendedProducts({ productId }: RecommendedProductsProps) {
  const {
    data: recommendations,
    isLoading,
    isError,
  } = useGetProductRecommendationsQuery(productId);

  // Don't render anything if loading, error, or no recommendations
  if (
    isLoading ||
    isError ||
    !recommendations ||
    recommendations.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        You May Also Like
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

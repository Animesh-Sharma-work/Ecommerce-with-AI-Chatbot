// src/components/ReviewList.tsx
import { useGetReviewsForProductQuery } from "../features/api/apiSlice";
import type { Review } from "../types";

function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="border-t py-4">
      <p className="font-semibold">{review.user.first_name || "Anonymous"}</p>
      <div className="flex items-center my-1">
        <span className="text-yellow-500">{"★".repeat(review.rating)}</span>
        <span className="text-gray-400">{"☆".repeat(5 - review.rating)}</span>
      </div>
      <p className="text-gray-600">{review.text}</p>
    </div>
  );
}

export function ReviewList({ productId }: { productId: number }) {
  const { data: paginatedReviews, isLoading } =
    useGetReviewsForProductQuery(productId);

  if (isLoading) return <p>Loading reviews...</p>;

  //  Extract the actual reviews array from the 'results' property
  const reviews = paginatedReviews?.results;

  if (!reviews || reviews.length === 0)
    return <p>No reviews yet. Be the first!</p>;

  return (
    <div>
      {/*  The .map() call will now work correctly on the 'reviews' array */}
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}
    </div>
  );
}

// src/components/ReviewForm.tsx
import { useState } from "react";
import { useAddReviewMutation } from "../features/api/apiSlice";

export function ReviewForm({ productId }: { productId: number }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [addReview, { isLoading, isSuccess, isError }] = useAddReviewMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addReview({ productId, rating, text }).unwrap();
      // Clear form on success
      setText("");
      setRating(5);
    } catch (err) {
      console.error("Failed to post review:", err);
    }
  };

  if (isSuccess) {
    return (
      <p className="text-green-600">
        Thank you! Your review is pending approval.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t pt-6">
      <h3 className="text-lg font-semibold mb-2">Write a Review</h3>
      <div>
        <label>Rating:</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="ml-2 border rounded"
        >
          <option value={5}>5 Stars</option>
          <option value={4}>4 Stars</option>
          <option value={3}>3 Stars</option>
          <option value={2}>2 Stars</option>
          <option value={1}>1 Star</option>
        </select>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts..."
        required
        className="w-full border rounded mt-2 p-2 h-24"
      />
      {isError && (
        <p className="text-red-500 text-sm">
          Failed to submit review. You may have already reviewed this product.
        </p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-400"
      >
        {isLoading ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

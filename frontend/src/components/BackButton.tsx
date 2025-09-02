// src/components/BackButton.tsx

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 pt-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        Back
      </button>
    </div>
  );
}

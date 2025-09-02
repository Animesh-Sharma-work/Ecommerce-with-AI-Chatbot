// src/pages/AdminInventoryPage.tsx - CORRECTED

import { useState, useMemo } from "react";
import { useGetInventoryInsightsQuery } from "../features/api/apiSlice";
import type { ProductInventoryInsight } from "../types";
import { ArrowUpDown } from "lucide-react";

// A small, reusable component for rendering the status badges
const StatusBadge = ({
  status,
}: {
  status: ProductInventoryInsight["status"];
}) => {
  const statusStyles: { [key: string]: string } = {
    CRITICAL: "bg-red-500 text-white",
    WARNING: "bg-yellow-500 text-black",
    LOW_STOCK: "bg-gray-400 text-black",
    UNSOLD: "bg-purple-500 text-white",
    SLOW_MOVING: "bg-blue-500 text-white",
    HEALTHY: "bg-green-500 text-white",
  };
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${
        statusStyles[status] || "bg-gray-200"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
};

// Define the types for our sorting state
type SortKey = keyof ProductInventoryInsight;
type SortDirection = "asc" | "desc";

export function AdminInventoryPage() {
  const { data: insights, isLoading, isError } = useGetInventoryInsightsQuery();
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>({ key: "status", direction: "asc" });

  // --- THE FIX IS IN THIS useMemo HOOK ---
  const sortedInsights = useMemo(() => {
    if (!insights) return [];

    const sortableItems = [...insights];

    // If there's no sort configuration, we don't need to sort.
    if (sortConfig === null) {
      return sortableItems;
    }

    // By checking for null above, TypeScript now knows `sortConfig` is not null here.
    const { key, direction } = sortConfig;

    sortableItems.sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];

      // 1. Explicitly handle null values to make sorting predictable.
      // We'll treat nulls as the "lowest" value.
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return -1; // a comes first
      if (valueB === null) return 1; // b comes first

      // 2. Perform the standard comparison for non-null values.
      if (valueA < valueB) {
        return direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sortableItems;
  }, [insights, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({
    sortKey,
    children,
  }: {
    sortKey: SortKey;
    children: React.ReactNode;
  }) => (
    <th
      className="p-3 cursor-pointer hover:bg-gray-700"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortConfig?.key === sortKey && <ArrowUpDown size={14} />}
      </div>
    </th>
  );

  if (isLoading)
    return (
      <p className="text-center text-gray-300">Loading inventory insights...</p>
    );
  if (isError)
    return <p className="text-center text-red-400">Error loading insights.</p>;

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">
        Inventory Insights
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-800">
            <tr className="border-b border-gray-600">
              <th className="p-3">Product Name</th>
              <SortableHeader sortKey="status">Status</SortableHeader>
              <SortableHeader sortKey="quantity">Current Stock</SortableHeader>
              <SortableHeader sortKey="sales_last_30_days">
                Sales (30d)
              </SortableHeader>
              <SortableHeader sortKey="total_units_sold">
                Total Sold
              </SortableHeader>
              <SortableHeader sortKey="predicted_days_until_stockout">
                Stockout In (Days)
              </SortableHeader>
              <th className="p-3">Insight</th>
            </tr>
          </thead>
          <tbody>
            {sortedInsights.map((product) => (
              <tr
                key={product.id}
                className="border-b border-gray-800 hover:bg-gray-600"
              >
                <td className="p-3 font-medium">{product.name}</td>
                <td className="p-3">
                  <StatusBadge status={product.status} />
                </td>
                <td className="p-3 text-center">{product.quantity}</td>
                <td className="p-3 text-center">
                  {product.sales_last_30_days}
                </td>
                <td className="p-3 text-center">{product.total_units_sold}</td>
                <td className="p-3 text-center">
                  {product.predicted_days_until_stockout ?? "N/A"}
                </td>
                <td className="p-3 text-sm text-gray-400">{product.insight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

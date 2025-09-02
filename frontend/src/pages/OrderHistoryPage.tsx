// src/pages/OrderHistoryPage.tsx - CORRECTED

import { useGetOrdersQuery } from "../features/api/apiSlice";
import type { Order } from "../types";
import { Header } from "../components/Header";
import { BackButton } from "../components/BackButton";
import { Link } from "react-router-dom";

function OrderCard({ order }: { order: Order }) {
  const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-200 pb-3">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium">ORDER PLACED</p>
            <p className="text-sm">{orderDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">TOTAL</p>
            <p className="text-sm">${order.total_price}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium mt-2 sm:mt-0">
            ORDER # {order.id}
          </p>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-3 text-lg text-gray-800">Items:</h3>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center space-x-4">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-20 h-20 object-cover rounded-md border"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {item.product.name}
                </p>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                <p className="text-sm text-gray-600">
                  Price per item: ${item.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 1. Define an interface for the component's props
interface OrderHistoryPageProps {
  onCartClick: () => void;
}

// 2. Use the interface to type the props
export function OrderHistoryPage({ onCartClick }: OrderHistoryPageProps) {
  const { data: paginatedOrders, isLoading, isError } = useGetOrdersQuery();

  let content;
  if (isLoading) {
    content = (
      <p className="text-center text-gray-500">Loading your orders...</p>
    );
  } else if (isError) {
    content = (
      <p className="text-center text-red-500">Could not load your orders.</p>
    );
  } else if (!paginatedOrders || paginatedOrders.results.length === 0) {
    content = (
      <div className="text-center bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          No Order History
        </h2>
        <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
        <Link
          to="/"
          className="bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  } else {
    content = (
      <div className="space-y-6">
        {paginatedOrders.results.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 3. Pass the received prop down to the Header */}
      <Header onCartClick={onCartClick} />
      <BackButton />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
          Your Orders
        </h1>
        {content}
      </main>
    </div>
  );
}

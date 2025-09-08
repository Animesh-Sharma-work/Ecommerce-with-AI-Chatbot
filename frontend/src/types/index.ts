export interface Product {
  id: number;
  category: string;
  name: string;
  description: string;
  price: string; // DRF DecimalField serializes to a string
  quantity: number;
  image: string;
  ai_meta_title?: string | null;
  ai_meta_description?: string | null;
  ai_keywords?: string | null;
  ai_tags?: string | null;
}

export interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean; // Add this
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductFormData {
  name: string;
  category: string; // The form sends the category name as a string
  price: string;
  quantity: number;
  description: string;
  image: File | string | null;
  ai_meta_title?: string;
  ai_meta_description?: string;
  ai_keywords?: string;
  ai_tags?: string;
}

export interface OrderItem {
  id: number;
  product: Product; // We will receive the full nested product object
  price: string;
  quantity: number;
}

export interface Order {
  id: number;
  created_at: string; // Django DateTimeField serializes to an ISO string
  total_price: string;
  paid: boolean;
  items: OrderItem[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Message {
  id: number;
  user: string; // Will be the user's email string
  message: string;
  timestamp: string; // ISO format string
}

export interface AIGeneratedContent {
  description: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  tags: string;
}

// This is the new interface for a single review
export interface Review {
  id: number;
  user: {
    // We are nesting a simplified user object
    id: number;
    email: string;
    first_name: string;
  };
  rating: number;
  text: string;
  created_at: string; // ISO format date string
}

export interface ProductInventoryInsight {
  id: number;
  name: string;
  quantity: number;
  total_units_sold: number;
  sales_last_30_days: number;
  status:
    | "CRITICAL"
    | "WARNING"
    | "LOW_STOCK"
    | "UNSOLD"
    | "SLOW_MOVING"
    | "HEALTHY";
  insight: string;
  predicted_days_until_stockout: number | null;
}

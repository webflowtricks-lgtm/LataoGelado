export type ProductCategory = string;

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image?: string;
  available: boolean;
  order: number;
  featured?: boolean;
}

export interface StoreSettings {
  storeName: string;
  whatsappNumber: string; // formatting: 5511999999999
  address: string;
  deliveryFee: number;
  isOpen: boolean;
  categories?: Category[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  observations: string;
  items: OrderItem[];
  total: number;
  deliveryFee: number;
  grandTotal: number;
  createdAt: string;
}

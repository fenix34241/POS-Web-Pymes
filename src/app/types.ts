export interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  brand: string;
  image?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'seller';
  createdAt: Date;
}

export interface SaleItem {
  id?: number;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: Date;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  date: Date;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  total: number;
  invoiceNumber?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface InventoryMovement {
  id: string;
  date: Date;
  productId: string;
  productName: string;
  type: 'entry' | 'exit';
  quantity: number;
  reason: string;
  reference?: string;
}

export interface RefundItem {
  id: number;
  saleItemId: number;
  productId: string;
  productName: string;
  quantity: number;
  originalPrice: number;
  refundAmount: number;
}

export interface Refund {
  id: string;
  saleId: string;
  date: Date;
  subtotal: number;
  total: number;
  reason: string;
  reasonDetail?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  approvedBy?: string;
  items: RefundItem[];
}
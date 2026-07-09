/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
}

export interface StoreSettings {
  storeName: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  receiptFooter: string;
  receiptWidth: number; // e.g. 80 for 80mm thermal, 58, or 210 for A4
  theme: 'light' | 'dark';
  language: 'en' | 'fr' | 'ar';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  additionalBarcodes: string[]; // Support multiple barcodes
  category: string;
  brand: string;
  size?: string;
  color?: string;
  costPrice: number;
  sellingPrice: number;
  discount: number; // Percentage or flat discount for this item in product manager
  stock: number;
  minStock: number; // Minimum stock alert threshold
  imageUrl?: string;
  sizes?: { size: string; stock: number }[]; // Stock mapped by size
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  debt: number; // What customer owes the store
  credit: number; // Store credit customer has
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  outstandingBalance: number; // What we owe them
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'in' | 'out' | 'adjustment_plus' | 'adjustment_minus' | 'transfer';
  quantity: number;
  reason: string;
  timestamp: string;
  operatorName: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  size?: string;
  color?: string;
  qty: number;
  costPrice: number;
  sellingPrice: number; // Actual sold price
  catalogPrice?: number; // Catalog price
  originalPrice: number; // original price before item discount
  discount: number; // Discount rate in percentage for this item
}

export interface PaymentDetails {
  method: 'cash' | 'card' | 'transfer' | 'split';
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number; // Global discount amount
  total: number;
  profit: number;
  customerId?: string;
  customerName?: string;
  paymentDetails: PaymentDetails;
  operatorId: string;
  operatorName: string;
  status: 'completed' | 'returned';
}

export interface HoldSale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  customerId?: string;
  customerName?: string;
  notes?: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  timestamp: string;
  totalAmount: number;
  amountPaid: number;
  items: {
    productId: string;
    productName: string;
    qty: number;
    costPrice: number;
  }[];
}

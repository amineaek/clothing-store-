/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Customer, Supplier, Sale, StockMovement, User, StoreSettings } from '../types';

export const initialSettings: StoreSettings = {
  storeName: "Boutique Vanguard",
  logoUrl: "",
  phone: "+213 21 00 00 00",
  email: "contact@boutiquevanguard.dz",
  address: "Alger, Algérie",
  currency: "DA",
  receiptFooter: "Merci de votre visite ! À bientôt.",
  receiptWidth: 80, // mm
  theme: "dark",
  language: "fr"
};

export const initialOperators: User[] = [
  { id: "op-1", name: "Sarah Jenkins", role: "owner", email: "sarah@vanguard.com" },
  { id: "op-2", name: "David Miller", role: "manager", email: "david@vanguard.com" },
  { id: "op-3", name: "Amine El Kadiri", role: "cashier", email: "amine@vanguard.com" }
];

export const initialCategories: string[] = [];
export const initialBrands: string[] = [];

export const initialProducts: Product[] = [];
export const initialCustomers: Customer[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialStockMovements: StockMovement[] = [];
export const initialSales: Sale[] = [];

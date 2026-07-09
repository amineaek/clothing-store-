/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { Product, StockMovement } from '../types';
import { 
  ArrowUpRight, ArrowDownRight, RefreshCw, Search, 
  Settings, AlertTriangle, Layers, Calendar, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryViewProps {
  products: Product[];
  movements: StockMovement[];
  onAdjustStock: (productId: string, qty: number, type: 'adjustment_plus' | 'adjustment_minus' | 'transfer', reason: string) => void;
  currency: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  movements,
  onAdjustStock,
  currency
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  
  // Adjustment state
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustType, setAdjustType] = useState<'adjustment_plus' | 'adjustment_minus' | 'transfer'>('adjustment_plus');
  const [adjustReason, setAdjustReason] = useState('Stock check audit');

  // Low stock products count
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Out of stock count
  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock === 0);
  }, [products]);

  // Selected product
  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Filtered movements log
  const filteredMovements = useMemo(() => {
    return movements.filter(m => 
      m.productName.toLowerCase().includes(movementSearch.toLowerCase()) ||
      m.sku.toLowerCase().includes(movementSearch.toLowerCase()) ||
      m.reason.toLowerCase().includes(movementSearch.toLowerCase())
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, movementSearch]);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || adjustQty <= 0) return;
    
    onAdjustStock(selectedProductId, adjustQty, adjustType, adjustReason);
    setAdjustQty(5);
    setAdjustReason('Stock check audit');
  };

  return (
    <div className="space-y-6" id="inventory-view-main">
      {/* Overview summaries banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="inventory-summary-banners">
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Unique SKUs</p>
            <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-300">{t('lowStockOnly')}</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{lowStockProducts.length}</p>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-rose-300">{t('outOfStockOnly')}</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{outOfStockProducts.length}</p>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Adjust quantity panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-900/30 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            {t('adjustStock')}
          </h3>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs text-white">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Garment</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 text-white rounded-xl p-2.5 outline-none"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) [Stock: {p.stock}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('adjustmentType')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'adjustment_plus', label: 'Add Stock' },
                  { id: 'adjustment_minus', label: 'Remove Stock' },
                  { id: 'transfer', label: 'Transfer' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAdjustType(opt.id as any)}
                    className={`p-2 text-center rounded-xl text-[10px] font-bold transition-all border ${
                      adjustType === opt.id 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Adjustment Qty</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value) || 1)}
                  className="w-full bg-slate-950/60 border border-white/5 text-white font-mono p-2 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current Stock Level</label>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5 font-mono text-center text-indigo-300 font-bold">
                  {activeProduct ? activeProduct.stock : 0} units
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('reason')}</label>
              <input
                type="text"
                required
                placeholder="e.g. Broken zipper mark out, showroom giveaway"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 text-white p-2.5 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={products.length === 0}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20"
            >
              Commit Stock Adjustment
            </button>
          </form>
        </div>

        {/* LOG HISTORY LIST */}
        <div className="lg:col-span-8 bg-slate-900/30 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              {t('movementHistory')}
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit reasons, products..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-lg py-1.5 px-8 text-[11px] text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition-all"
                id="inventory-audit-search"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="inventory-movements-table">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                  <th className="p-3">{t('date')}</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">{t('sku')}</th>
                  <th className="p-3 text-center">{t('qty')}</th>
                  <th className="p-3">{t('reason')}</th>
                  <th className="p-3">{t('operatorName')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredMovements.map((mv) => {
                  const isAdd = mv.type === 'in' || mv.type === 'adjustment_plus';
                  const isTransfer = mv.type === 'transfer';

                  return (
                    <tr key={mv.id} className="hover:bg-white/5 transition-all text-[11px]">
                      <td className="p-3 font-mono text-slate-400">{new Date(mv.timestamp).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-white">{mv.productName}</td>
                      <td className="p-3 font-mono text-slate-400">{mv.sku}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          isTransfer ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/20' :
                          isAdd ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/20' :
                          'bg-rose-950 text-rose-300 border border-rose-500/20'
                        }`}>
                          {isTransfer ? '⇅' : isAdd ? '+' : '-'}{mv.quantity} units
                        </span>
                      </td>
                      <td className="p-3 italic text-slate-300 max-w-[150px] truncate" title={mv.reason}>"{mv.reason}"</td>
                      <td className="p-3 text-slate-400">{mv.operatorName}</td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No stock history recorded matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

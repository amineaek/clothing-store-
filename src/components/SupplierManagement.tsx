/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { Supplier, Product, StockMovement } from '../types';
import { 
  Plus, Edit, Search, Phone, Mail, MapPin, 
  Truck, ArrowUpRight, History, X, Save, Clipboard, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupplierProps {
  suppliers: Supplier[];
  products: Product[];
  currency: string;
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onLogSupplyOrder: (supplierId: string, productId: string, qty: number, unitCost: number) => void;
}

export const SupplierManagement: React.FC<SupplierProps> = ({
  suppliers,
  products,
  currency,
  onSaveSupplier,
  onDeleteSupplier,
  onLogSupplyOrder
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  
  // Modal states
  const [isEditing, setIsEditing] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Supply run log modal
  const [showSupplyRunModal, setShowSupplyRunModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [supplyQty, setSupplyQty] = useState(10);
  const [supplyUnitCost, setSupplyUnitCost] = useState(15);
  const [paymentOption, setPaymentOption] = useState<'pay_now' | 'add_debt'>('pay_now');

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
    );
  }, [suppliers, search]);

  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || filteredSuppliers[0];
  }, [suppliers, selectedSupplierId, filteredSuppliers]);

  // Open edit / register form
  const startEdit = (supplier: Supplier | null) => {
    if (supplier) {
      setEditingSupplier({ ...supplier });
    } else {
      setEditingSupplier({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        outstandingBalance: 0
      });
    }
    setIsEditing(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const validated: Supplier = {
      id: editingSupplier.id || `sup-${Date.now()}`,
      name: editingSupplier.name || 'Unnamed Supplier',
      contactName: editingSupplier.contactName || '',
      email: editingSupplier.email || '',
      phone: editingSupplier.phone || '',
      address: editingSupplier.address || '',
      outstandingBalance: Number(editingSupplier.outstandingBalance) || 0
    };

    onSaveSupplier(validated);
    setSelectedSupplierId(validated.id);
    setIsEditing(false);
    setEditingSupplier(null);
  };

  const handleLogSupplyConfirm = () => {
    if (!activeSupplier || !selectedProductId) return;
    onLogSupplyOrder(activeSupplier.id, selectedProductId, supplyQty, supplyUnitCost);

    // If payment option is 'add_debt', we increase what we owe them
    if (paymentOption === 'add_debt') {
      const addedBalance = supplyQty * supplyUnitCost;
      const updated = {
        ...activeSupplier,
        outstandingBalance: activeSupplier.outstandingBalance + addedBalance
      };
      onSaveSupplier(updated);
    }

    setSupplyQty(10);
    setShowSupplyRunModal(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-[500px]" id="suppliers-management-container">
      {/* LEFT LIST PANEL */}
      <div className="md:col-span-4 bg-slate-900/30 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between" id="suppliers-listing-panel">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">{t('suppliers')}</h2>
            <button
              onClick={() => startEdit(null)}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              id="btn-supplier-add"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/40 border border-white/5 rounded-xl py-2 px-9 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition-all"
              id="supplier-search-input"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[55vh] pr-1" id="suppliers-profile-list">
            {filteredSuppliers.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedSupplierId(s.id)}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  selectedSupplierId === s.id 
                    ? 'bg-indigo-950/30 border-indigo-500/40' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white">{s.name}</h4>
                  {s.outstandingBalance > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded">
                      We Owe: {currency}{s.outstandingBalance}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{s.contactName} • {s.phone || 'No phone'}</p>
              </div>
            ))}

            {filteredSuppliers.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">No suppliers registered yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT DISPLAY PANEL */}
      <div className="md:col-span-8 bg-slate-900/30 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md" id="supplier-detail-panel">
        {activeSupplier ? (
          <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h1 className="text-xl font-bold text-white">{activeSupplier.name}</h1>
                <p className="text-xs text-slate-400 mt-1">Contact representative: {activeSupplier.contactName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(activeSupplier)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold rounded-xl border border-white/5 transition-all flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  {t('edit')}
                </button>
                <button
                  onClick={() => onDeleteSupplier(activeSupplier.id)}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/10 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('delete')}
                </button>
              </div>
            </div>

            {/* Balances banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="supplier-balances-banner">
              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('outstandingBalance')}</p>
                <p className="text-lg font-bold text-rose-400 mt-1">{currency}{activeSupplier.outstandingBalance.toFixed(2)}</p>
                {activeSupplier.outstandingBalance > 0 && (
                  <button
                    onClick={() => {
                      const payOffAmount = prompt("Enter amount to pay off:", String(activeSupplier.outstandingBalance));
                      if (payOffAmount) {
                        const validated = Math.max(activeSupplier.outstandingBalance - Number(payOffAmount), 0);
                        onSaveSupplier({ ...activeSupplier, outstandingBalance: validated });
                      }
                    }}
                    className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 flex items-center"
                  >
                    Clear Balance Debt <ArrowUpRight className="w-3 h-3 ms-1" />
                  </button>
                )}
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Logistics Action Center</p>
                <p className="text-xs text-slate-300 mt-1.5">Directly record supply cargo runs to update your stock instantly.</p>
                <button
                  onClick={() => {
                    if (products.length > 0) {
                      setSelectedProductId(products[0].id);
                      setSupplyUnitCost(products[0].costPrice);
                      setShowSupplyRunModal(true);
                    } else {
                      alert("Configure products first before planning supply runs.");
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  Log Incoming Shipment Cargo
                </button>
              </div>
            </div>

            {/* Address & Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  Headquarters
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">{activeSupplier.address || 'No location coordinates registered.'}</p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  Communication Channels
                </h4>
                <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-500" /> {activeSupplier.email || 'N/A'}</p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-500" /> {activeSupplier.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <Truck className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{t('noData')}</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT SUPPLIER DIALOG */}
      <AnimatePresence>
        {isEditing && editingSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-white">{editingSupplier.id ? t('editSupplier') : t('addSupplier')}</h3>
                <button onClick={() => setIsEditing(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Supplier Company Name</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Contact person</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.contactName || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, contactName: e.target.value })}
                    className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingSupplier.email || ''}
                      onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                      className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editingSupplier.phone || ''}
                      onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                      className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Corporate Address</label>
                  <input
                    type="text"
                    value={editingSupplier.address || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                    className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Outstanding Balance We Owe them ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingSupplier.outstandingBalance || 0}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, outstandingBalance: Number(e.target.value) })}
                    className="w-full bg-slate-850 text-white font-mono border border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">Save Supplier</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUPPLY LOG SHIPMENT MODAL */}
      <AnimatePresence>
        {showSupplyRunModal && activeSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                Log Supply Shipment
              </h3>
              
              <div className="space-y-4 text-xs">
                {/* Pick product */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Garment Item</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const p = products.find(prod => prod.id === e.target.value);
                      if (p) setSupplyUnitCost(p.costPrice);
                    }}
                    className="w-full bg-slate-850 border border-white/10 text-white rounded-xl p-2.5 outline-none"
                  >
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} [{p.sku}]</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Supply Qty</label>
                    <input
                      type="number"
                      value={supplyQty}
                      onChange={(e) => setSupplyQty(Number(e.target.value) || 0)}
                      className="w-full bg-slate-850 border border-white/10 text-white font-mono p-2 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Unit Cost Price ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={supplyUnitCost}
                      onChange={(e) => setSupplyUnitCost(Number(e.target.value) || 0)}
                      className="w-full bg-slate-850 border border-white/10 text-white font-mono p-2 rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* Outstanding balance or fully paid */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Settlement</label>
                  <div className="flex gap-4 mt-1.5">
                    <label className="flex items-center gap-1.5 text-white">
                      <input
                        type="radio"
                        name="pay_opt"
                        checked={paymentOption === 'pay_now'}
                        onChange={() => setPaymentOption('pay_now')}
                        className="text-indigo-600 focus:ring-0"
                      />
                      Paid Immediately
                    </label>
                    <label className="flex items-center gap-1.5 text-white">
                      <input
                        type="radio"
                        name="pay_opt"
                        checked={paymentOption === 'add_debt'}
                        onChange={() => setPaymentOption('add_debt')}
                        className="text-indigo-600 focus:ring-0"
                      />
                      Add to Balance We Owe
                    </label>
                  </div>
                </div>

                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Supply Run Cost</p>
                  <p className="text-xl font-bold text-white mt-1">{currency}{(supplyQty * supplyUnitCost).toFixed(2)}</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowSupplyRunModal(false)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-xl">Cancel</button>
                  <button type="button" onClick={handleLogSupplyConfirm} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl">Record shipment</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

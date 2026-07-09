/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { Customer, Sale } from '../types';
import { 
  Plus, Edit, Search, Phone, Mail, MapPin, 
  Wallet, FileText, ArrowUpRight, History, X, Save, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerManagementProps {
  customers: Customer[];
  sales: Sale[];
  currency: string;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  sales,
  currency,
  onSaveCustomer,
  onDeleteCustomer
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  
  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  // Financial adjust modal
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeType, setFinanceType] = useState<'pay_debt' | 'add_credit'>('pay_debt');
  const [financeAmount, setFinanceAmount] = useState<number>(0);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    );
  }, [customers, search]);

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0];
  }, [customers, selectedCustomerId, filteredCustomers]);

  // Total customer orders and total spend metrics
  const customerAnalytics = useMemo(() => {
    if (!activeCustomer) return { totalSpend: 0, orderCount: 0, purchaseList: [] as Sale[] };
    
    const purchaseList = sales.filter(s => s.customerId === activeCustomer.id);
    const totalSpend = purchaseList.reduce((acc, curr) => acc + curr.total, 0);
    
    return {
      totalSpend,
      orderCount: purchaseList.length,
      purchaseList
    };
  }, [activeCustomer, sales]);

  // Open Edit / Create form
  const startEdit = (customer: Customer | null) => {
    if (customer) {
      setEditingCustomer({ ...customer });
    } else {
      setEditingCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        debt: 0,
        credit: 0,
        notes: ''
      });
    }
    setIsEditing(true);
  };

  // Submit profile
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const validated: Customer = {
      id: editingCustomer.id || `cust-${Date.now()}`,
      name: editingCustomer.name || 'Unnamed Profile',
      email: editingCustomer.email || '',
      phone: editingCustomer.phone || '',
      address: editingCustomer.address || '',
      debt: Number(editingCustomer.debt) || 0,
      credit: Number(editingCustomer.credit) || 0,
      notes: editingCustomer.notes || '',
      createdAt: editingCustomer.createdAt || new Date().toISOString()
    };

    onSaveCustomer(validated);
    setSelectedCustomerId(validated.id);
    setIsEditing(false);
    setEditingCustomer(null);
  };

  // Financial credit/debt adjuster
  const handleFinanceAdjust = () => {
    if (!activeCustomer) return;
    const amount = Number(financeAmount);
    if (amount <= 0) return;

    const updated = { ...activeCustomer };
    if (financeType === 'pay_debt') {
      updated.debt = Math.max(updated.debt - amount, 0);
    } else if (financeType === 'add_credit') {
      updated.credit += amount;
    }

    onSaveCustomer(updated);
    setFinanceAmount(0);
    setShowFinanceModal(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-[500px]" id="crm-system-container">
      {/* LEFT LIST PANEL */}
      <div className="md:col-span-4 bg-slate-900/30 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between" id="crm-listing-panel">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">{t('customers')}</h2>
            <button
              onClick={() => startEdit(null)}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              id="btn-crm-add"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/40 border border-white/5 rounded-xl py-2 px-9 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition-all"
              id="crm-search-input"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[55vh] pr-1" id="crm-profile-list">
            {filteredCustomers.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  selectedCustomerId === c.id 
                    ? 'bg-indigo-950/30 border-indigo-500/40' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white">{c.name}</h4>
                  {c.debt > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded">
                      Debt: {currency}{c.debt}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{c.phone || 'No phone'}</p>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">No customers profiles found.</p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT DISPLAY PROFILE */}
      <div className="md:col-span-8 bg-slate-900/30 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md" id="crm-detail-panel">
        {activeCustomer ? (
          <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h1 className="text-xl font-bold text-white">{activeCustomer.name}</h1>
                <p className="text-xs text-slate-400 mt-1">Profile created: {new Date(activeCustomer.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(activeCustomer)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold rounded-xl border border-white/5 transition-all flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  {t('edit')}
                </button>
                <button
                  onClick={() => onDeleteCustomer(activeCustomer.id)}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/10 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('delete')}
                </button>
              </div>
            </div>

            {/* Financial Status Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="crm-financials-banner">
              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('debt')}</p>
                <p className="text-lg font-bold text-rose-400 mt-1">{currency}{activeCustomer.debt.toFixed(2)}</p>
                {activeCustomer.debt > 0 && (
                  <button
                    onClick={() => { setFinanceType('pay_debt'); setFinanceAmount(activeCustomer.debt); setShowFinanceModal(true); }}
                    className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 flex items-center"
                  >
                    Receive Payment <ArrowUpRight className="w-3 h-3 ms-1" />
                  </button>
                )}
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('credit')}</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">{currency}{activeCustomer.credit.toFixed(2)}</p>
                <button
                  onClick={() => { setFinanceType('add_credit'); setFinanceAmount(0); setShowFinanceModal(true); }}
                  className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 flex items-center"
                >
                  Issue Credit <ArrowUpRight className="w-3 h-3 ms-1" />
                </button>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Purchase Volume</p>
                <p className="text-lg font-bold text-white mt-1">{currency}{customerAnalytics.totalSpend.toFixed(2)}</p>
                <p className="text-[9px] text-slate-400 mt-1.5">{customerAnalytics.orderCount} complete sales</p>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Contact Point</p>
                <div className="space-y-1 mt-2 text-[10px] text-slate-300">
                  <p className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 text-slate-500" /> {activeCustomer.email || 'N/A'}</p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" /> {activeCustomer.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Address & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  {t('address')}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">{activeCustomer.address || 'No billing address provided.'}</p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {t('notes')}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pt-1 italic">
                  {activeCustomer.notes ? `"${activeCustomer.notes}"` : 'No customer-specific CRM notes available.'}
                </p>
              </div>
            </div>

            {/* Purchase History */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-indigo-400" />
                {t('purchaseHistory')}
              </h4>
              
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {customerAnalytics.purchaseList.map(sale => (
                  <div key={sale.id} className="flex justify-between items-center p-3 bg-slate-950/40 rounded-lg border border-white/5 text-xs">
                    <div>
                      <p className="font-semibold text-white">{sale.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(sale.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-white">{currency}{sale.total.toFixed(2)}</p>
                      <p className="text-[10px] text-indigo-300 mt-0.5 uppercase font-semibold">{sale.paymentDetails.method}</p>
                    </div>
                  </div>
                ))}

                {customerAnalytics.purchaseList.length === 0 && (
                  <p className="text-xs text-slate-500 py-6 text-center">No purchases recorded under this customer profile.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <Plus className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{t('noData')}</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CUSTOMER DIALOG */}
      <AnimatePresence>
        {isEditing && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-white">{editingCustomer.id ? t('editCustomer') : t('addCustomer')}</h3>
                <button onClick={() => setIsEditing(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingCustomer.email || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                      className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editingCustomer.phone || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                      className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Billing Address</label>
                  <input
                    type="text"
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Notes / Preferences</label>
                  <textarea
                    value={editingCustomer.notes || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                    className="w-full bg-slate-850 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">Save CRM Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FINANCE PAYMENT ADJUSTER MODAL */}
      <AnimatePresence>
        {showFinanceModal && activeCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white mb-3">
                {financeType === 'pay_debt' ? t('debtPayment') : t('addCredit')}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {financeType === 'pay_debt' 
                  ? `Pay off outstanding balance for ${activeCustomer.name}. Current debt: ${currency}${activeCustomer.debt}`
                  : `Issue custom store credit to ${activeCustomer.name}.`
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Transaction Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={financeAmount}
                    onChange={(e) => setFinanceAmount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-850 border border-white/10 text-white font-mono text-sm p-2.5 rounded-xl outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowFinanceModal(false)} className="px-4 py-2 bg-white/5 text-slate-300 text-xs rounded-xl">Cancel</button>
                  <button onClick={handleFinanceAdjust} className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Confirm Settlement</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

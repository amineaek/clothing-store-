/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { Product, Customer, SaleItem, Sale, HoldSale, PaymentDetails } from '../types';
import { 
  Barcode, Search, UserPlus, ShoppingCart, Percent, 
  Trash2, Plus, Minus, CreditCard, RotateCcw, 
  Pause, Play, AlertCircle, Printer, X, Check, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface POSViewProps {
  products: Product[];
  customers: Customer[];
  storeSettings: any;
  currentOperator: any;
  onCompleteSale: (sale: Sale) => void;
  onHoldSale: (hold: HoldSale) => void;
  onReleaseHoldSale: (id: string) => void;
  heldSales: HoldSale[];
  onAddCustomer: (customer: Customer) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  customers,
  storeSettings,
  currentOperator,
  onCompleteSale,
  onHoldSale,
  onReleaseHoldSale,
  heldSales,
  onAddCustomer
}) => {
  const { t, isRtl } = useLanguage();
  const { currency, receiptFooter, receiptWidth } = storeSettings;

  // Search & Barcode states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart items
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0); // Global discount rate %

  // Checkout states
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'split'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);

  // Completed sale receipt
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Hold sale state
  const [holdNotes, setHoldNotes] = useState('');
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Return mode state
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');

  // Autofocus ref for barcode input
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Size selection states
  const [sizeSelectionProduct, setSizeSelectionProduct] = useState<Product | null>(null);

  // Categories helper
  const categoriesList = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Autofocus management
  const focusBarcode = () => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  useEffect(() => {
    focusBarcode();
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.sku.toLowerCase().includes(productSearch.toLowerCase());
      return matchCat && matchSearch && p.stock > 0;
    });
  }, [products, selectedCategory, productSearch]);

  // Handle Scan/BarcodeInput Submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = barcodeInput.trim();
    if (!cleanCode) return;

    // Find product matching primary barcode, alternative barcodes, or exact SKU
    const product = products.find(p => 
      p.barcode === cleanCode || 
      p.additionalBarcodes.includes(cleanCode) || 
      p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (product) {
      addItemToCart(product);
      setBarcodeInput('');
    } else {
      alert(`Product with identifier "${cleanCode}" not found.`);
    }
    focusBarcode();
  };

  // Add Item to cart
  const addItemToCart = (product: Product, selectedSize?: string) => {
    // If the product has multiple sizes, and no size is pre-selected, prompt the cashier
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeSelectionProduct(product);
      return;
    }

    setCartItems(prev => {
      const activeSize = selectedSize || product.size || '';
      const existing = prev.find(item => item.productId === product.id && item.size === activeSize);
      
      let maxStock = product.stock;
      if (activeSize && product.sizes && product.sizes.length > 0) {
        const sizeObj = product.sizes.find(s => s.size === activeSize);
        maxStock = sizeObj ? sizeObj.stock : 0;
      }

      if (existing) {
        // limit by stock
        const newQty = existing.qty + 1;
        if (newQty > maxStock) {
          alert(`Stock insuffisant. Seulement ${maxStock} unités disponibles pour la taille ${activeSize}.`);
          return prev;
        }
        return prev.map(item => (item.productId === product.id && item.size === activeSize) ? { ...item, qty: newQty } : item);
      } else {
        if (maxStock <= 0) {
          alert(`Stock insuffisant. Cette taille est en rupture de stock.`);
          return prev;
        }
        return [...prev, {
          id: `sitem-${Date.now()}-${product.id}-${activeSize || 'default'}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          size: activeSize,
          color: product.color,
          qty: 1,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice * (1 - (product.discount / 100)),
          originalPrice: product.sellingPrice,
          catalogPrice: product.sellingPrice, // Save catalog price separately!
          discount: product.discount
        }];
      }
    });
    focusBarcode();
  };

  // Update Cart Qty
  const updateQty = (itemId: string, diff: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const prod = products.find(p => p.id === item.productId);
          const newQty = item.qty + diff;
          if (newQty <= 0) return item;
          
          if (prod) {
            let maxStock = prod.stock;
            if (item.size && prod.sizes && prod.sizes.length > 0) {
              const sizeObj = prod.sizes.find(s => s.size === item.size);
              maxStock = sizeObj ? sizeObj.stock : 0;
            }
            if (newQty > maxStock) {
              alert(`Stock insuffisant! Max ${maxStock} unités disponibles pour la taille ${item.size || ''}.`);
              return item;
            }
          }
          return { ...item, qty: newQty };
        }
        return item;
      });
    });
  };

  // Update selling price manually in POS
  const updatePrice = (itemId: string, newPrice: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          return { ...item, sellingPrice: Number(newPrice) || 0 };
        }
        return item;
      });
    });
  };

  // Update single item discount
  const updateItemDiscount = (itemId: string, discRate: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const discount = Math.min(Math.max(Number(discRate) || 0, 0), 100);
          const sellingPrice = item.originalPrice * (1 - (discount / 100));
          return { ...item, discount, sellingPrice };
        }
        return item;
      });
    });
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    focusBarcode();
  };

  // Subtotal & Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + (curr.sellingPrice * curr.qty), 0);
  }, [cartItems]);

  const globalDiscountAmount = useMemo(() => {
    return subtotal * (globalDiscount / 100);
  }, [subtotal, globalDiscount]);

  const subtotalAfterDiscount = subtotal - globalDiscountAmount;

  const totalAmount = subtotalAfterDiscount;

  const totalCost = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + (curr.costPrice * curr.qty), 0);
  }, [cartItems]);

  const totalProfit = useMemo(() => {
    return subtotalAfterDiscount - totalCost;
  }, [subtotalAfterDiscount, totalCost]);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Handle hold sale
  const handleHoldSaleConfirm = () => {
    if (cartItems.length === 0) return;
    const hold: HoldSale = {
      id: `hold-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: [...cartItems],
      customerId: selectedCustomerId,
      customerName: selectedCustomer ? selectedCustomer.name : undefined,
      notes: holdNotes
    };
    onHoldSale(hold);
    setCartItems([]);
    setGlobalDiscount(0);
    setSelectedCustomerId('');
    setHoldNotes('');
    setShowHoldModal(false);
  };

  // Resume sale callback
  const handleResumeSaleSelect = (hold: HoldSale) => {
    setCartItems(hold.items);
    setSelectedCustomerId(hold.customerId || '');
    onReleaseHoldSale(hold.id);
    setShowResumeModal(false);
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cartItems.length === 0) return;
    setCashReceived(Math.ceil(totalAmount));
    setCardAmount(0);
    setTransferAmount(0);
    setPaymentMethod('cash');
    setShowCheckout(true);
  };

  // Confirm Sale
  const handleConfirmCheckout = () => {
    const sale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: isReturnMode ? `RET-2026-${Math.floor(1000 + Math.random() * 9000)}` : `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      items: [...cartItems],
      subtotal,
      discountAmount: globalDiscountAmount,
      total: isReturnMode ? -totalAmount : totalAmount,
      profit: isReturnMode ? -totalProfit : totalProfit,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer ? selectedCustomer.name : t('walkInCustomer'),
      paymentDetails: {
        method: paymentMethod,
        cashAmount: paymentMethod === 'cash' ? cashReceived : (paymentMethod === 'split' ? cashReceived : 0),
        cardAmount: paymentMethod === 'card' ? totalAmount : (paymentMethod === 'split' ? cardAmount : 0),
        transferAmount: paymentMethod === 'transfer' ? totalAmount : (paymentMethod === 'split' ? transferAmount : 0)
      },
      operatorId: currentOperator.id,
      operatorName: currentOperator.name,
      status: isReturnMode ? 'returned' : 'completed'
    };

    onCompleteSale(sale);
    setCompletedSale(sale);
    setCartItems([]);
    setGlobalDiscount(0);
    setSelectedCustomerId('');
    setShowCheckout(false);
    setIsReturnMode(false);
  };

  // Print Receipt handler
  const printInvoice = () => {
    const printContent = document.getElementById("thermal-receipt-printable");
    if (!printContent) return;
    
    const win = window.open('', '', 'width=350,height=600');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Vanguard POS Receipt</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; margin: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .right { text-align: right; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[calc(100vh-150px)]" id="pos-interface-grid">
      {/* LEFT PANEL: Garments Grid & Catalog Filters */}
      <div className="lg:col-span-7 flex flex-col space-y-4" id="pos-catalogue-panel">
        {/* Large Scan Barcode box */}
        <form onSubmit={handleBarcodeSubmit} className="bg-gradient-to-r from-indigo-950/40 to-slate-950/40 p-4 rounded-2xl border border-indigo-500/15 shadow-xl backdrop-blur-md flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Barcode className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 block mb-1">
              {t('scanOrEnter')}
            </label>
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan or type barcode (e.g. 840019280012) and press Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white text-lg placeholder-slate-500 font-mono"
              id="barcode-input"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            Enter
          </button>
        </form>

        {/* Categories Scroller */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" id="pos-category-scroller">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10' 
                  : 'bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Catalog */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by keyword..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2 px-9 text-xs text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition-all"
            id="pos-search-input"
          />
        </div>

        {/* Visual Garment Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] pr-1" id="pos-garment-grid">
          {filteredProducts.map(p => (
            <div
              key={p.id}
              onClick={() => addItemToCart(p)}
              className="cursor-pointer group relative bg-slate-900/30 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-950/10 rounded-2xl overflow-hidden p-3 transition-all flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-white/5 relative mb-2">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg text-indigo-400 bg-indigo-950/20">
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {p.stock <= p.minStock && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-600 text-[9px] font-bold text-white rounded-md">
                      Low
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                <div className="flex gap-1.5 mt-1">
                  {p.size && <span className="text-[9px] px-1 bg-white/5 rounded text-slate-400 font-mono">SZ: {p.size}</span>}
                  {p.color && <span className="text-[9px] px-1 bg-white/5 rounded text-slate-400 truncate max-w-[60px]">{p.color}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs font-bold text-indigo-300">{currency}{p.sellingPrice.toFixed(2)}</span>
                <span className="text-[9px] text-slate-500 font-mono">{p.stock} left</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Dynamic Cart, Customer, Holds & Checkout */}
      <div className="lg:col-span-5 flex flex-col bg-slate-900/30 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur-md justify-between" id="pos-billing-panel">
        <div>
          {/* Header & Active Operator Indicator */}
          <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">{t('currentOperator')}:</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-md">
              {currentOperator.name} ({t(currentOperator.role)})
            </span>
          </div>

          {/* Customer CRM Selector */}
          <div className="flex gap-2 mb-4" id="pos-customer-selector-container">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-slate-950/60 border border-white/5 text-xs text-white rounded-xl p-2 outline-none"
            >
              <option value="">👤 -- {t('walkInCustomer')} --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  👤 {c.name} {c.debt > 0 ? `(Debt: ${currency}${c.debt})` : ''} {c.credit > 0 ? `(Credit: ${currency}${c.credit})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart item listing */}
          <div className="space-y-2 overflow-y-auto max-h-[35vh] pr-1 scrollbar-thin" id="pos-cart-items-container">
            {cartItems.map(item => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-white/5 rounded-xl hover:bg-slate-950/60 transition-all"
              >
                <div className="flex-1 pr-2">
                  <p className="text-xs font-semibold text-white leading-tight">{item.name}</p>
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">{item.sku} {item.size ? `[${item.size}]` : ''}</p>
                  
                  {/* Inline editable pricing and discount */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Price:</span>
                      <input
                        type="number"
                        value={item.sellingPrice}
                        onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                        className="w-14 bg-slate-900 border border-white/5 rounded px-1 py-0.5 text-[10px] font-mono text-white text-end"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Disc%:</span>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItemDiscount(item.id, Number(e.target.value))}
                        className="w-10 bg-slate-900 border border-white/5 rounded px-1 py-0.5 text-[10px] font-mono text-white text-end"
                      />
                    </div>
                  </div>
                </div>

                {/* Qty edit buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-white/5">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      className="p-1 hover:bg-white/5 text-slate-300 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-semibold text-white">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="p-1 hover:bg-white/5 text-slate-300 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cartItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">{t('noData')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Calculation summary block */}
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3" id="pos-calculation-block">
          {/* Global discount selector */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-indigo-400" />
              {t('globalDiscount')}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Math.min(Math.max(Number(e.target.value) || 0, 0), 100))}
                className="w-12 bg-slate-950 border border-white/10 rounded-lg p-1 text-center font-mono text-xs text-white"
              />
              <span className="text-slate-400">%</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>{t('subtotal')}</span>
              <span className="font-mono">{currency}{subtotal.toFixed(2)}</span>
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between text-rose-400 font-semibold">
                <span>Discount ({globalDiscount}%)</span>
                <span className="font-mono">-{currency}{globalDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-base font-bold text-white pt-1.5 border-t border-white/5">
              <span>{t('total')}</span>
              <span className="font-mono text-lg text-indigo-400">{currency}{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Order State Controllers */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <button
              onClick={() => {
                if (cartItems.length > 0) {
                  setHoldNotes('');
                  setShowHoldModal(true);
                }
              }}
              disabled={cartItems.length === 0}
              className="px-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 text-amber-400 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
              title="Hold sale"
            >
              <Pause className="w-4 h-4" />
              Hold
            </button>
            <button
              onClick={() => setShowResumeModal(true)}
              className="px-2 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
              title="Resume sale"
            >
              <Play className="w-4 h-4" />
              Resume ({heldSales.length})
            </button>
            <button
              onClick={() => {
                setCartItems([]);
                setGlobalDiscount(0);
                setSelectedCustomerId('');
                setIsReturnMode(false);
              }}
              disabled={cartItems.length === 0}
              className="px-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-400 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
              title="Clear cart"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={() => {
                setIsReturnMode(prev => !prev);
              }}
              className={`px-2 py-2 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                isReturnMode 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'
              }`}
              title="Return sale item"
            >
              <RotateCcw className="w-4 h-4" />
              Return {isReturnMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* PAY BUTTON */}
          <button
            onClick={handleOpenCheckout}
            disabled={cartItems.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            id="btn-pos-pay"
          >
            <CreditCard className="w-4 h-4" />
            {isReturnMode ? 'Confirm Return Refund' : `${t('pay')} ${currency}${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* HOLD MODAL */}
      <AnimatePresence>
        {showHoldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white mb-3">{t('holdSale')}</h3>
              <p className="text-xs text-slate-400 mb-4">Temporarily freeze this cart to process another customer.</p>
              <textarea
                placeholder={t('holdSaleNotes')}
                value={holdNotes}
                onChange={(e) => setHoldNotes(e.target.value)}
                className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 outline-none mb-4"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowHoldModal(false)} className="px-4 py-2 bg-white/5 text-slate-300 text-xs rounded-xl">Cancel</button>
                <button onClick={handleHoldSaleConfirm} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl">Confirm Hold</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESUME MODAL */}
      <AnimatePresence>
        {showResumeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-white">{t('resumeSale')}</h3>
                <button onClick={() => setShowResumeModal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {heldSales.map(hold => (
                  <div key={hold.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                    <div>
                      <p className="text-xs font-semibold text-white">{hold.customerName || t('walkInCustomer')}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{hold.items.length} items • {new Date(hold.timestamp).toLocaleTimeString()}</p>
                      {hold.notes && <p className="text-[10px] text-amber-300 italic mt-1">"{hold.notes}"</p>}
                    </div>
                    <button
                      onClick={() => handleResumeSaleSelect(hold)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Resume
                    </button>
                  </div>
                ))}

                {heldSales.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">No held sales found.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHECKOUT SPLIT PAYMENT MODAL */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-white">Payment Settlement</h3>
                <button onClick={() => setShowCheckout(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                {/* Due amount summary */}
                <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/10 text-center">
                  <p className="text-xs text-indigo-300 font-semibold">{isReturnMode ? 'TOTAL REFUND DUE' : 'TOTAL PAYMENT DUE'}</p>
                  <p className="text-3xl font-mono font-bold text-white mt-1">{currency}{totalAmount.toFixed(2)}</p>
                </div>

                {/* Method selector */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">{t('paymentMethod')}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['cash', 'card', 'transfer', 'split'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m as any);
                          if (m === 'cash') {
                            setCashReceived(Math.ceil(totalAmount));
                            setCardAmount(0);
                            setTransferAmount(0);
                          } else if (m === 'card') {
                            setCashReceived(0);
                            setCardAmount(totalAmount);
                            setTransferAmount(0);
                          } else if (m === 'transfer') {
                            setCashReceived(0);
                            setCardAmount(0);
                            setTransferAmount(totalAmount);
                          } else {
                            // split defaults
                            setCashReceived(Math.floor(totalAmount / 2));
                            setCardAmount(totalAmount - Math.floor(totalAmount / 2));
                            setTransferAmount(0);
                          }
                        }}
                        className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold transition-all border ${
                          paymentMethod === m 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {m === 'cash' ? t('cash') : m === 'card' ? t('card') : m === 'transfer' ? t('transfer') : t('split')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Input Fields */}
                {paymentMethod === 'cash' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('cashReceived')}</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                      className="w-full bg-slate-850 border border-white/10 rounded-xl p-2.5 font-mono text-sm text-white"
                    />
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <span className="text-slate-400">{t('changeDue')}</span>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        {currency}{Math.max(cashReceived - totalAmount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Split breakdown */}
                {paymentMethod === 'split' && (
                  <div className="space-y-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cash Contribution ({currency})</label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Card Contribution ({currency})</label>
                      <input
                        type="number"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(Number(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 font-mono text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                      <span className="text-slate-400">Total Contribution:</span>
                      <span className="font-mono text-white font-semibold">{currency}{(cashReceived + cardAmount).toFixed(2)}</span>
                    </div>
                    {(cashReceived + cardAmount) < totalAmount && (
                      <p className="text-[10px] text-rose-400 font-semibold">{t('splitRequired')}: {currency}{(totalAmount - (cashReceived + cardAmount)).toFixed(2)}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleConfirmCheckout}
                  disabled={paymentMethod === 'split' && (cashReceived + cardAmount) < totalAmount}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg"
                >
                  Complete Settlement & Print
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPLETED RECEIPT MODAL */}
      <AnimatePresence>
        {completedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-white">{t('receiptPreview')}</h3>
                <button onClick={() => setCompletedSale(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              {/* Receipt Layout */}
              <div 
                className="bg-white text-black p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[50vh]"
                id="thermal-receipt-printable"
              >
                <div className="text-center">
                  <h2 className="text-sm font-bold uppercase">{storeSettings.storeName}</h2>
                  <p className="text-[10px]">{storeSettings.address}</p>
                  <p className="text-[10px]">Tel: {storeSettings.phone}</p>
                  <div className="line"></div>
                </div>

                <div className="space-y-1 text-[10px]">
                  <p><span className="bold">Invoice:</span> {completedSale.invoiceNumber}</p>
                  <p><span className="bold">Date:</span> {new Date(completedSale.timestamp).toLocaleString()}</p>
                  <p><span className="bold">Operator:</span> {completedSale.operatorName}</p>
                  <p><span className="bold">Customer:</span> {completedSale.customerName}</p>
                  <div className="line"></div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex bold text-[10px]">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/6 text-center">Qty</span>
                    <span className="w-1/3 text-right">Price</span>
                  </div>
                  {completedSale.items.map(item => (
                    <div key={item.id} className="flex text-[10px] leading-tight">
                      <span className="w-1/2">
                        {item.name} 
                        {item.size && <span className="block text-[8px] text-slate-600">[{item.size}]</span>}
                      </span>
                      <span className="w-1/6 text-center">{item.qty}</span>
                      <span className="w-1/3 text-right">{currency}{(item.sellingPrice * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="line"></div>
                </div>

                {/* Total breakdowns */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex">
                    <span>Subtotal:</span>
                    <span>{currency}{completedSale.subtotal.toFixed(2)}</span>
                  </div>
                  {completedSale.discountAmount > 0 && (
                    <div className="flex bold">
                      <span>Discount:</span>
                      <span>-{currency}{completedSale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex bold text-xs pt-1 border-t border-dotted border-black">
                    <span>Total Paid:</span>
                    <span>{currency}{completedSale.total.toFixed(2)}</span>
                  </div>
                  <div className="line"></div>
                </div>

                <div className="text-center text-[9px] mt-2 leading-relaxed">
                  <p className="bold">{receiptFooter}</p>
                  <p className="mt-1">Software: Vanguard Suite ERP</p>
                </div>
              </div>

              {/* Print action buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setCompletedSale(null)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Done
                </button>
                <button
                  onClick={printInvoice}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  {t('printReceipt')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SIZE SELECTION MODAL */}
      <AnimatePresence>
        {sizeSelectionProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-indigo-400" />
                  Sélectionner la taille
                </h3>
                <button onClick={() => setSizeSelectionProduct(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-1">Produit sélectionné :</p>
                <h4 className="text-md font-bold text-white">{sizeSelectionProduct.name}</h4>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">SKU: {sizeSelectionProduct.sku}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-300">Tailles disponibles :</p>
                
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {(sizeSelectionProduct.sizes || []).map((sz, idx) => {
                    const isAvailable = sz.stock > 0;
                    return (
                      <button
                        key={idx}
                        disabled={!isAvailable}
                        onClick={() => {
                          addItemToCart(sizeSelectionProduct, sz.size);
                          setSizeSelectionProduct(null);
                        }}
                        className={`w-full flex justify-between items-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                          isAvailable 
                            ? 'bg-slate-800 border-white/10 hover:border-indigo-500 hover:bg-slate-850 text-white cursor-pointer' 
                            : 'bg-slate-950/40 border-white/5 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-mono text-sm">{sz.size}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono">{sz.stock} en stock</span>
                          {!isAvailable && <span className="block text-[10px] text-rose-500 uppercase font-bold">Rupture</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setSizeSelectionProduct(null)}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

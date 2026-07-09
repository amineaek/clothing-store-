/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { Product } from '../types';
import { 
  Plus, Edit, Trash2, Search, ArrowUpDown, Filter, 
  Upload, Download, Layers, ShieldCheck, ShoppingBag, Eye, X, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductManagementProps {
  products: Product[];
  categories: string[];
  brands: string[];
  currency: string;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onBulkImport: (products: Product[]) => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  categories,
  brands,
  currency,
  onSaveProduct,
  onDeleteProduct,
  onBulkImport
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  
  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [csvText, setCsvText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const [newSizeName, setNewSizeName] = useState('');

  const addSizeItem = () => {
    if (!newSizeName.trim() || !editingProduct) return;
    const sizes = editingProduct.sizes || [];
    if (sizes.some(s => s.size.toLowerCase() === newSizeName.trim().toLowerCase())) {
      alert("Cette taille existe déjà.");
      return;
    }
    const updatedSizes = [...sizes, { size: newSizeName.trim().toUpperCase(), stock: 0 }];
    setEditingProduct({
      ...editingProduct,
      sizes: updatedSizes,
      stock: updatedSizes.reduce((acc, curr) => acc + curr.stock, 0)
    });
    setNewSizeName('');
  };

  const removeSizeItem = (index: number) => {
    if (!editingProduct) return;
    const sizes = editingProduct.sizes || [];
    const updatedSizes = sizes.filter((_, i) => i !== index);
    setEditingProduct({
      ...editingProduct,
      sizes: updatedSizes,
      stock: updatedSizes.reduce((acc, curr) => acc + curr.stock, 0)
    });
  };

  const updateSizeStock = (index: number, stockVal: number) => {
    if (!editingProduct) return;
    const sizes = editingProduct.sizes || [];
    const updatedSizes = sizes.map((item, i) => i === index ? { ...item, stock: stockVal } : item);
    setEditingProduct({
      ...editingProduct,
      sizes: updatedSizes,
      stock: updatedSizes.reduce((acc, curr) => acc + curr.stock, 0)
    });
  };

  // Drag and drop / File upload state for Product Images
  const [dragActive, setDragActive] = useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La taille de l'image ne doit pas dépasser 2 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditingProduct({
        ...editingProduct,
        imageUrl: dataUrl
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/") && editingProduct) {
      if (file.size > 2 * 1024 * 1024) {
        alert("La taille de l'image ne doit pas dépasser 2 Mo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setEditingProduct({
          ...editingProduct,
          imageUrl: dataUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Multi-barcode handling
  const addBarcodeTag = () => {
    if (!newBarcode.trim() || !editingProduct) return;
    const additional = editingProduct.additionalBarcodes || [];
    if (!additional.includes(newBarcode.trim())) {
      setEditingProduct({
        ...editingProduct,
        additionalBarcodes: [...additional, newBarcode.trim()]
      });
    }
    setNewBarcode('');
  };

  const removeBarcodeTag = (code: string) => {
    if (!editingProduct) return;
    const additional = editingProduct.additionalBarcodes || [];
    setEditingProduct({
      ...editingProduct,
      additionalBarcodes: additional.filter(c => c !== code)
    });
  };

  // SKU Auto-generator
  const generateSKU = () => {
    if (!editingProduct) return;
    const catPart = (editingProduct.category || 'GEN').substring(0, 3).toUpperCase();
    const brandPart = (editingProduct.brand || 'VNG').substring(0, 3).toUpperCase();
    const sizePart = (editingProduct.size || 'OS').toUpperCase();
    const colorPart = (editingProduct.color || 'CLR').substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const sku = `${brandPart}-${catPart}-${sizePart}-${colorPart}-${rand}`;
    setEditingProduct({ ...editingProduct, sku });
  };

  // Filter & Search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search) ||
        p.additionalBarcodes.some(code => code.includes(search));

      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      const matchesBrand = !selectedBrand || p.brand === selectedBrand;
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = p.stock <= p.minStock && p.stock > 0;
      } else if (stockFilter === 'out') {
        matchesStock = p.stock === 0;
      }

      return matchesSearch && matchesCategory && matchesBrand && matchesStock;
    }).sort((a, b) => {
      let multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      } else if (sortBy === 'stock') {
        return (a.stock - b.stock) * multiplier;
      } else {
        return (a.sellingPrice - b.sellingPrice) * multiplier;
      }
    });
  }, [products, search, selectedCategory, selectedBrand, stockFilter, sortBy, sortDirection]);

  // Save click
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const sizes = editingProduct.sizes || [];
    const calculatedStock = sizes.length > 0
      ? sizes.reduce((acc, curr) => acc + (curr.stock || 0), 0)
      : Number(editingProduct.stock) || 0;

    const validated: Product = {
      id: editingProduct.id || `prod-${Date.now()}`,
      sku: editingProduct.sku || `SKU-${Date.now()}`,
      name: editingProduct.name || 'Unnamed Product',
      barcode: editingProduct.barcode || String(Math.floor(Math.random() * 900000000000)),
      additionalBarcodes: editingProduct.additionalBarcodes || [],
      category: editingProduct.category || categories[0] || 'Uncategorized',
      brand: editingProduct.brand || brands[0] || 'Unbranded',
      size: editingProduct.size || '',
      color: editingProduct.color || '',
      costPrice: Number(editingProduct.costPrice) || 0,
      sellingPrice: Number(editingProduct.sellingPrice) || 0,
      discount: Number(editingProduct.discount) || 0,
      stock: calculatedStock,
      minStock: Number(editingProduct.minStock) || 5,
      imageUrl: editingProduct.imageUrl || '',
      sizes: sizes.length > 0 ? sizes : undefined
    };

    onSaveProduct(validated);
    setIsEditing(false);
    setEditingProduct(null);
  };

  // Open modal for editing
  const startEdit = (product: Product | null) => {
    if (product) {
      setEditingProduct({ ...product });
    } else {
      setEditingProduct({
        additionalBarcodes: [],
        category: categories[0] || '',
        brand: brands[0] || '',
        stock: 0,
        costPrice: 0,
        sellingPrice: 0,
        discount: 0,
        minStock: 5,
        barcode: String(Math.floor(100000000000 + Math.random() * 900000000000))
      });
    }
    setIsEditing(true);
  };

  // Export to CSV
  const triggerExport = () => {
    const headers = "SKU,Name,Barcode,Category,Brand,Size,Color,CostPrice,SellingPrice,Discount,Stock,MinStock,ImageURL\n";
    const rows = products.map(p => 
      `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.barcode}","${p.category}","${p.brand}","${p.size || ''}","${p.color || ''}",${p.costPrice},${p.sellingPrice},${p.discount},${p.stock},${p.minStock},"${p.imageUrl || ''}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `vanguard_products_${Date.now()}.csv`);
    a.click();
  };

  // Bulk CSV Import
  const handleImportCSV = () => {
    if (!csvText.trim()) return;
    const lines = csvText.split('\n');
    const imported: Product[] = [];
    
    lines.forEach((line, index) => {
      if (index === 0 || !line.trim()) return; // skip header or empty lines
      const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 8) {
        imported.push({
          id: `prod-${Date.now()}-${index}`,
          sku: parts[0] || `SKU-${Date.now()}-${index}`,
          name: parts[1] || 'Bulk Item',
          barcode: parts[2] || String(Math.floor(Math.random() * 900000000000)),
          additionalBarcodes: [],
          category: parts[3] || 'Outerwear',
          brand: parts[4] || 'Vanguard Studio',
          size: parts[5] || '',
          color: parts[6] || '',
          costPrice: Number(parts[7]) || 0,
          sellingPrice: Number(parts[8]) || 0,
          discount: Number(parts[9]) || 0,
          stock: Number(parts[10]) || 0,
          minStock: Number(parts[11]) || 5,
          imageUrl: parts[12] || ''
        });
      }
    });

    if (imported.length > 0) {
      onBulkImport(imported);
      setCsvText('');
      setShowImportModal(false);
    }
  };

  return (
    <div className="space-y-6" id="product-management-section">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white">{t('products')}</h2>
          <p className="text-xs text-slate-400 mt-1">{products.length} products total in database</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={triggerExport}
            className="px-3 py-2 bg-white/5 text-slate-200 hover:bg-white/10 rounded-xl border border-white/5 text-xs font-semibold transition-all flex items-center gap-1.5"
            id="btn-export-products"
          >
            <Download className="w-3.5 h-3.5" />
            {t('bulkExport')}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-white/5 text-slate-200 hover:bg-white/10 rounded-xl border border-white/5 text-xs font-semibold transition-all flex items-center gap-1.5"
            id="btn-import-products"
          >
            <Upload className="w-3.5 h-3.5" />
            {t('bulkImport')}
          </button>
          <button
            onClick={() => startEdit(null)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            id="btn-add-product"
          >
            <Plus className="w-4 h-4" />
            {t('addProduct')}
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" id="product-filters-bar">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, barcode, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/40 border border-white/5 focus:border-indigo-500 rounded-xl py-2 px-10 text-xs text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all"
            id="product-search-input"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900/40 border border-white/5 text-xs text-white rounded-xl p-2 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-slate-900/40 border border-white/5 text-xs text-white rounded-xl p-2 outline-none"
        >
          <option value="">All Brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as any)}
          className="bg-slate-900/40 border border-white/5 text-xs text-white rounded-xl p-2 outline-none"
        >
          <option value="all">All Inventory</option>
          <option value="low">Low Stock Alerts</option>
          <option value="out">Out of Stock</option>
        </select>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 bg-slate-900/40 border border-white/5 text-xs text-white rounded-xl p-2 outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="stock">Sort by Stock</option>
            <option value="price">Sort by Price</option>
          </select>
          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="bg-slate-900/40 hover:bg-slate-800 border border-white/5 rounded-xl px-3 text-white flex items-center justify-center"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="products-table">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                <th className="p-4">{t('image')}</th>
                <th className="p-4">{t('sku')} / {t('barcode')}</th>
                <th className="p-4">{t('products')}</th>
                <th className="p-4">{t('category')} / {t('brand')}</th>
                <th className="p-4 text-end">{t('cost')}</th>
                <th className="p-4 text-end">{t('price')}</th>
                <th className="p-4 text-end">{t('profit')}</th>
                <th className="p-4 text-center">{t('stockLevel')}</th>
                <th className="p-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const profitVal = p.sellingPrice - p.costPrice;
                  const profitPct = p.sellingPrice > 0 ? Math.round((profitVal / p.sellingPrice) * 100) : 0;
                  const isLow = p.stock <= p.minStock && p.stock > 0;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-all">
                      <td className="p-4">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 bg-indigo-950/40 flex items-center justify-center rounded-lg text-indigo-400 font-bold border border-indigo-500/10">
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        <span className="block text-white font-medium">{p.sku}</span>
                        <span className="text-[10px] text-slate-400">{p.barcode}</span>
                      </td>
                      <td className="p-4">
                        <span className="block text-white font-semibold">{p.name}</span>
                        <div className="flex gap-1.5 mt-1">
                          {p.size && <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-bold text-slate-300">Size: {p.size}</span>}
                          {p.color && <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-bold text-slate-300">Color: {p.color}</span>}
                        </div>
                        {p.sizes && p.sizes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.sizes.map(sz => (
                              <span key={sz.size} className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${sz.stock === 0 ? 'bg-slate-950/40 text-slate-600 line-through' : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/5'}`}>
                                {sz.size}:{sz.stock}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="block text-indigo-300">{p.category}</span>
                        <span className="text-[10px] text-slate-400">{p.brand}</span>
                      </td>
                      <td className="p-4 text-end font-mono text-slate-400">{currency}{p.costPrice.toFixed(2)}</td>
                      <td className="p-4 text-end font-mono text-white font-medium">
                        {currency}{p.sellingPrice.toFixed(2)}
                        {p.discount > 0 && <span className="block text-[10px] text-rose-400">-{p.discount}%</span>}
                      </td>
                      <td className="p-4 text-end font-mono">
                        <span className="block text-emerald-400 font-semibold">{currency}{profitVal.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400">({profitPct}%)</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                          isOut ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                          isLow ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {p.stock} units
                        </span>
                      </td>
                      <td className="p-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Drawer Modal */}
      <AnimatePresence>
        {isEditing && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
                <h3 className="text-lg font-bold text-white">
                  {editingProduct.id ? t('editProduct') : t('addProduct')}
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* SKU / Auto Gen */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">SKU identifier</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={editingProduct.sku || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                        className="flex-1 bg-slate-850 text-white font-mono text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={generateSKU}
                        className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  {/* Main Barcode */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Primary Barcode</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.barcode || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full bg-slate-850 text-white font-mono text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('category')}</label>
                    <select
                      value={editingProduct.category || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 outline-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('brand')}</label>
                    <select
                      value={editingProduct.brand || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                      className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 outline-none"
                    >
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* Size */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('size')} (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. M, L, XL, 32"
                      value={editingProduct.size || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                      className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t('color')} (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Obsidian Black"
                      value={editingProduct.color || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                      className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Cost price */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cost Price ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.costPrice || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })}
                      className="w-full bg-slate-850 text-white font-mono text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Selling Retail Price ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.sellingPrice || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })}
                      className="w-full bg-slate-850 text-white font-mono text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Stock level */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      {editingProduct.sizes && editingProduct.sizes.length > 0 ? "Stock Total (Calculé)" : "Stock Level"}
                    </label>
                    <input
                      type="number"
                      required
                      disabled={editingProduct.sizes && editingProduct.sizes.length > 0}
                      value={editingProduct.stock || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      className="w-full bg-slate-850 disabled:opacity-70 text-white font-mono text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Min Stock alert */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Minimum Alert Level</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.minStock || 5}
                      onChange={(e) => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })}
                      className="w-full bg-slate-850 text-white font-mono text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Stock by Size Component */}
                  <div className="col-span-2 bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Gestion du Stock par Taille (Multi-tailles)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Si votre produit est disponible en plusieurs tailles (ex. XS, S, M, L), ajoutez-les ci-dessous. Le stock total sera la somme de chaque taille et sera géré indépendamment dans le POS.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: M, L, XL, 38, 42..."
                        value={newSizeName}
                        onChange={(e) => setNewSizeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSizeItem();
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={addSizeItem}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Ajouter
                      </button>
                    </div>

                    {editingProduct.sizes && editingProduct.sizes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {editingProduct.sizes.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-white/5 gap-2">
                            <span className="font-bold text-xs text-indigo-300 font-mono px-1.5">{item.size}</span>
                            <div className="flex items-center gap-2">
                              <label className="text-[9px] uppercase font-bold text-slate-500">Stock:</label>
                              <input
                                type="number"
                                min="0"
                                required
                                value={item.stock}
                                onChange={(e) => updateSizeStock(idx, Math.max(0, Number(e.target.value) || 0))}
                                className="w-20 bg-slate-950 border border-white/10 rounded px-2 py-1 text-center text-xs text-white font-mono outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => removeSizeItem(idx)}
                                className="p-1 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded transition-colors"
                                title="Supprimer la taille"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-3 border border-dashed border-white/10 rounded-xl">
                        <p className="text-[11px] text-slate-500 italic">Aucune taille spécifique configurée pour ce produit.</p>
                      </div>
                    )}
                  </div>

                  {/* Visual Image Management with Upload & Preview */}
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Image du produit</label>
                    
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {editingProduct.imageUrl ? (
                      <div className="relative flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-950/40 rounded-xl border border-white/5">
                        <img 
                          src={editingProduct.imageUrl} 
                          alt="product preview" 
                          className="w-24 h-24 object-cover rounded-xl border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 space-y-2 text-center md:text-left">
                          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 justify-center md:justify-start">
                            <span>Image configurée</span>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs md:max-w-md">
                            {editingProduct.imageUrl.startsWith('data:') ? 'Fichier image encodé localement' : editingProduct.imageUrl}
                          </p>
                          <div className="flex gap-2 justify-center md:justify-start">
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                              Remplacer
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => imageInputRef.current?.click()}
                        className={`cursor-pointer group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
                          dragActive 
                            ? 'border-indigo-500 bg-indigo-500/10' 
                            : 'border-white/10 bg-slate-950/20 hover:border-white/20 hover:bg-slate-950/40'
                        }`}
                      >
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors mb-2" />
                        <p className="text-xs font-semibold text-slate-300">Glissez-déposez une image ici ou cliquez pour parcourir</p>
                        <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, WEBP (Max 2 Mo)</p>
                      </div>
                    )}

                    <div className="mt-3">
                      <details className="text-xs text-slate-500 group">
                        <summary className="cursor-pointer select-none hover:text-slate-400 transition-colors flex items-center gap-1">
                          <span>Entrer une URL d'image manuellement</span>
                        </summary>
                        <div className="mt-2 pl-4">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/..."
                            value={editingProduct.imageUrl || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                            className="w-full bg-slate-850 text-white text-xs border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Additional barcodes arrays */}
                  <div className="col-span-2 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[10px] uppercase font-bold text-indigo-300 block mb-1.5">Configure Additional Barcodes</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Scan or type additional code..."
                        value={newBarcode}
                        onChange={(e) => setNewBarcode(e.target.value)}
                        className="flex-1 bg-slate-900 text-white font-mono text-xs border border-white/10 rounded-lg p-2 outline-none"
                      />
                      <button
                        type="button"
                        onClick={addBarcodeTag}
                        className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Add Tag
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(editingProduct.additionalBarcodes || []).map(code => (
                        <span key={code} className="inline-flex items-center gap-1 bg-slate-800 text-white px-2 py-1 rounded font-mono text-[10px]">
                          {code}
                          <button type="button" onClick={() => removeBarcodeTag(code)} className="text-rose-400 hover:text-rose-300">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {(editingProduct.additionalBarcodes || []).length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">No alternative codes configured.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl p-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="text-md font-bold text-white">Bulk CSV Importer</h3>
                <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Paste comma-separated values (CSV) matching the columns structure below. Note the first row is ignored as a header row.
                </p>
                
                <div className="bg-white/5 p-2 rounded-lg font-mono text-[9px] text-indigo-300 select-all border border-white/5">
                  SKU,Name,Barcode,Category,Brand,Size,Color,CostPrice,SellingPrice,Discount,Stock,MinStock,ImageURL
                </div>

                <textarea
                  placeholder="VNG-NEW,Premium Bomber Jacket,1234567890,Outerwear,Vanguard Studio,L,Midnight Blue,35.00,120.00,0,15,5,https://unsplash..."
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full bg-slate-850 border border-white/10 text-white rounded-xl p-3 font-mono text-xs outline-none focus:border-indigo-500"
                ></textarea>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 bg-white/5 text-slate-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCSV}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all"
                  >
                    Parse & Import Items
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

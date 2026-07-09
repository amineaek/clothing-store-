/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { Sidebar } from './sidebar';
import { ToastContainer, ToastMessage, ToastType } from './components/NotificationToast';
import { Dashboard } from './components/Dashboard';
import { POSView } from './components/POSView';
import { ProductManagement } from './components/ProductManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { InventoryView } from './components/InventoryView';
import { SettingsView } from './components/SettingsView';

import { Product, Customer, Supplier, Sale, StockMovement, User, StoreSettings, HoldSale } from './types';
import { 
  initialSettings, initialOperators, initialProducts, 
  initialCustomers, initialSuppliers, initialStockMovements, initialSales,
  initialCategories, initialBrands
} from './data/initialData';

function MainApp() {
  const { t, language } = useLanguage();

  // 1. Core State Initialization with localStorage synchronization
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('vanguard_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.taxRate !== undefined || parsed.currency === '$' || parsed.language === 'en') {
          const upgraded = { ...initialSettings, ...parsed };
          upgraded.currency = 'DA';
          upgraded.language = upgraded.language === 'en' ? 'fr' : upgraded.language;
          delete upgraded.taxRate;
          return upgraded;
        }
        return parsed;
      } catch (e) {
        return initialSettings;
      }
    }
    return initialSettings;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('vanguard_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Product[];
        const hasDemo = parsed.some(p => p.sku.startsWith('VNG-') || p.sku.startsWith('AUR-') || p.id === 'prod-1');
        if (hasDemo) {
          localStorage.removeItem('vanguard_products');
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('vanguard_customers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Customer[];
        const hasDemo = parsed.some(c => c.id === 'cust-1' || c.name === 'Eleanor Sterling');
        if (hasDemo) {
          localStorage.removeItem('vanguard_customers');
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('vanguard_suppliers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Supplier[];
        const hasDemo = parsed.some(s => s.id === 'sup-1' || s.name === 'Elite Apparel Group');
        if (hasDemo) {
          localStorage.removeItem('vanguard_suppliers');
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('vanguard_sales');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Sale[];
        const hasDemo = parsed.some(s => s.id === 'sale-1' || s.invoiceNumber === 'INV-2026-0001');
        if (hasDemo) {
          localStorage.removeItem('vanguard_sales');
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('vanguard_movements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StockMovement[];
        const hasDemo = parsed.some(m => m.id === 'mv-1');
        if (hasDemo) {
          localStorage.removeItem('vanguard_movements');
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [heldSales, setHeldSales] = useState<HoldSale[]>(() => {
    const saved = localStorage.getItem('vanguard_held_sales');
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Active Session States
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [currentOperator, setCurrentOperator] = useState<User>(initialOperators[0]);
  const [theme, setTheme] = useState<'light' | 'dark'>(storeSettings.theme);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 3. Write updates to LocalStorage on state modification
  useEffect(() => {
    localStorage.setItem('vanguard_settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  useEffect(() => {
    localStorage.setItem('vanguard_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('vanguard_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('vanguard_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('vanguard_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('vanguard_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('vanguard_held_sales', JSON.stringify(heldSales));
  }, [heldSales]);

  // Adjust app theme
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setStoreSettings(prev => ({ ...prev, theme: next }));
  };

  // 4. Toast helper
  const addToast = (text: string, type: ToastType = 'success') => {
    const newToast: ToastMessage = { id: `toast-${Date.now()}`, text, type };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 5. Actions: Product state mutations
  const handleSaveProduct = (prod: Product) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === prod.id);
      if (exists) {
        addToast(`Product "${prod.name}" updated successfully.`, 'success');
        return prev.map(p => p.id === prod.id ? prod : p);
      } else {
        // Log movement
        const move: StockMovement = {
          id: `mv-${Date.now()}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'in',
          quantity: prod.stock,
          reason: 'Initial stock load creation',
          timestamp: new Date().toISOString(),
          operatorName: currentOperator.name
        };
        setMovements(m => [move, ...m]);
        addToast(`New product "${prod.name}" registered.`, 'success');
        return [prod, ...prev];
      }
    });
  };

  const handleDeleteProduct = (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    if (confirm(`Remove product "${prod.name}"?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      addToast(`Product deleted from catalogue.`, 'info');
    }
  };

  const handleBulkImportProducts = (imported: Product[]) => {
    setProducts(prev => [...imported, ...prev]);
    // Log movements for each imported item
    const moves: StockMovement[] = imported.map((prod, index) => ({
      id: `mv-${Date.now()}-${index}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: 'in',
      quantity: prod.stock,
      reason: 'Bulk CSV catalog import',
      timestamp: new Date().toISOString(),
      operatorName: currentOperator.name
    }));
    setMovements(m => [...moves, ...m]);
    addToast(`Successfully imported ${imported.length} garments into stock.`, 'success');
  };

  // 6. Actions: POS checkout completed
  const handleCompleteSale = (sale: Sale) => {
    // 1. Record transaction
    setSales(prev => [sale, ...prev]);

    // 2. Adjust products stock levels
    setProducts(prev => {
      return prev.map(prod => {
        const matchingSaleItems = sale.items.filter(it => it.productId === prod.id);
        if (matchingSaleItems.length > 0) {
          const isReturn = sale.status === 'returned';
          let updatedSizes = prod.sizes ? [...prod.sizes] : undefined;
          let stockAdjustment = 0;

          matchingSaleItems.forEach(item => {
            const qtyAdjust = isReturn ? item.qty : -item.qty;
            stockAdjustment += qtyAdjust;

            if (item.size && updatedSizes) {
              updatedSizes = updatedSizes.map(sz => {
                if (sz.size === item.size) {
                  return { ...sz, stock: Math.max(sz.stock + qtyAdjust, 0) };
                }
                return sz;
              });
            }
          });

          const newStock = Math.max(prod.stock + stockAdjustment, 0);
          return {
            ...prod,
            stock: newStock,
            sizes: updatedSizes
          };
        }
        return prod;
      });
    });

    // 3. Log stock movements audits
    const newMovements: StockMovement[] = sale.items.map((item, index) => {
      const isReturn = sale.status === 'returned';
      return {
        id: `mv-sale-${Date.now()}-${index}`,
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        type: isReturn ? 'in' : 'out',
        quantity: item.qty,
        reason: isReturn 
          ? `Returned item refund: ${sale.invoiceNumber}` 
          : `POS checkout checkout: ${sale.invoiceNumber}`,
        timestamp: new Date().toISOString(),
        operatorName: currentOperator.name
      };
    });

    setMovements(prev => [...newMovements, ...prev]);

    // 4. Update Customer Outstanding Debt if split/debt method is used, or reduce store credit
    if (sale.customerId) {
      setCustomers(prev => {
        return prev.map(cust => {
          if (cust.id === sale.customerId) {
            let updatedDebt = cust.debt;
            let updatedCredit = cust.credit;

            // If it is a return, issue store credit
            if (sale.status === 'returned') {
              updatedCredit += Math.abs(sale.total);
            }
            return { ...cust, debt: updatedDebt, credit: updatedCredit };
          }
          return cust;
        });
      });
    }

    addToast(sale.status === 'returned' ? "Refund receipt logged." : "Transaction settled and completed.", 'success');
  };

  // 7. Actions: Hold / Resume POS cart
  const handleHoldSale = (hold: HoldSale) => {
    setHeldSales(prev => [hold, ...prev]);
    addToast("Current session cart held successfully.", 'info');
  };

  const handleReleaseHoldSale = (id: string) => {
    setHeldSales(prev => prev.filter(h => h.id !== id));
  };

  // 8. Actions: Manual Stock Adjustments (Audits)
  const handleAdjustStock = (productId: string, qty: number, type: 'adjustment_plus' | 'adjustment_minus' | 'transfer', reason: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    let deltaStock = qty;
    if (type === 'adjustment_minus') {
      deltaStock = -qty;
    } else if (type === 'transfer') {
      deltaStock = -qty; // Transferred out of primary showroom
    }

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, stock: Math.max(p.stock + deltaStock, 0) };
      }
      return p;
    }));

    const move: StockMovement = {
      id: `mv-${Date.now()}`,
      productId,
      productName: prod.name,
      sku: prod.sku,
      type,
      quantity: qty,
      reason,
      timestamp: new Date().toISOString(),
      operatorName: currentOperator.name
    };

    setMovements(prev => [move, ...prev]);
    addToast("Stock level adjustment audited.", 'success');
  };

  // 9. Actions: Logging Supply order (Incoming shipments)
  const handleLogSupplyOrder = (supplierId: string, productId: string, qty: number, unitCost: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Increase product stock count
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, stock: p.stock + qty, costPrice: unitCost }; // updates cost price automatically to match newest run
      }
      return p;
    }));

    // Append to movements log
    const move: StockMovement = {
      id: `mv-${Date.now()}`,
      productId,
      productName: prod.name,
      sku: prod.sku,
      type: 'in',
      quantity: qty,
      reason: `Supplier cargo shipment replenishment`,
      timestamp: new Date().toISOString(),
      operatorName: currentOperator.name
    };

    setMovements(prev => [move, ...prev]);
    addToast(`Recorded shipment of ${qty} units of "${prod.name}".`, 'success');
  };

  // 10. Actions: CRM customer profiles CRUD
  const handleSaveCustomer = (cust: Customer) => {
    setCustomers(prev => {
      const exists = prev.some(c => c.id === cust.id);
      if (exists) {
        addToast(`Customer "${cust.name}" profile saved.`, 'success');
        return prev.map(c => c.id === cust.id ? cust : c);
      } else {
        addToast(`Registered new customer "${cust.name}".`, 'success');
        return [cust, ...prev];
      }
    });
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm("Permanently delete this CRM customer profile?")) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      addToast("Customer profile deleted.", 'info');
    }
  };

  // 11. Actions: Supplier profile CRUD
  const handleSaveSupplier = (sup: Supplier) => {
    setSuppliers(prev => {
      const exists = prev.some(s => s.id === sup.id);
      if (exists) {
        addToast(`Supplier "${sup.name}" profile saved.`, 'success');
        return prev.map(s => s.id === sup.id ? sup : s);
      } else {
        addToast(`Registered new supplier "${sup.name}".`, 'success');
        return [sup, ...prev];
      }
    });
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm("Delete supplier partner from listing?")) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      addToast("Supplier profile deleted.", 'info');
    }
  };

  // 12. State database recovery systems
  const getFullBackupData = () => {
    return {
      settings: storeSettings,
      products,
      customers,
      suppliers,
      sales,
      movements
    };
  };

  const handleRestoreDatabase = (json: any): boolean => {
    if (json.settings && json.products && json.customers && json.suppliers && json.sales && json.movements) {
      setStoreSettings(json.settings);
      setProducts(json.products);
      setCustomers(json.customers);
      setSuppliers(json.suppliers);
      setSales(json.sales);
      setMovements(json.movements);
      addToast("System database restored successfully!", 'success');
      return true;
    }
    return false;
  };

  // Render view router
  const viewRenderer = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            sales={sales} 
            products={products} 
            customers={customers} 
            currency={storeSettings.currency} 
            onNavigateToView={setCurrentView}
          />
        );
      case 'pos':
        return (
          <POSView
            products={products}
            customers={customers}
            storeSettings={storeSettings}
            currentOperator={currentOperator}
            onCompleteSale={handleCompleteSale}
            onHoldSale={handleHoldSale}
            onReleaseHoldSale={handleReleaseHoldSale}
            heldSales={heldSales}
            onAddCustomer={handleSaveCustomer}
          />
        );
      case 'products':
        return (
          <ProductManagement
            products={products}
            categories={initialCategories}
            brands={initialBrands}
            currency={storeSettings.currency}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onBulkImport={handleBulkImportProducts}
          />
        );
      case 'customers':
        return (
          <CustomerManagement
            customers={customers}
            sales={sales}
            currency={storeSettings.currency}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        );
      case 'suppliers':
        return (
          <SupplierManagement
            suppliers={suppliers}
            products={products}
            currency={storeSettings.currency}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onLogSupplyOrder={handleLogSupplyOrder}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            products={products}
            movements={movements}
            onAdjustStock={handleAdjustStock}
            currency={storeSettings.currency}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={storeSettings}
            onSaveSettings={setStoreSettings}
            currentUserRole={currentOperator.role}
            onRestoreDatabase={handleRestoreDatabase}
            onGetFullBackupData={getFullBackupData}
          />
        );
      default:
        return <div className="text-white">View not found.</div>;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-all`}>
      <div className="flex flex-col md:flex-row h-full">
        {/*persistent responsive sidebar*/}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          operators={initialOperators}
          currentOperator={currentOperator}
          onSwitchOperator={(op) => {
            setCurrentOperator(op);
            addToast(`Logged in as ${op.name} (${t(op.role)})`, 'info');
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          logoUrl={storeSettings.logoUrl}
          storeName={storeSettings.storeName}
        />

        {/*main dynamic page viewport*/}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto" id="app-viewport">
          {viewRenderer()}
        </main>
      </div>

      {/* Floating toast alerts container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { Sale, Product, Customer } from '../types';
import { 
  TrendingUp, DollarSign, Users, AlertTriangle, 
  ShoppingBag, ArrowUpRight, ArrowDownRight, Package, Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend
} from 'recharts';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  currency: string;
  onNavigateToView: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  sales, 
  products, 
  customers, 
  currency,
  onNavigateToView 
}) => {
  const { t, isRtl } = useLanguage();
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Filter sales based on selected date ranges
  const filteredSales = useMemo(() => {
    const now = new Date("2026-07-09T15:00:00-07:00"); // Standard reference time
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      
      if (showCustomPicker && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return saleDate >= start && saleDate <= end;
      }

      if (timeRange === 'daily') {
        return saleDate.toDateString() === now.toDateString();
      } else if (timeRange === 'weekly') {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        return saleDate >= oneWeekAgo;
      } else if (timeRange === 'monthly') {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return saleDate >= oneMonthAgo;
      } else if (timeRange === 'yearly') {
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        return saleDate >= oneYearAgo;
      }
      return true;
    });
  }, [sales, timeRange, customStartDate, customEndDate, showCustomPicker]);

  // Aggregate stats
  const stats = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let itemsSold = 0;
    
    filteredSales.forEach(sale => {
      if (sale.status === 'completed') {
        revenue += sale.total;
        profit += sale.profit;
        sale.items.forEach(item => {
          itemsSold += item.qty;
        });
      }
    });

    const activeCusts = new Set(filteredSales.map(s => s.customerId).filter(Boolean)).size;
    const lowStockAlerts = products.filter(p => p.stock <= p.minStock).length;

    // Calculate total inventory valuation
    let totalValuationCost = 0;
    let totalValuationRetail = 0;
    products.forEach(p => {
      totalValuationCost += p.stock * p.costPrice;
      totalValuationRetail += p.stock * p.sellingPrice;
    });

    return {
      revenue,
      profit,
      itemsSold,
      activeCusts,
      lowStockAlerts,
      totalValuationCost,
      totalValuationRetail,
      potentialProfit: totalValuationRetail - totalValuationCost
    };
  }, [filteredSales, products]);

  // Chart trend data points
  const chartData = useMemo(() => {
    const dataMap: Record<string, { date: string; revenue: number; profit: number }> = {};
    
    // Sort sales chronologically
    const sorted = [...filteredSales].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sorted.forEach(sale => {
      if (sale.status !== 'completed') return;
      const dateObj = new Date(sale.timestamp);
      let dateKey = "";

      if (timeRange === 'daily') {
        dateKey = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (timeRange === 'weekly' || showCustomPicker) {
        dateKey = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else if (timeRange === 'monthly') {
        dateKey = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        dateKey = dateObj.toLocaleDateString([], { year: 'numeric', month: 'short' });
      }

      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { date: dateKey, revenue: 0, profit: 0 };
      }
      dataMap[dateKey].revenue += sale.total;
      dataMap[dateKey].profit += sale.profit;
    });

    return Object.values(dataMap);
  }, [filteredSales, timeRange, showCustomPicker]);

  // Top products sold
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    
    filteredSales.forEach(sale => {
      if (sale.status !== 'completed') return;
      sale.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.qty;
        productSales[item.productId].revenue += item.sellingPrice * item.qty;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales]);

  // Top Customer analytics
  const topCustomers = useMemo(() => {
    const customerSales: Record<string, { name: string; salesCount: number; spend: number }> = {};

    filteredSales.forEach(sale => {
      if (sale.status !== 'completed') return;
      const cName = sale.customerName || t('walkInCustomer');
      const cId = sale.customerId || 'walk-in';

      if (!customerSales[cId]) {
        customerSales[cId] = { name: cName, salesCount: 0, spend: 0 };
      }
      customerSales[cId].salesCount += 1;
      customerSales[cId].spend += sale.total;
    });

    return Object.values(customerSales)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [filteredSales, t]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6" id="dashboard-view-container">
      {/* Time Range Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('dashboard')}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {new Date("2026-07-09T15:00:00-07:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setShowCustomPicker(false); setTimeRange('daily'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${!showCustomPicker && timeRange === 'daily' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            id="btn-range-daily"
          >
            {t('daily')}
          </button>
          <button
            onClick={() => { setShowCustomPicker(false); setTimeRange('weekly'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${!showCustomPicker && timeRange === 'weekly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            id="btn-range-weekly"
          >
            {t('weekly')}
          </button>
          <button
            onClick={() => { setShowCustomPicker(false); setTimeRange('monthly'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${!showCustomPicker && timeRange === 'monthly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            id="btn-range-monthly"
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => { setShowCustomPicker(false); setTimeRange('yearly'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${!showCustomPicker && timeRange === 'yearly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            id="btn-range-yearly"
          >
            {t('yearly')}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${showCustomPicker ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              id="btn-range-custom"
            >
              <Calendar className="w-3.5 h-3.5" />
              {t('customRange')}
            </button>
            
            {showCustomPicker && (
              <div className="absolute right-0 top-full mt-2 bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl z-20 flex flex-col gap-3 min-w-[260px]">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-800 text-white text-xs border border-white/10 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-slate-800 text-white text-xs border border-white/10 rounded-lg p-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-summary-grid">
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/40 p-5 rounded-2xl border border-indigo-500/10 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-indigo-300 uppercase tracking-wider">{t('salesToday')}</p>
            <p className="text-2xl font-bold text-white">
              {currency}{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center text-[10px] text-emerald-400 font-medium">
              <TrendingUp className="w-3 h-3 me-1" />
              <span>+{filteredSales.length} {t('itemsCount')}</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/40 p-5 rounded-2xl border border-emerald-500/10 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-emerald-300 uppercase tracking-wider">{t('netProfit')}</p>
            <p className="text-2xl font-bold text-white">
              {currency}{stats.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="text-[10px] text-emerald-300 font-medium flex items-center">
              <ArrowUpRight className="w-3 h-3 me-1" />
              <span>{stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}% margin</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Stock Alerts Card */}
        <div 
          onClick={() => onNavigateToView('inventory')}
          className="cursor-pointer bg-gradient-to-br from-amber-950/40 to-slate-900/40 p-5 rounded-2xl border border-amber-500/10 shadow-xl backdrop-blur-md flex items-center justify-between hover:border-amber-500/30 transition-all"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">{t('stockAlerts')}</p>
            <p className="text-2xl font-bold text-white">{stats.lowStockAlerts}</p>
            <p className="text-[10px] text-amber-300/80 font-medium">{t('lowStockWarning')}</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Active Customers Card */}
        <div 
          onClick={() => onNavigateToView('customers')}
          className="cursor-pointer bg-gradient-to-br from-sky-950/40 to-slate-900/40 p-5 rounded-2xl border border-sky-500/10 shadow-xl backdrop-blur-md flex items-center justify-between hover:border-sky-500/30 transition-all"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-sky-300 uppercase tracking-wider">{t('activeCustomers')}</p>
            <p className="text-2xl font-bold text-white">{stats.activeCusts}</p>
            <p className="text-[10px] text-sky-300/80">{customers.length} total profiles</p>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <h3 className="text-base font-semibold text-white mb-4">{t('revenueChart')}</h3>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">{t('noData')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} 
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />
                  <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" name="Net Profit" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProf)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inventory Valuation Card */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-4">{t('inventoryValuation')}</h3>
            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{t('valuationCost')}</p>
                <p className="text-xl font-bold text-white mt-1">
                  {currency}{stats.totalValuationCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{t('valuationRetail')}</p>
                <p className="text-xl font-bold text-white mt-1">
                  {currency}{stats.totalValuationRetail.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
                <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">{t('potentialProfit')}</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {currency}{stats.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              {products.reduce((acc, curr) => acc + curr.stock, 0)} items in stock
            </span>
            <button 
              onClick={() => onNavigateToView('products')} 
              className="text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              Manage {t('products')}
            </button>
          </div>
        </div>
      </div>

      {/* Top Performing Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-rankings-section">
        {/* Top Products */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            {t('topProducts')}
          </h3>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{t('noData')}</p>
            ) : (
              topProducts.map((p, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">#{index + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.qty} items sold</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white">{currency}{p.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            {t('topCustomers')}
          </h3>
          <div className="space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{t('noData')}</p>
            ) : (
              topCustomers.map((c, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">#{index + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.salesCount} purchases</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">{currency}{c.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

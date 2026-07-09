/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage } from './components/LanguageContext';
import { User, UserRole } from './types';
import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, Users, 
  Truck, RefreshCw, Settings, Moon, Sun, LogOut, 
  Menu, X, Sparkles, ChevronDown, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  operators: User[];
  currentOperator: User;
  onSwitchOperator: (operator: User) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  logoUrl?: string;
  storeName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  operators,
  currentOperator,
  onSwitchOperator,
  theme,
  onToggleTheme,
  logoUrl,
  storeName
}) => {
  const { t, isRtl } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOpDropdown, setShowOpDropdown] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pos', label: t('pos'), icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'products', label: t('products'), icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'customers', label: t('customers'), icon: <Users className="w-4 h-4" /> },
    { id: 'suppliers', label: t('suppliers'), icon: <Truck className="w-4 h-4" /> },
    { id: 'inventory', label: t('inventory'), icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'settings', label: t('settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full p-4 text-white">
      {/* Brand & Store header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-9 h-9 object-cover rounded-xl border border-white/10" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              V
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">{storeName}</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Retail ERP v4.0
            </p>
          </div>
        </div>

        {/* Current Operator Profile Swapper */}
        <div className="relative">
          <button
            onClick={() => setShowOpDropdown(!showOpDropdown)}
            className="w-full flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-left"
            id="btn-operator-picker"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-300 border border-indigo-500/10">
                {currentOperator.name.substring(0, 1).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-[10px] font-bold text-white leading-none">{currentOperator.name}</p>
                <p className="text-[8px] text-slate-400 mt-0.5 uppercase font-bold">{t(currentOperator.role)}</p>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <AnimatePresence>
            {showOpDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-30 divide-y divide-white/5"
              >
                <p className="p-2 text-[8px] uppercase font-bold text-slate-400 bg-slate-950/20">{t('logout')}</p>
                {operators.map(op => (
                  <button
                    key={op.id}
                    onClick={() => {
                      onSwitchOperator(op);
                      setShowOpDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 text-left hover:bg-white/5 transition-all text-[11px] ${
                      op.id === currentOperator.id ? 'text-indigo-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>{op.name} ({t(op.role)})</span>
                    {op.id === currentOperator.id && <UserCheck className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu Navigation list */}
        <nav className="space-y-1">
          {menuItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  isActive 
                    ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 shadow-md' 
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5'
                }`}
                id={`nav-${item.id}`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls: theme toggles */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-slate-400">
        <span className="text-[9px] font-medium opacity-60">© Vanguard Studio</span>
        <button
          onClick={onToggleTheme}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white"
          id="btn-toggle-theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-white/5 text-white shadow-md z-40 relative">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-7 h-7 object-cover rounded-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs text-white">V</div>
          )}
          <span className="text-sm font-bold tracking-tight">{storeName}</span>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 bg-white/5 rounded-lg text-white"
          id="btn-mobile-menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Slide-in */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Sidebar drawer card */}
            <motion.div
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className={`fixed top-0 bottom-0 z-50 w-64 bg-slate-950 border-r border-white/10 flex flex-col ${
                isRtl ? 'right-0' : 'left-0'
              }`}
            >
              {navContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Persistent Sidebar */}
      <div 
        className="hidden md:flex flex-col w-64 bg-slate-950/85 border-r border-white/10 backdrop-blur-md h-screen sticky top-0"
        id="desktop-sidebar-container"
      >
        {navContent}
      </div>
    </>
  );
};

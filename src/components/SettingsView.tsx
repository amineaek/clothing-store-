/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { StoreSettings, UserRole } from '../types';
import { 
  Building, Phone, Mail, MapPin, Percent, 
  Printer, Palette, Languages, Database, Download, 
  Upload, CheckCircle, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsViewProps {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => void;
  currentUserRole: UserRole;
  onRestoreDatabase: (backupData: any) => boolean;
  onGetFullBackupData: () => any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  currentUserRole,
  onRestoreDatabase,
  onGetFullBackupData
}) => {
  const { t, language, setLanguage } = useLanguage();
  
  // Local settings state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [receiptWidth, setReceiptWidth] = useState(settings.receiptWidth);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAuthorized = currentUserRole === 'owner' || currentUserRole === 'manager';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert("Unauthorized. Only Owners or Managers can adjust core store parameters.");
      return;
    }

    const updated: StoreSettings = {
      ...settings,
      storeName,
      logoUrl,
      phone,
      email,
      address,
      currency,
      receiptFooter,
      receiptWidth: Number(receiptWidth) || 80
    };

    onSaveSettings(updated);
    alert("Settings updated successfully!");
  };

  // Full backup JSON downloader
  const handleDownloadBackup = () => {
    const fullData = onGetFullBackupData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `vanguard_database_backup_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  // Upload/Restore file reader
  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = onRestoreDatabase(json);
        if (success) {
          alert(t('successRestore'));
        } else {
          alert(t('invalidRestore'));
        }
      } catch (err) {
        alert("Corrupted database file. Parse failed.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6" id="settings-view-main">
      {/* Role Warnings */}
      {!isAuthorized && (
        <div className="bg-rose-950/40 border border-rose-500/20 p-4 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-bold">Restricted View Mode</p>
            <p className="mt-0.5 opacity-80">You are currently logged in as a Cashier. You must switch operator profile to modify core settings.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-white">
        {/* LEFT CARD: Store details */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            {t('storeInfo')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Store Name</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Logo URL Link</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Store Phone Line</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Contact Email Address</label>
              <input
                type="email"
                disabled={!isAuthorized}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Corporate Physical Address</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Checkout and Receipt settings */}
          <h3 className="text-sm font-bold text-white pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            POS Receipt & Currency
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Currency Symbol</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none text-center font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Thermal Paper Width</label>
              <select
                disabled={!isAuthorized}
                value={receiptWidth}
                onChange={(e) => setReceiptWidth(Number(e.target.value))}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none"
              >
                <option value="58">58mm Small Thermal</option>
                <option value="80">80mm Standard Thermal</option>
                <option value="210">A4 Document Laser</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Receipt Footer Promotional Note</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 disabled:opacity-50 rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {isAuthorized && (
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
                id="btn-settings-save"
              >
                Update Store Configurations
              </button>
            </div>
          )}
        </div>

        {/* RIGHT CARD: Language, Theme and Backup */}
        <div className="space-y-6">
          {/* Translation controls */}
          <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 flex items-center gap-2">
              <Languages className="w-4 h-4 text-emerald-400" />
              {t('settings')} Localization
            </h3>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Switch Application Language</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'fr', label: 'Français' },
                  { id: 'ar', label: 'العربية' }
                ].map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id as any)}
                    className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold transition-all border ${
                      language === l.id 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Database Backup restores card */}
          <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              {t('backupRestore')}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Vanguard stores all data in secure client local-storage. Download a portable database backup for safekeeping or system migration.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                {t('backupDatabase')}
              </button>

              {isAuthorized && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleUploadBackup}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/10 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    {t('restoreDatabase')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

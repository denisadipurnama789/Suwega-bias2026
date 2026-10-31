/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  BarChart3,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  ShieldCheck,
  School,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ConsentForm } from './components/ConsentForm';
import { SubmissionSuccessModal } from './components/SubmissionSuccessModal';
import { RekapDashboard } from './components/RekapDashboard';
import { GoogleSheetsPanel } from './components/GoogleSheetsPanel';
import { InfoImunisasiModal } from './components/InfoImunisasiModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { ConsentRecord, GoogleSheetsConfig } from './types';
import {
  getStoredRecords,
  getSchoolInfo,
  getSheetsConfig,
  SchoolInfo,
} from './services/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'rekap' | 'sheets'>('form');
  const [records, setRecords] = useState<ConsentRecord[]>(() => getStoredRecords());

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => getSchoolInfo());
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getSheetsConfig());
  const [recentSubmittedRecord, setRecentSubmittedRecord] = useState<ConsentRecord | null>(null);

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Reload records from storage whenever needed
  const refreshRecords = () => {
    setRecords(getStoredRecords());
    setSheetsConfig(getSheetsConfig());
  };

  const handleFormSuccess = (record: ConsentRecord) => {
    setRecentSubmittedRecord(record);
    refreshRecords();
  };

  const handleResetForm = () => {
    setRecentSubmittedRecord(null);
    setActiveTab('form');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation Bar */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & School Name */}
          <div
            onClick={() => {
              setRecentSubmittedRecord(null);
              setActiveTab('form');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition">
                  BIAS Dt / Td
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                  UKS Digital
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-xs">
                {schoolInfo.namaSekolah}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {sheetsConfig?.spreadsheetUrl && (
              <a
                href={sheetsConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium transition"
                title="Buka Rekap di Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
                <ExternalLink className="w-3 h-3 text-emerald-500" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition"
              title="Informasi Imunisasi BIAS"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition"
              title="Pengaturan Data Sekolah"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => {
                setRecentSubmittedRecord(null);
                setActiveTab('form');
              }}
              className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'form' && !recentSubmittedRecord
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Formulir Orang Tua</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRecentSubmittedRecord(null);
                setActiveTab('rekap');
              }}
              className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap flex items-center gap-2 relative ${
                activeTab === 'rekap'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Rekap Data Siswa</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded-full">
                {records.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRecentSubmittedRecord(null);
                setActiveTab('sheets');
              }}
              className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'sheets'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheets Rekap</span>
              {sheetsConfig?.spreadsheetId && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Terhubung" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {/* If user recently submitted, show the proof / printable receipt screen */}
        {recentSubmittedRecord ? (
          <SubmissionSuccessModal
            record={recentSubmittedRecord}
            schoolInfo={schoolInfo}
            onReset={handleResetForm}
            spreadsheetUrl={sheetsConfig?.spreadsheetUrl}
          />
        ) : (
          <>
            {activeTab === 'form' && (
              <ConsentForm
                schoolInfo={schoolInfo}
                onSuccess={handleFormSuccess}
                onOpenInfoModal={() => setShowInfoModal(true)}
                onOpenSheetsTab={() => setActiveTab('sheets')}
              />
            )}

            {activeTab === 'rekap' && (
              <RekapDashboard
                records={records}
                onRecordsChange={(newRecords) => setRecords(newRecords)}
                schoolInfo={schoolInfo}
                spreadsheetUrl={sheetsConfig?.spreadsheetUrl}
                onOpenSheetsTab={() => setActiveTab('sheets')}
              />
            )}

            {activeTab === 'sheets' && (
              <GoogleSheetsPanel
                schoolInfo={schoolInfo}
                onRecordsUpdated={refreshRecords}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showInfoModal && (
        <InfoImunisasiModal onClose={() => setShowInfoModal(false)} />
      )}

      {showSettingsModal && (
        <SchoolSettingsModal
          currentInfo={schoolInfo}
          onSave={(newInfo) => setSchoolInfo(newInfo)}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Mobile-friendly Bottom Footer */}
      <footer className="no-print mt-auto border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-700">
          {schoolInfo.namaSekolah} • UKS & Puskesmas Pembina ({schoolInfo.namaPuskesmas})
        </p>
        <p className="text-[11px] text-slate-400">
          Formulir Persetujuan Resmi BIAS Dt & Td • Desain Ramah Seluler & Tablet
        </p>
      </footer>
    </div>
  );
}

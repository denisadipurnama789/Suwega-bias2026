import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Link as LinkIcon,
  LogOut,
  Sparkles,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  Code,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  getAccessToken,
  initAuth,
} from '../services/firebaseAuth';
import {
  createBiasSpreadsheet,
  checkSpreadsheetAccess,
  batchAppendRecordsToSpreadsheet,
  appendRowToSpreadsheet,
  SAMPLE_APPS_SCRIPT_CODE,
} from '../services/googleSheets';
import {
  getSheetsConfig,
  saveSheetsConfig,
  getStoredRecords,
  updateRecordSyncStatus,
  SchoolInfo,
} from '../services/storage';
import { GoogleSheetsConfig, ConsentRecord } from '../types';

interface GoogleSheetsPanelProps {
  schoolInfo: SchoolInfo;
  onRecordsUpdated: () => void;
}

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  schoolInfo,
  onRecordsUpdated,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getSheetsConfig());

  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingRow, setIsTestingRow] = useState(false);
  const [inputCustomId, setInputCustomId] = useState('');
  const [webhookInput, setWebhookInput] = useState(sheetsConfig?.webhookUrl || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, activeToken) => {
        setCurrentUser(user);
        setToken(activeToken);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        setStatusMessage({
          text: `Berhasil terhubung dengan akun Google: ${res.user.email}. Silakan klik "Buat Spreadsheet Rekap Otomatis" di bawah.`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Gagal login dengan akun Google. Pastikan izin popup browser tidak diblokir.',
        type: 'error',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setToken(null);
    setStatusMessage({
      text: 'Akun Google berhasil diputus.',
      type: 'info',
    });
  };

  const handleCreateNewSheet = async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setStatusMessage({
        text: 'Silakan login dengan akun Google terlebih dahulu (Klik tombol Sign in with Google di atas).',
        type: 'error',
      });
      return;
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);
    try {
      const created = await createBiasSpreadsheet(currentToken, schoolInfo.namaSekolah);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: created.title,
        autoSync: true,
        webhookUrl: sheetsConfig?.webhookUrl,
        lastSyncedAt: new Date().toISOString(),
      };

      saveSheetsConfig(newConfig);
      setSheetsConfig(newConfig);

      // Immediately sync any existing records
      const records = getStoredRecords();
      if (records.length > 0) {
        await batchAppendRecordsToSpreadsheet(currentToken, created.spreadsheetId, records);
        records.forEach((r) => {
          updateRecordSyncStatus(r.id, true, created.spreadsheetId);
        });
        onRecordsUpdated();
      }

      setStatusMessage({
        text: `Spreadsheet "${created.title}" berhasil dibuat di Google Drive! Sebanyak ${records.length} data respon langsung disinkronkan ke dalamnya.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Gagal membuat Google Sheets baru.',
        type: 'error',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleConnectExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomId.trim()) return;

    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setStatusMessage({
        text: 'Silakan login dengan akun Google terlebih dahulu.',
        type: 'error',
      });
      return;
    }

    let cleanedId = inputCustomId.trim();
    const match = cleanedId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanedId = match[1];
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);

    try {
      const info = await checkSpreadsheetAccess(currentToken, cleanedId);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: cleanedId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanedId}/edit`,
        spreadsheetTitle: info.title,
        autoSync: true,
        webhookUrl: sheetsConfig?.webhookUrl,
        lastSyncedAt: new Date().toISOString(),
      };

      saveSheetsConfig(newConfig);
      setSheetsConfig(newConfig);
      setInputCustomId('');

      // Push existing records
      const records = getStoredRecords();
      const unsynced = records.filter((r) => !r.syncedToSheets);
      if (unsynced.length > 0) {
        await batchAppendRecordsToSpreadsheet(currentToken, cleanedId, unsynced);
        unsynced.forEach((r) => updateRecordSyncStatus(r.id, true, cleanedId));
        onRecordsUpdated();
      }

      setStatusMessage({
        text: `Berhasil terhubung ke spreadsheet: "${info.title}". Data lokal telah disinkronkan.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Gagal mengakses spreadsheet. Pastikan link/ID benar dan akun Anda memiliki izin edit.',
        type: 'error',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsConfig) {
      setStatusMessage({
        text: 'Buat atau hubungkan spreadsheet terlebih dahulu sebelum mengatur Webhook.',
        type: 'error',
      });
      return;
    }

    const updated = {
      ...sheetsConfig,
      webhookUrl: webhookInput.trim() || undefined,
    };
    saveSheetsConfig(updated);
    setSheetsConfig(updated);
    setStatusMessage({
      text: webhookInput.trim()
        ? 'Webhook Google Apps Script berhasil disimpan! Pengisian form dari HP orang tua mana pun sekarang akan langsung masuk otomatis tanpa perlu login.'
        : 'Webhook dinonaktifkan.',
      type: 'success',
    });
  };

  const handleSyncAllPending = async () => {
    if (!sheetsConfig?.spreadsheetId) {
      setStatusMessage({
        text: 'Belum ada Google Spreadsheet yang terhubung. Buat spreadsheet terlebih dahulu.',
        type: 'error',
      });
      return;
    }

    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setStatusMessage({
        text: 'Sesi Google Anda telah berakhir. Silakan klik "Sign in with Google" di bawah untuk memperbarui koneksi.',
        type: 'error',
      });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);

    try {
      const records = getStoredRecords();
      const unsynced = records.filter((r) => !r.syncedToSheets);

      if (unsynced.length === 0) {
        setStatusMessage({
          text: 'Semua respon sudah tersinkron ke Google Sheets!',
          type: 'info',
        });
        setIsSyncing(false);
        return;
      }

      await batchAppendRecordsToSpreadsheet(currentToken, sheetsConfig.spreadsheetId, unsynced);
      unsynced.forEach((r) => {
        updateRecordSyncStatus(r.id, true, sheetsConfig.spreadsheetId);
      });
      onRecordsUpdated();

      const updatedConfig = {
        ...sheetsConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      saveSheetsConfig(updatedConfig);
      setSheetsConfig(updatedConfig);

      setStatusMessage({
        text: `Berhasil! ${unsynced.length} data respon persetujuan berhasil dimasukkan ke Google Sheets.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Gagal menyinkronkan data ke Google Sheets.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendTestRow = async () => {
    if (!sheetsConfig?.spreadsheetId) {
      setStatusMessage({
        text: 'Hubungkan spreadsheet terlebih dahulu sebelum melakukan tes.',
        type: 'error',
      });
      return;
    }

    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setStatusMessage({
        text: 'Sesi Google Anda belum aktif. Silakan login Google terlebih dahulu.',
        type: 'error',
      });
      return;
    }

    setIsTestingRow(true);
    setStatusMessage(null);

    try {
      const now = new Date();
      const testRecord: ConsentRecord = {
        id: `TES-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB',
        namaSiswa: '[DATA UJI COBA KONEKSI]',
        kelas: '1-A',
        jenisVaksin: 'BIAS Dt (Difteri & Tetanus)',
        jenisKelamin: 'Laki-laki',
        namaOrangTua: 'Uji Coba Sistem UKS',
        hubunganOrangTua: 'Ayah',
        keputusan: 'SETUJU',
        catatanKesehatan: 'Baris uji coba koneksi berhasil masuk ke Google Sheets',
        tandaTanganUrl: '',
        syncedToSheets: true,
      };

      await appendRowToSpreadsheet(currentToken, sheetsConfig.spreadsheetId, testRecord);
      setStatusMessage({
        text: '🎉 Berhasil! 1 baris data tes telah masuk secara real-time ke Google Sheets Anda. Silakan cek file Google Sheets.',
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Gagal mengirim data tes ke Google Sheets.',
        type: 'error',
      });
    } finally {
      setIsTestingRow(false);
    }
  };

  const copyAppsScript = () => {
    navigator.clipboard.writeText(SAMPLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const allRecords = getStoredRecords();
  const unsyncedCount = allRecords.filter((r) => !r.syncedToSheets).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Integrasi Rekap Otomatis Google Sheets
            </h3>
            <p className="text-slate-500 text-xs">
              Merekap respon formulir orang tua langsung ke Google Drive {schoolInfo.namaSekolah}
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 bg-emerald-50/80 py-1.5 px-3 rounded-xl border border-emerald-200 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-950 font-semibold truncate max-w-[190px]">
              {currentUser.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-600 transition ml-1"
              title="Keluar dari akun Google"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Diagnostics: Mengapa Data Belum Masuk? */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Status & Pemeriksaan Koneksi Google Sheets</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Check 1 */}
          <div className={`p-3 rounded-xl border ${currentUser ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              {currentUser ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
              <span>1. Akun Google Sekolah</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {currentUser ? `Terhubung (${currentUser.email?.split('@')[0]})` : 'Belum login. Klik tombol di bawah.'}
            </p>
          </div>

          {/* Check 2 */}
          <div className={`p-3 rounded-xl border ${sheetsConfig?.spreadsheetId ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              {sheetsConfig?.spreadsheetId ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
              <span>2. File Spreadsheet</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {sheetsConfig?.spreadsheetId ? 'File rekap terhubung di Drive' : 'Belum dibuat. Klik tombol buat di bawah.'}
            </p>
          </div>

          {/* Check 3 */}
          <div className={`p-3 rounded-xl border ${unsyncedCount === 0 && sheetsConfig?.spreadsheetId ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              {unsyncedCount === 0 && sheetsConfig?.spreadsheetId ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span>3. Data Tersinkron</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {unsyncedCount === 0 && sheetsConfig?.spreadsheetId
                ? 'Semua data telah masuk'
                : `${unsyncedCount} respon belum dikirim ke Sheet`}
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-blue-50 text-blue-900 border border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
          <p className="flex-1 leading-relaxed">{statusMessage.text}</p>
        </div>
      )}

      {/* Step 1: Sign In if not logged in */}
      {!currentUser && (
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 text-center space-y-3">
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">
              Langkah 1: Hubungkan Akun Google Sekolah
            </h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              Login dengan akun Google panitia UKS / {schoolInfo.namaSekolah} untuk mengizinkan aplikasi membuat dan menulis ke Google Sheets Anda secara otomatis.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Official Material Google Sign-In Button */}
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={handleGoogleSignIn}
              className="gsi-material-button inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 shadow-sm transition cursor-pointer text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5 shrink-0 block"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Spreadsheet Active Status / Creation */}
      {sheetsConfig ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-200/60 px-2 py-0.5 rounded-full">
                ✓ Spreadsheet Aktif & Terhubung
              </span>
              <h4 className="font-bold text-slate-900 text-base">
                {sheetsConfig.spreadsheetTitle}
              </h4>
              <p className="text-[11px] font-mono text-slate-500">
                Spreadsheet ID: {sheetsConfig.spreadsheetId}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={sheetsConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Google Sheets</span>
              </a>

              <button
                type="button"
                onClick={() => setShowConfirmDisconnect(true)}
                className="text-xs text-slate-500 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition"
                title="Ganti spreadsheet"
              >
                Ganti
              </button>
            </div>
          </div>

          {/* Sync Actions Bar */}
          <div className="pt-3 border-t border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              {unsyncedCount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-semibold text-amber-900">
                    Ada {unsyncedCount} respon di memori sekolah yang belum masuk ke Google Sheets.
                  </span>
                </div>
              ) : (
                <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Semua {allRecords.length} respon telah tersinkron lengkap di Google Sheets.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTestingRow}
                onClick={handleSendTestRow}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                title="Kirim 1 baris uji coba untuk memastikan baris muncul di spreadsheet"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isTestingRow ? 'Mengirim...' : 'Tes Kirim 1 Baris'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncAllPending}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : `Sinkronkan Sekarang (${unsyncedCount})`}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Create New vs Link Existing */
        <div className="space-y-3">
          <h4 className="font-bold text-slate-800 text-sm">
            Langkah 2: Pilih Metode Pembuatan Spreadsheet
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: Create New Automatically */}
            <div className="p-5 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/30 space-y-3 transition">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Buat Spreadsheet Rekap Otomatis Baru</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistem akan langsung membuat file Google Sheets baru di Google Drive Anda dengan judul <strong>Rekap Persetujuan BIAS Dt & Td - {schoolInfo.namaSekolah}</strong> dan seluruh kolom resmi.
              </p>
              <button
                type="button"
                disabled={isCreatingSheet}
                onClick={handleCreateNewSheet}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isCreatingSheet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membuat Spreadsheet di Google Drive...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Buat Otomatis di Google Drive Sekarang</span>
                  </>
                )}
              </button>
            </div>

            {/* Option B: Link Existing */}
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 space-y-3 transition">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <LinkIcon className="w-4 h-4 text-slate-600" />
                <span>Tautkan Spreadsheet yang Sudah Ada</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sudah memiliki file Google Sheets yang disiapkan sebelumnya? Tempelkan link atau ID spreadsheet di bawah ini.
              </p>
              <form onSubmit={handleConnectExistingSheet} className="space-y-2">
                <input
                  type="text"
                  value={inputCustomId}
                  onChange={(e) => setInputCustomId(e.target.value)}
                  placeholder="Paste URL Google Sheets di sini..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={isCreatingSheet || !inputCustomId.trim()}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  Hubungkan File Ini
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Option: Webhook for Public Form Submission from Any Phone */}
      <div className="pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setShowWebhookGuide(!showWebhookGuide)}
          className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:text-emerald-700 transition py-1"
        >
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-600" />
            <span>Opsi Webhook Otomatis (Agar Orang Tua di HP Masing-Masing Langsung Masuk ke Google Sheets)</span>
          </div>
          {showWebhookGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showWebhookGuide && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3 animate-fadeIn">
            <p className="text-slate-600 leading-relaxed">
              Jika link formulir ini dibagikan ke grup WhatsApp orang tua siswa, Anda dapat mengaktifkan <strong>Google Apps Script Webhook</strong>. Dengan cara ini, setiap orang tua yang mengisi formulir di ponsel mereka tidak perlu login ke akun sekolah—data akan otomatis masuk detik itu juga ke Google Sheets Anda!
            </p>

            <div className="space-y-1">
              <span className="font-semibold text-slate-800 block">Cara Pasang (Hanya 1 Menit):</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Buka Google Sheets rekap Anda &gt; menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                <li>Hapus kode bawaan dan tempel kode skrip di bawah ini, lalu klik <strong>Simpan</strong>.</li>
                <li>Klik tombol biru <strong>Deploy (Terapkan)</strong> &gt; <strong>New deployment (Penerapan baru)</strong>.</li>
                <li>Pilih jenis <strong>Web app</strong>, atur <em>Who has access</em> ke <strong>Anyone (Siapa saja)</strong>, lalu Deploy.</li>
                <li>Salin <strong>Web app URL</strong> yang didapat dan tempelkan pada kolom di bawah ini.</li>
              </ol>
            </div>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                {SAMPLE_APPS_SCRIPT_CODE}
              </pre>
              <button
                type="button"
                onClick={copyAppsScript}
                className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg backdrop-blur-xs transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-2 pt-1">
              <label className="font-semibold text-slate-800 block">
                Web App URL dari Google Apps Script:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shrink-0"
                >
                  Simpan Webhook
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Disconnect confirmation dialog */}
      {showConfirmDisconnect && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-slate-900 text-base">Ganti Spreadsheet Rekap?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda ingin memutuskan tautan spreadsheet aktif ini? Data yang sudah tersimpan di Google Sheets Anda tidak akan dihapus.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDisconnect(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  saveSheetsConfig(null);
                  setSheetsConfig(null);
                  setShowConfirmDisconnect(false);
                  setStatusMessage({
                    text: 'Tautan spreadsheet telah dilepas. Anda dapat membuat atau memilih yang baru.',
                    type: 'info',
                  });
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs"
              >
                Putuskan Tautan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

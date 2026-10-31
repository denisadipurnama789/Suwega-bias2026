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
  FileCheck,
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
  const [inputCustomId, setInputCustomId] = useState('');
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
          text: `Berhasil terhubung dengan akun Google: ${res.user.email}`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Gagal login dengan akun Google. Silakan coba lagi.',
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
    if (!token) {
      setStatusMessage({
        text: 'Silakan login dengan akun Google terlebih dahulu.',
        type: 'error',
      });
      return;
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);
    try {
      const created = await createBiasSpreadsheet(token, schoolInfo.namaSekolah);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: created.title,
        autoSync: true,
        lastSyncedAt: new Date().toISOString(),
      };

      saveSheetsConfig(newConfig);
      setSheetsConfig(newConfig);

      // Immediately sync any existing records
      const records = getStoredRecords();
      if (records.length > 0) {
        await batchAppendRecordsToSpreadsheet(token, created.spreadsheetId, records);
        records.forEach((r) => {
          updateRecordSyncStatus(r.id, true, created.spreadsheetId);
        });
        onRecordsUpdated();
      }

      setStatusMessage({
        text: `Spreadsheet "${created.title}" berhasil dibuat dan dihubungkan! Semua data respon telah disinkronkan.`,
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

    if (!token) {
      setStatusMessage({
        text: 'Silakan login dengan akun Google terlebih dahulu.',
        type: 'error',
      });
      return;
    }

    // Extract ID from full URL if pasted
    let cleanedId = inputCustomId.trim();
    const match = cleanedId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanedId = match[1];
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);

    try {
      const info = await checkSpreadsheetAccess(token, cleanedId);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: cleanedId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanedId}/edit`,
        spreadsheetTitle: info.title,
        autoSync: true,
        lastSyncedAt: new Date().toISOString(),
      };

      saveSheetsConfig(newConfig);
      setSheetsConfig(newConfig);
      setInputCustomId('');

      setStatusMessage({
        text: `Berhasil terhubung ke spreadsheet: "${info.title}"`,
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

  const handleSyncAllPending = async () => {
    if (!sheetsConfig?.spreadsheetId) {
      setStatusMessage({
        text: 'Belum ada Google Spreadsheet yang terhubung.',
        type: 'error',
      });
      return;
    }

    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setStatusMessage({
        text: 'Sesi Google Anda telah berakhir. Silakan login ulang.',
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
        text: `Berhasil menyinkronkan ${unsynced.length} data respon baru ke Google Sheets!`,
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

  const allRecords = getStoredRecords();
  const unsyncedCount = allRecords.filter((r) => !r.syncedToSheets).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Integrasi Rekap Otomatis Google Sheets
            </h3>
            <p className="text-slate-500 text-xs">
              Sinkronisasi data persetujuan orang tua secara langsung ke spreadsheet sekolah
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 font-medium truncate max-w-[180px]">
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
      {!currentUser ? (
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 text-center space-y-3">
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="font-bold text-slate-800 text-sm">
              Hubungkan Akun Google Sekolah / Panitia UKS
            </h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              Masuk dengan akun Google untuk mengaktifkan pembuatan spreadsheet rekapitulasi otomatis di Google Drive Anda.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Official Material Google Sign-In Button */}
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={handleGoogleSignIn}
              className="gsi-material-button inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 shadow-xs transition cursor-pointer text-sm font-medium text-slate-700 disabled:opacity-50"
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
      ) : (
        /* Logged In View */
        <div className="space-y-4">
          {/* Active Connected Spreadsheet Card */}
          {sheetsConfig ? (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                    Spreadsheet Terhubung
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                    {sheetsConfig.spreadsheetTitle}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500">
                    ID: {sheetsConfig.spreadsheetId}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={sheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google Sheets</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowConfirmDisconnect(true)}
                    className="text-xs text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Putus tautan spreadsheet"
                  >
                    Ganti
                  </button>
                </div>
              </div>

              {/* Sync Actions Bar */}
              <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Auto-sync aktif
                  </span>
                  {unsyncedCount > 0 ? (
                    <span className="text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                      {unsyncedCount} respon belum tersinkron
                    </span>
                  ) : (
                    <span className="text-slate-400">Semua data up-to-date</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleSyncAllPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Choose: Create New vs Link Existing */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Create New */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 space-y-3 transition">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Buat Spreadsheet Rekap Baru</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sistem akan membuat Google Spreadsheet baru berformat resmi lengkap dengan kolom nama, kelas (1-A, 1-B, 2-A, 2-B, 5), status setuju/menolak, dan alasan.
                </p>
                <button
                  type="button"
                  disabled={isCreatingSheet}
                  onClick={handleCreateNewSheet}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isCreatingSheet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Membuat Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Buat Otomatis di Google Drive</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option B: Link Existing */}
              <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 space-y-3 transition">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <LinkIcon className="w-4 h-4 text-slate-600" />
                  <span>Tautkan Spreadsheet yang Ada</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sudah punya Google Sheets untuk rekap imunisasi? Tempelkan URL atau ID spreadsheet di bawah.
                </p>
                <form onSubmit={handleConnectExistingSheet} className="space-y-2">
                  <input
                    type="text"
                    value={inputCustomId}
                    onChange={(e) => setInputCustomId(e.target.value)}
                    placeholder="URL atau ID Google Sheets"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingSheet || !inputCustomId.trim()}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition disabled:opacity-50"
                  >
                    Hubungkan
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnect confirmation dialog (Destructive Operation safety rule from skill) */}
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

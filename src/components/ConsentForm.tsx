import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  User,
  Users,
  CheckCircle2,
  HelpCircle,
  FileText,
  AlertCircle,
  Loader2,
  Info,
  HeartPulse,
  ExternalLink,
} from 'lucide-react';
import { KelasType, KeputusanType, ConsentRecord } from '../types';
import { SignaturePad } from './SignaturePad';
import { appendRowToSpreadsheet, postToGoogleSheetsWebhook } from '../services/googleSheets';
import { getAccessToken } from '../services/firebaseAuth';
import { getSheetsConfig, saveConsentRecord, updateRecordSyncStatus, SchoolInfo } from '../services/storage';

interface ConsentFormProps {
  schoolInfo: SchoolInfo;
  onSuccess: (record: ConsentRecord) => void;
  onOpenInfoModal: () => void;
  onOpenSheetsTab?: () => void;
}

const KELAS_OPTIONS: { label: string; value: KelasType; vaccine: 'Dt' | 'Td'; targetDesc: string }[] = [
  { label: 'Kelas 1-A', value: '1-A', vaccine: 'Dt', targetDesc: 'Vaksin Dt (Difteri & Tetanus)' },
  { label: 'Kelas 1-B', value: '1-B', vaccine: 'Dt', targetDesc: 'Vaksin Dt (Difteri & Tetanus)' },
  { label: 'Kelas 2-A', value: '2-A', vaccine: 'Td', targetDesc: 'Vaksin Td (Lanjutan Tetanus & Difteri)' },
  { label: 'Kelas 2-B', value: '2-B', vaccine: 'Td', targetDesc: 'Vaksin Td (Lanjutan Tetanus & Difteri)' },
  { label: 'Kelas 5', value: '5', vaccine: 'Td', targetDesc: 'Vaksin Td (Lanjutan Tetanus & Difteri)' },
];

const ALASAN_OPTIONS = [
  'Sudah mendapatkan imunisasi Dt / Td secara mandiri di Dokter/RS/Klinik',
  'Anak sedang dalam kondisi sakit / dalam pengobatan dokter',
  'Memiliki riwayat alergi berat terhadap vaksin sebelumnya',
  'Kekhawatiran terhadap kejadian ikutan pasca imunisasi (KIPI)',
  'Lainnya (jelaskan pada catatan di bawah)',
];

export const ConsentForm: React.FC<ConsentFormProps> = ({
  schoolInfo,
  onSuccess,
  onOpenInfoModal,
  onOpenSheetsTab,
}) => {
  const [namaSiswa, setNamaSiswa] = useState('');
  const [kelas, setKelas] = useState<KelasType | ''>('1-A');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  const [namaOrangTua, setNamaOrangTua] = useState('');
  const [hubunganOrangTua, setHubunganOrangTua] = useState<'Ayah' | 'Ibu' | 'Wali'>('Ayah');

  const [keputusan, setKeputusan] = useState<KeputusanType | null>(null);
  const [alasanMenolak, setAlasanMenolak] = useState('');
  const [detailAlasan, setDetailAlasan] = useState('');

  // Skrining kondisi anak opsional yang diketik sendiri oleh orang tua
  const [catatanKesehatan, setCatatanKesehatan] = useState('');

  const [tandaTanganUrl, setTandaTanganUrl] = useState('');
  const [isStatementAgreed, setIsStatementAgreed] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derive vaccine type based on class selection
  const selectedKelasObj = KELAS_OPTIONS.find((k) => k.value === kelas);
  const jenisVaksin =
    selectedKelasObj?.vaccine === 'Dt'
      ? 'BIAS Dt (Difteri & Tetanus)'
      : 'BIAS Td (Tetanus & Difteri Lanjutan)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validations
    if (!namaSiswa.trim()) {
      setErrorMessage('Mohon isi nama lengkap siswa.');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    if (!kelas) {
      setErrorMessage('Mohon pilih kelas siswa.');
      return;
    }

    if (!namaOrangTua.trim()) {
      setErrorMessage('Mohon isi nama orang tua atau wali.');
      return;
    }

    if (!keputusan) {
      setErrorMessage('Mohon tentukan pilihan persetujuan: SETUJU atau MENOLAK.');
      return;
    }

    if (keputusan === 'MENOLAK' && !alasanMenolak) {
      setErrorMessage('Mohon pilih alasan penolakan imunisasi.');
      return;
    }

    if (!tandaTanganUrl) {
      setErrorMessage('Tanda tangan digital orang tua/wali wajib dibubuhkan.');
      return;
    }

    if (!isStatementAgreed) {
      setErrorMessage('Mohon centang pernyataan persetujuan dan kebenaran data.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const recordId = `BIAS-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const formattedDate =
        now.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB';

      const newRecord: ConsentRecord = {
        id: recordId,
        createdAt: now.toISOString(),
        formattedDate,
        namaSiswa: namaSiswa.trim(),
        kelas: kelas as KelasType,
        jenisVaksin,
        jenisKelamin,
        namaOrangTua: namaOrangTua.trim(),
        hubunganOrangTua,
        keputusan,
        alasanMenolak: keputusan === 'MENOLAK' ? alasanMenolak : undefined,
        detailAlasan: keputusan === 'MENOLAK' ? detailAlasan.trim() : undefined,
        catatanKesehatan: catatanKesehatan.trim() || undefined,
        tandaTanganUrl,
        syncedToSheets: false,
      };

      // 1. Save to localStorage first for reliable offline/data guarantee
      saveConsentRecord(newRecord);

      // 2. Check if Google Sheets sync is configured (via Webhook or Google OAuth)
      const sheetsConfig = getSheetsConfig();
      let isSynced = false;

      // Method A: If Webhook URL is set (Universal sync from any smartphone without login)
      if (sheetsConfig?.webhookUrl) {
        try {
          const ok = await postToGoogleSheetsWebhook(sheetsConfig.webhookUrl, newRecord);
          if (ok) isSynced = true;
        } catch (e) {
          console.warn('Webhook sync error:', e);
        }
      }

      // Method B: If Google OAuth Token is active in session
      if (!isSynced && sheetsConfig?.spreadsheetId) {
        try {
          const accessToken = await getAccessToken();
          if (accessToken) {
            await appendRowToSpreadsheet(accessToken, sheetsConfig.spreadsheetId, newRecord);
            isSynced = true;
          }
        } catch (sheetErr) {
          console.warn('Sync to Google Sheets delayed or token expired:', sheetErr);
        }
      }

      if (isSynced) {
        updateRecordSyncStatus(newRecord.id, true, sheetsConfig?.spreadsheetId);
        newRecord.syncedToSheets = true;
        newRecord.spreadsheetId = sheetsConfig?.spreadsheetId;
      }

      onSuccess(newRecord);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan formulir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSheetsConfig = getSheetsConfig();

  return (
    <div className="w-full max-w-2xl mx-auto pb-16">
      {/* Puskesmas & UKS Header Card */}
      <div className="bg-linear-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-5 sm:p-7 shadow-lg shadow-emerald-950/10 mb-5 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Program Resmi BIAS Kemenkes RI
            </span>
            <button
              type="button"
              onClick={onOpenInfoModal}
              className="inline-flex items-center gap-1 text-xs text-emerald-100 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Info BIAS Dt/Td</span>
            </button>
          </div>

          <div className="mb-1">
            <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold block">
              {schoolInfo.namaSekolah}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              Form Persetujuan Imunisasi BIAS Dt / Td
            </h1>
          </div>

          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed max-w-xl">
            Bekerjasama dengan {schoolInfo.namaPuskesmas}. Mohon bapak/ibu orang tua atau wali siswa mengisi surat persetujuan di bawah ini.
          </p>

          <div className="mt-4 pt-3 border-t border-emerald-600/40 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] sm:text-xs text-emerald-200">
            <span>📅 Jadwal Pelaksanaan: <strong>{schoolInfo.jadwalPelaksanaan}</strong></span>
            <span>🏫 Tahun Ajaran: <strong>{schoolInfo.tahunAjaran}</strong></span>
          </div>
        </div>
      </div>

      {/* Live Google Sheets Connection Status Banner */}
      <div className="mb-5 rounded-2xl border p-4 transition bg-white shadow-xs">
        {currentSheetsConfig?.spreadsheetId ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Google Sheets Terhubung: <span className="text-emerald-700">{currentSheetsConfig.spreadsheetTitle}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Respon form otomatis tersinkron ke spreadsheet Google Drive sekolah.
                </p>
              </div>
            </div>
            {currentSheetsConfig.spreadsheetUrl && (
              <a
                href={currentSheetsConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1 shrink-0 self-start sm:self-auto"
              >
                <span>Buka Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/80 border border-amber-200 p-3 rounded-xl">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-900">
                  Google Sheets Belum Terhubung ke Akun Sekolah
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Data yang diisi orang tua saat ini tersimpan aman di database sekolah. Untuk langsung merekap ke Google Drive sekolah secara otomatis, hubungkan akun Google di menu <strong>"Google Sheets Rekap"</strong>.
                </p>
              </div>
            </div>
            {onOpenSheetsTab && (
              <button
                type="button"
                onClick={onOpenSheetsTab}
                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3.5 py-2 rounded-xl transition shrink-0 shadow-xs self-start sm:self-auto"
              >
                Hubungkan Sekarang
              </button>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Perhatian</p>
            <p className="text-rose-700 text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Data Siswa */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Identitas Siswa</h2>
              <p className="text-slate-500 text-xs">Pilih kelas siswa di {schoolInfo.namaSekolah}</p>
            </div>
          </div>

          {/* Nama Siswa */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Nama Lengkap Siswa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                placeholder="Masukkan nama lengkap siswa..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          {/* Kelas Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800">
                Pilih Kelas <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 font-medium">Opsi: 1-A, 1-B, 2-A, 2-B, 5</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {KELAS_OPTIONS.map((item) => {
                const isSelected = kelas === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setKelas(item.value)}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base font-bold">{item.value}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.vaccine === 'Dt'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {item.vaccine === 'Dt' ? 'Vaksin Dt' : 'Vaksin Td'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Vaccine Info Banner based on selected class */}
            {selectedKelasObj && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">
                    {selectedKelasObj.targetDesc}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedKelasObj.vaccine === 'Dt'
                      ? 'Diberikan untuk siswa kelas 1 guna mencegah penyakit Difteri dan Tetanus.'
                      : 'Diberikan sebagai dosis penguat (booster) untuk siswa kelas 2 dan kelas 5.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Jenis Kelamin */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-sm font-semibold text-slate-800">
              Jenis Kelamin <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['Laki-laki', 'Perempuan'] as const).map((jk) => (
                <button
                  key={jk}
                  type="button"
                  onClick={() => setJenisKelamin(jk)}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition text-center ${
                    jenisKelamin === jk
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {jk}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Data Orang Tua / Wali */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Identitas Orang Tua / Wali</h2>
              <p className="text-slate-500 text-xs">Pihak yang memberikan persetujuan resmi</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Nama Lengkap Orang Tua / Wali <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={namaOrangTua}
                onChange={(e) => setNamaOrangTua(e.target.value)}
                placeholder="Masukkan nama lengkap orang tua / wali..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Hubungan Keluarga
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['Ayah', 'Ibu', 'Wali'] as const).map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => setHubunganOrangTua(hub)}
                  className={`py-2 px-2 rounded-xl border text-xs sm:text-sm font-medium transition text-center ${
                    hubunganOrangTua === hub
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Persetujuan Orang Tua (Setuju / Menolak) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Persetujuan Orang Tua</h2>
              <p className="text-slate-500 text-xs">Pilih keputusan persetujuan imunisasi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* OPSI SETUJU */}
            <div
              onClick={() => {
                setKeputusan('SETUJU');
                setAlasanMenolak('');
                setDetailAlasan('');
              }}
              className={`cursor-pointer rounded-2xl p-4 sm:p-5 border-2 transition-all relative select-none ${
                keputusan === 'SETUJU'
                  ? 'border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    keputusan === 'SETUJU'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {keputusan === 'SETUJU' && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-base text-emerald-950">SETUJU</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Saya <strong>MEMBERIKAN IZIN</strong> dan persetujuan anak saya untuk diimunisasi <strong>{jenisVaksin}</strong> di {schoolInfo.namaSekolah}.
                  </p>
                </div>
              </div>
            </div>

            {/* OPSI MENOLAK */}
            <div
              onClick={() => setKeputusan('MENOLAK')}
              className={`cursor-pointer rounded-2xl p-4 sm:p-5 border-2 transition-all relative select-none ${
                keputusan === 'MENOLAK'
                  ? 'border-rose-600 bg-rose-50/80 shadow-md ring-2 ring-rose-500/20'
                  : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    keputusan === 'MENOLAK'
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {keputusan === 'MENOLAK' && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ShieldX className="w-5 h-5 text-rose-600" />
                    <span className="font-bold text-base text-rose-950">MENOLAK</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Saya <strong>TIDAK MENGIZINKAN</strong> anak saya diimunisasi pada kegiatan BIAS di sekolah kali ini.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Alasan jika Menolak */}
          {keputusan === 'MENOLAK' && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50/80 border border-rose-200 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-900 font-semibold text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Alasan Penolakan Imunisasi (Wajib Diisi) <span className="text-rose-600">*</span></span>
              </div>
              <p className="text-xs text-rose-700">
                Puskesmas dan pihak sekolah memerlukan keterangan resmi untuk dokumentasi laporan kesehatan siswa.
              </p>

              <div className="space-y-2 pt-1">
                {ALASAN_OPTIONS.map((alasan) => (
                  <label
                    key={alasan}
                    className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer p-2 rounded-lg hover:bg-rose-100/60 transition"
                  >
                    <input
                      type="radio"
                      name="alasanMenolak"
                      value={alasan}
                      checked={alasanMenolak === alasan}
                      onChange={(e) => setAlasanMenolak(e.target.value)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span>{alasan}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Keterangan Tambahan / Riwayat Medis:
                </label>
                <textarea
                  rows={2}
                  value={detailAlasan}
                  onChange={(e) => setDetailAlasan(e.target.value)}
                  placeholder="Tuliskan penjelasan tambahan (contoh: sudah imunisasi mandiri di RS, saran dokter, dll.)"
                  className="w-full p-2.5 text-xs rounded-xl border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white"
                />
              </div>
            </div>
          )}

          {/* Skrining Kondisi Anak Dibuat Opsional (Orang Tua Mengetik Sendiri) */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-emerald-600" />
                <span>Catatan / Skrining Kondisi Kesehatan Anak</span>
                <span className="text-slate-400 font-normal text-[11px]">(Opsional)</span>
              </label>
              <span className="text-[11px] text-slate-400">Ketik jika ada</span>
            </div>
            <textarea
              rows={2}
              value={catatanKesehatan}
              onChange={(e) => setCatatanKesehatan(e.target.value)}
              placeholder="Ketik sendiri kondisi anak saat ini (misal: anak sedang pilek/batuk, ada riwayat alergi obat/makanan tertentu, atau sedang konsumsi obat). Boleh dikosongkan jika anak sehat."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400">
              * Bersifat opsional. Petugas medis Puskesmas akan memeriksa kondisi fisik anak sebelum penyuntikan.
            </p>
          </div>
        </div>

        {/* Section 4: Tanda Tangan Orang Tua / Wali */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Verifikasi Tanda Tangan Resmi</h2>
              <p className="text-slate-500 text-xs">Sebagai bukti keabsahan persetujuan orang tua/wali siswa</p>
            </div>
          </div>

          <SignaturePad
            value={tandaTanganUrl}
            onChange={(url) => setTandaTanganUrl(url)}
            required
          />

          {/* Pernyataan Kebenaran Data */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isStatementAgreed}
                onChange={(e) => setIsStatementAgreed(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="leading-relaxed">
                Saya menyatakan dengan sesungguhnya bahwa data yang saya berikan adalah benar, dan saya bertanggung jawab penuh atas keputusan persetujuan/penolakan imunisasi untuk anak saya di <strong>{schoolInfo.namaSekolah}</strong>.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-base shadow-lg transition flex items-center justify-center gap-2.5 ${
              isSubmitting
                ? 'bg-slate-400 cursor-not-allowed'
                : keputusan === 'MENOLAK'
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menyimpan dan Merekap Data...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>
                  {keputusan === 'MENOLAK'
                    ? 'Kirim Formulir Penolakan Imunisasi'
                    : 'Kirim Surat Persetujuan Imunisasi Resmi'}
                </span>
              </>
            )}
          </button>

          <p className="text-center text-slate-400 text-[11px]">
            Data akan terekam ke sistem arsip UKS {schoolInfo.namaSekolah} & otomatis direkap ke Google Sheets Puskesmas.
          </p>
        </div>
      </form>
    </div>
  );
};

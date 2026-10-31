import React from 'react';
import {
  CheckCircle2,
  Printer,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  ShieldX,
  ExternalLink,
  School,
} from 'lucide-react';
import { ConsentRecord } from '../types';
import { SchoolInfo } from '../services/storage';

interface SubmissionSuccessModalProps {
  record: ConsentRecord;
  schoolInfo: SchoolInfo;
  onReset: () => void;
  spreadsheetUrl?: string;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  record,
  schoolInfo,
  onReset,
  spreadsheetUrl,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-16">
      {/* Success Notification Banner */}
      <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 text-center space-y-2 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-emerald-950">
          Formulir Berhasil Disimpan & Diverifikasi!
        </h2>
        <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto">
          Terima kasih atas partisipasi Anda dalam program Bulan Imunisasi Anak Sekolah (BIAS). Respon Anda telah dicatat secara resmi oleh pihak {schoolInfo.namaSekolah}.
        </p>

        {record.syncedToSheets && spreadsheetUrl && (
          <div className="pt-2">
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-white hover:bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-300 font-medium transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Data otomatis tersinkron ke Google Sheets Rekap Sekolah</span>
            </a>
          </div>
        )}
      </div>

      {/* Official Printable Slip / Letter Card */}
      <div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 space-y-6">
        {/* Kop Surat Resmi */}
        <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-slate-800">
            <School className="w-6 h-6 text-emerald-700 print:text-black" />
            <span className="font-extrabold text-base sm:text-lg uppercase tracking-wider">
              {schoolInfo.namaSekolah}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {schoolInfo.alamatSekolah} • Bekerjasama dengan {schoolInfo.namaPuskesmas}
          </p>
          <div className="pt-1">
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-tight text-slate-900 underline decoration-slate-400">
              SURAT PERNYATAAN PERSETUJUAN IMUNISASI BIAS
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              No. Registrasi: {record.id} • Tanggal: {record.formattedDate}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {record.keputusan === 'SETUJU' ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>STATUS: SETUJU MENGIKUTI IMUNISASI</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 font-bold text-sm">
              <ShieldX className="w-5 h-5 text-rose-700" />
              <span>STATUS: MENOLAK IMUNISASI</span>
            </div>
          )}
        </div>

        {/* Data Grid */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs sm:text-sm space-y-2.5">
          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Nama Siswa</span>
            <span className="col-span-2 font-bold text-slate-900">{record.namaSiswa}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Kelas</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {record.kelas} ({record.jenisKelamin})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Jenis Vaksinasi</span>
            <span className="col-span-2 font-semibold text-emerald-800">{record.jenisVaksin}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Nama Orang Tua / Wali</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {record.namaOrangTua} ({record.hubunganOrangTua})
            </span>
          </div>

          {record.keputusan === 'MENOLAK' && (
            <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/60">
              <span className="text-rose-600 font-semibold">Alasan Penolakan</span>
              <div className="col-span-2 text-slate-900 space-y-1">
                <p className="font-medium text-rose-900">{record.alasanMenolak}</p>
                {record.detailAlasan && (
                  <p className="text-xs text-slate-600 italic">"{record.detailAlasan}"</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 py-1">
            <span className="text-slate-500 font-medium">Catatan Kondisi Anak</span>
            <div className="col-span-2 text-slate-800 text-xs font-medium">
              {record.catatanKesehatan ? (
                <p>"{record.catatanKesehatan}"</p>
              ) : (
                <p className="text-slate-500 font-normal">Kondisi sehat / Tidak ada catatan khusus</p>
              )}
            </div>
          </div>
        </div>

        {/* Tanda Tangan Verification Section */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-200">
          <div className="text-center sm:text-left text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Verifikasi Sistem Digital</p>
            <p className="text-[11px]">Tercatat pada: {record.formattedDate}</p>
            <p className="text-[11px] font-mono text-emerald-700">UKS-{record.kelas}-VERIFIED</p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-slate-800">
              Orang Tua / Wali Siswa,
            </p>
            <div className="w-48 h-20 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center p-1 overflow-hidden">
              {record.tandaTanganUrl ? (
                <img
                  src={record.tandaTanganUrl}
                  alt="Tanda Tangan Orang Tua"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400 italic">Tanda tangan digital</span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-900 underline decoration-slate-400">
              ( {record.namaOrangTua} )
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 italic pt-2">
          Dokumen ini sah dan diterbitkan secara elektronik oleh Unit Kesehatan Sekolah (UKS) {schoolInfo.namaSekolah} untuk program BIAS Kemenkes RI.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="no-print mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak / Simpan PDF Surat</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Isi Formulir untuk Siswa Lain</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

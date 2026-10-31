import React, { useState } from 'react';
import {
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  FileSpreadsheet,
  Users,
  PieChart,
  Trash2,
  Printer,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  HeartPulse,
  AlertCircle,
} from 'lucide-react';
import { ConsentRecord, KelasType } from '../types';
import {
  deleteStoredRecord,
  SchoolInfo,
} from '../services/storage';

interface RekapDashboardProps {
  records: ConsentRecord[];
  onRecordsChange: (updated: ConsentRecord[]) => void;
  schoolInfo: SchoolInfo;
  spreadsheetUrl?: string;
  onOpenSheetsTab?: () => void;
}

export const RekapDashboard: React.FC<RekapDashboardProps> = ({
  records,
  onRecordsChange,
  schoolInfo,
  spreadsheetUrl,
  onOpenSheetsTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ConsentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Statistics
  const totalRecords = records.length;
  const totalSetuju = records.filter((r) => r.keputusan === 'SETUJU').length;
  const totalMenolak = records.filter((r) => r.keputusan === 'MENOLAK').length;
  const persentaseSetuju = totalRecords > 0 ? Math.round((totalSetuju / totalRecords) * 100) : 0;
  const persentaseMenolak = totalRecords > 0 ? Math.round((totalMenolak / totalRecords) * 100) : 0;

  // Class distribution
  const kelasCounts: Record<KelasType, { total: number; setuju: number; menolak: number }> = {
    '1-A': { total: 0, setuju: 0, menolak: 0 },
    '1-B': { total: 0, setuju: 0, menolak: 0 },
    '2-A': { total: 0, setuju: 0, menolak: 0 },
    '2-B': { total: 0, setuju: 0, menolak: 0 },
    '5': { total: 0, setuju: 0, menolak: 0 },
  };

  records.forEach((r) => {
    if (kelasCounts[r.kelas]) {
      kelasCounts[r.kelas].total += 1;
      if (r.keputusan === 'SETUJU') kelasCounts[r.kelas].setuju += 1;
      else kelasCounts[r.kelas].menolak += 1;
    }
  });

  // Filtered list
  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.namaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.namaOrangTua.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchKelas = filterKelas === 'all' || r.kelas === filterKelas;
    const matchStatus = filterStatus === 'all' || r.keputusan === filterStatus;

    return matchSearch && matchKelas && matchStatus;
  });

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Waktu Pengisian',
      'ID Respon',
      'Nama Siswa',
      'Kelas',
      'Jenis Vaksin',
      'Jenis Kelamin',
      'Nama Orang Tua/Wali',
      'Hubungan',
      'Status Persetujuan',
      'Alasan Menolak',
      'Detail Alasan',
      'Catatan Kondisi Anak',
      'Status Sinkronisasi',
    ];

    const rows = records.map((r) => [
      `"${r.formattedDate || r.createdAt}"`,
      `"${r.id}"`,
      `"${r.namaSiswa}"`,
      `"${r.kelas}"`,
      `"${r.jenisVaksin}"`,
      `"${r.jenisKelamin}"`,
      `"${r.namaOrangTua}"`,
      `"${r.hubunganOrangTua}"`,
      `"${r.keputusan}"`,
      `"${r.alasanMenolak || '-'}"`,
      `"${(r.detailAlasan || '-').replace(/"/g, '""')}"`,
      `"${(r.catatanKesehatan || 'Sehat / Tidak ada catatan').replace(/"/g, '""')}"`,
      `"${r.syncedToSheets ? 'Tersinkron Google Sheets' : 'Lokal'}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Persetujuan_BIAS_SDN_SUMUR_WELUT_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = deleteStoredRecord(id);
    onRecordsChange(updated);
    setDeleteConfirmId(null);
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
  };

  const unsyncedCount = records.filter((r) => !r.syncedToSheets).length;

  return (
    <div className="space-y-6">
      {/* Unsynced Alert Banner */}
      {unsyncedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Ada {unsyncedCount} Data Respon Belum Masuk ke Google Sheets
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Data sudah aman di arsip sekolah. Untuk merekap seluruh data ke spreadsheet Google Drive, buka menu Google Sheets Rekap.
              </p>
            </div>
          </div>
          {onOpenSheetsTab && (
            <button
              type="button"
              onClick={onOpenSheetsTab}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs shrink-0 self-start sm:self-auto"
            >
              Sinkronkan ke Google Sheets
            </button>
          )}
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Respon</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalRecords}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Siswa terdata</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-semibold">Setuju Imunisasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-700">{totalSetuju}</span>
            <span className="text-xs font-semibold text-emerald-600">({persentaseSetuju}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Mendapat izin orang tua</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-semibold">Menolak</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-700">{totalMenolak}</span>
            <span className="text-xs font-semibold text-rose-600">({persentaseMenolak}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Dengan alasan tercatat</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-teal-600 mb-1">
            <span className="text-xs font-semibold">Google Sheets</span>
            <FileSpreadsheet className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-teal-800">
            {records.filter((r) => r.syncedToSheets).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tersinkron ke Cloud</p>
        </div>
      </div>

      {/* Class Distribution Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-emerald-600" />
          <span>Distribusi Data Per Kelas (SDN SUMUR WELUT III/440)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {(['1-A', '1-B', '2-A', '2-B', '5'] as KelasType[]).map((kls) => {
            const data = kelasCounts[kls];
            return (
              <div
                key={kls}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Kelas {kls}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {kls === '1-A' || kls === '1-B' ? 'Dt' : 'Td'}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900">{data.total} <span className="text-xs text-slate-400 font-normal">siswa</span></div>
                <div className="flex items-center justify-center gap-2 text-[11px]">
                  <span className="text-emerald-700 font-medium">✓ {data.setuju}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-600 font-medium">✕ {data.menolak}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Actions Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa atau orang tua..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
            />
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Kelas</option>
              <option value="1-A">Kelas 1-A</option>
              <option value="1-B">Kelas 1-B</option>
              <option value="2-A">Kelas 2-A</option>
              <option value="2-B">Kelas 2-B</option>
              <option value="5">Kelas 5</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="SETUJU">Hanya Setuju</option>
              <option value="MENOLAK">Hanya Menolak</option>
            </select>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              title="Unduh rekapan format CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Action hints if empty */}
        {records.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Belum Ada Formulir Masuk</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Data respon akan otomatis masuk dan terekap di sini setiap kali orang tua siswa mengisi formulir persetujuan.
            </p>
          </div>
        )}
      </div>

      {/* Submissions List (Mobile Card + Desktop Table) */}
      {filteredRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Vaksin</th>
                  <th className="py-3 px-3">Orang Tua / Wali</th>
                  <th className="py-3 px-3">Keputusan</th>
                  <th className="py-3 px-3">Kondisi Anak</th>
                  <th className="py-3 px-3">Tanda Tangan</th>
                  <th className="py-3 px-3">Sheets</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{item.namaSiswa}</div>
                      <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {item.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.kelas === '1-A' || item.kelas === '1-B' ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                          BIAS Dt
                        </span>
                      ) : (
                        <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-semibold">
                          BIAS Td
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="font-medium">{item.namaOrangTua}</div>
                      <span className="text-[10px] text-slate-400">({item.hubunganOrangTua})</span>
                    </td>
                    <td className="py-3 px-3">
                      {item.keputusan === 'SETUJU' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          SETUJU
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                          title={item.alasanMenolak}
                        >
                          <XCircle className="w-3 h-3 text-rose-600" />
                          MENOLAK
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-[140px] truncate text-slate-600">
                      {item.catatanKesehatan ? (
                        <span title={item.catatanKesehatan} className="text-slate-800 italic">
                          "{item.catatanKesehatan}"
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Sehat</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.tandaTanganUrl ? (
                        <div
                          onClick={() => setSelectedRecord(item)}
                          className="w-14 h-8 bg-slate-50 border border-slate-200 rounded cursor-pointer hover:border-emerald-500 p-0.5 flex items-center justify-center transition"
                          title="Klik untuk melihat tanda tangan"
                        >
                          <img
                            src={item.tandaTanganUrl}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.syncedToSheets ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Tersinkron
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Lokal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        title="Lihat Detail & Tanda Tangan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus respon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredRecords.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{item.namaSiswa}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        Kelas {item.kelas}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.id}
                      </span>
                    </div>
                  </div>

                  {item.keputusan === 'SETUJU' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      SETUJU
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      MENOLAK
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <span className="text-slate-400">Orang Tua / Wali:</span> {item.namaOrangTua} ({item.hubunganOrangTua})
                  </p>
                  {item.catatanKesehatan && (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                      <strong>Kondisi Anak:</strong> "{item.catatanKesehatan}"
                    </p>
                  )}
                  {item.keputusan === 'MENOLAK' && item.alasanMenolak && (
                    <p className="text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100 text-[11px]">
                      <strong>Alasan:</strong> {item.alasanMenolak}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {item.formattedDate}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail & Signature Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Detail Persetujuan Siswa</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedRecord.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Status Keputusan:</span>
                {selectedRecord.keputusan === 'SETUJU' ? (
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                    SETUJU DIIMUNISASI
                  </span>
                ) : (
                  <span className="font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
                    MENOLAK DIIMUNISASI
                  </span>
                )}
              </div>

              <div className="space-y-2 border-b border-slate-100 pb-3">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-bold text-slate-900">{selectedRecord.namaSiswa}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Kelas:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRecord.kelas} ({selectedRecord.jenisKelamin})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Jenis Vaksin:</span>
                  <span className="font-semibold text-emerald-800">{selectedRecord.jenisVaksin}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Orang Tua / Wali:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.namaOrangTua} ({selectedRecord.hubunganOrangTua})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Waktu Pengisian:</span>
                  <span className="text-slate-700">{selectedRecord.formattedDate}</span>
                </div>
              </div>

              {/* Catatan Kondisi Anak Opsional */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Catatan Kondisi Anak:</span>
                </span>
                <p className="text-slate-700">
                  {selectedRecord.catatanKesehatan ? (
                    `"${selectedRecord.catatanKesehatan}"`
                  ) : (
                    <span className="text-slate-400 italic">Tidak ada catatan khusus (sehat)</span>
                  )}
                </p>
              </div>

              {selectedRecord.keputusan === 'MENOLAK' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
                  <span className="font-bold text-rose-900">Alasan Penolakan:</span>
                  <p className="text-rose-800">{selectedRecord.alasanMenolak}</p>
                  {selectedRecord.detailAlasan && (
                    <p className="text-slate-700 italic border-t border-rose-200/60 pt-1">
                      "{selectedRecord.detailAlasan}"
                    </p>
                  )}
                </div>
              )}

              {/* Tanda Tangan Preview */}
              <div className="space-y-1.5 pt-1">
                <span className="font-semibold text-slate-800 block">
                  Tanda Tangan Asli Orang Tua / Wali:
                </span>
                <div className="w-full h-32 rounded-xl border border-slate-300 bg-slate-50 p-2 flex items-center justify-center overflow-hidden">
                  {selectedRecord.tandaTanganUrl ? (
                    <img
                      src={selectedRecord.tandaTanganUrl}
                      alt="Tanda Tangan"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs italic">Tidak ada tanda tangan</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Tertandatangani oleh: <strong>{selectedRecord.namaOrangTua}</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-slate-900 text-base">Hapus Respon Persetujuan?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus arsip respon ini? Tindakan ini tidak dapat dibatalkan pada penyimpanan lokal.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(deleteConfirmId)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

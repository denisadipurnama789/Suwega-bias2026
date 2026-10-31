import React, { useState } from 'react';
import { School, Settings, Save, X } from 'lucide-react';
import { SchoolInfo, saveSchoolInfo } from '../services/storage';

interface SchoolSettingsModalProps {
  currentInfo: SchoolInfo;
  onSave: (newInfo: SchoolInfo) => void;
  onClose: () => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  currentInfo,
  onSave,
  onClose,
}) => {
  const [namaSekolah, setNamaSekolah] = useState(currentInfo.namaSekolah);
  const [namaPuskesmas, setNamaPuskesmas] = useState(currentInfo.namaPuskesmas);
  const [alamatSekolah, setAlamatSekolah] = useState(currentInfo.alamatSekolah);
  const [tahunAjaran, setTahunAjaran] = useState(currentInfo.tahunAjaran);
  const [jadwalPelaksanaan, setJadwalPelaksanaan] = useState(currentInfo.jadwalPelaksanaan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolInfo = {
      namaSekolah: namaSekolah.trim() || 'SD Negeri',
      namaPuskesmas: namaPuskesmas.trim() || 'Puskesmas Setempat',
      alamatSekolah: alamatSekolah.trim() || 'Indonesia',
      tahunAjaran: tahunAjaran.trim() || '2026/2027',
      jadwalPelaksanaan: jadwalPelaksanaan.trim() || 'November 2026',
    };
    saveSchoolInfo(updated);
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Pengaturan Data Sekolah & UKS</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Nama Sekolah Dasar</label>
            <input
              type="text"
              required
              value={namaSekolah}
              onChange={(e) => setNamaSekolah(e.target.value)}
              placeholder="Contoh: SD Negeri 01 Pagi"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Nama Puskesmas Pembina</label>
            <input
              type="text"
              required
              value={namaPuskesmas}
              onChange={(e) => setNamaPuskesmas(e.target.value)}
              placeholder="Contoh: Puskesmas Kecamatan Menteng"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Alamat Sekolah</label>
            <input
              type="text"
              value={alamatSekolah}
              onChange={(e) => setAlamatSekolah(e.target.value)}
              placeholder="Contoh: Jl. Pegangsaan Timur No. 12"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Tahun Ajaran</label>
              <input
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="2026/2027"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Jadwal Pelaksanaan</label>
              <input
                type="text"
                value={jadwalPelaksanaan}
                onChange={(e) => setJadwalPelaksanaan(e.target.value)}
                placeholder="November 2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

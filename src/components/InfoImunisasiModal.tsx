import React from 'react';
import { ShieldCheck, Info, HeartPulse, CheckCircle2, AlertTriangle } from 'lucide-react';

interface InfoImunisasiModalProps {
  onClose: () => void;
}

export const InfoImunisasiModal: React.FC<InfoImunisasiModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Informasi Imunisasi BIAS Dt & Td</h3>
              <p className="text-xs text-slate-500">Kementerian Kesehatan Republik Indonesia & Puskesmas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 space-y-2">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 text-emerald-700" />
              <span>Apa itu Program BIAS Dt dan Td?</span>
            </h4>
            <p>
              Bulan Imunisasi Anak Sekolah (BIAS) adalah program imunisasi lanjutan nasional yang rutin diselenggarakan setiap tahun oleh Puskesmas untuk memberikan perlindungan kekebalan seumur hidup terhadap penyakit menular berbahaya.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pt-1">
              <li>
                <strong>Vaksin Dt (Difteri & Tetanus):</strong> Diberikan kepada siswa <strong>Kelas 1 SD</strong>.
              </li>
              <li>
                <strong>Vaksin Td (Tetanus & Difteri Dewasa/Lanjutan):</strong> Diberikan kepada siswa <strong>Kelas 2 SD</strong> dan <strong>Kelas 5 SD</strong> sebagai dosis penguat (booster).
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>Bahaya Penyakit Difteri & Tetanus</span>
            </h4>
            <p>
              Kekebalan tubuh yang diperoleh dari imunisasi bayi (DPT-HB-Hib) akan menurun setelah anak menginjak usia sekolah dasar. Imunisasi BIAS sangat krusial untuk mencegah:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block text-xs">Difteri</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Penyakit infeksi bakteri mematikan yang menyumbat saluran pernapasan, merusak otot jantung, dan dapat menyebabkan kematian mendadak.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block text-xs">Tetanus</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Infeksi bakteri dari luka kotor atau tertusuk benda berkarat yang mengakibatkan kejang otot hebat di seluruh tubuh dan kegagalan bernapas.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Tips Persiapan */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Hal yang Perlu Disiapkan Orang Tua</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 text-xs">
              <li>Pastikan anak sarapan pagi sebelum berangkat ke sekolah.</li>
              <li>Pastikan anak tidur cukup dan tidak sedang demam tinggi.</li>
              <li>Kenakan pakaian seragam yang memudahkan lengan atas dibuka saat penyuntikan.</li>
              <li>Berikan motivasi dan tenangkan anak bahwa penyuntikan cepat dan aman.</li>
            </ol>
          </div>

          {/* Section 4: Efek Samping */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Reaksi Pasca Imunisasi (Ringan & Normal)</span>
            </div>
            <p className="leading-relaxed">
              Sebagian anak mungkin mengalami rasa pegal atau kemerahan ringan di lengan bekas suntikan, atau demam sumeng ringan. Hal ini adalah tanda sistem kekebalan tubuh sedang aktif membentuk antibodi. Berikan kompres air hangat dan istirahat yang cukup.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};

import { ConsentRecord, GoogleSheetsConfig } from '../types';

const STORAGE_KEY_RECORDS = 'bias_consent_records_v2';
const STORAGE_KEY_SHEETS_CONFIG = 'bias_sheets_config_v1';
const STORAGE_KEY_SCHOOL_INFO = 'bias_school_info_v2';

export interface SchoolInfo {
  namaSekolah: string;
  namaPuskesmas: string;
  alamatSekolah: string;
  tahunAjaran: string;
  jadwalPelaksanaan: string;
}

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  namaSekolah: 'SDN SUMUR WELUT III/440',
  namaPuskesmas: 'Puskesmas Bangkingan (UKS Pembina)',
  alamatSekolah: 'Jl. Raya Sumur Welut No. 440, Lakarsantri, Kota Surabaya',
  tahunAjaran: '2026/2027',
  jadwalPelaksanaan: 'November 2026',
};

export const getStoredRecords = (): ConsentRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored records:', e);
    return [];
  }
};

export const saveConsentRecord = (record: ConsentRecord): ConsentRecord[] => {
  const current = getStoredRecords();
  const updated = [record, ...current.filter((r) => r.id !== record.id)];
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving record to localStorage:', e);
  }
  return updated;
};

export const updateRecordSyncStatus = (
  id: string,
  synced: boolean,
  spreadsheetId?: string
): ConsentRecord[] => {
  const current = getStoredRecords();
  const updated = current.map((r) => {
    if (r.id === id) {
      return {
        ...r,
        syncedToSheets: synced,
        syncTimestamp: synced ? new Date().toISOString() : undefined,
        spreadsheetId: spreadsheetId || r.spreadsheetId,
      };
    }
    return r;
  });
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
  return updated;
};

export const deleteStoredRecord = (id: string): ConsentRecord[] => {
  const current = getStoredRecords();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
  return updated;
};

export const getSheetsConfig = (): GoogleSheetsConfig | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHEETS_CONFIG);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveSheetsConfig = (config: GoogleSheetsConfig | null) => {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_SHEETS_CONFIG);
  } else {
    localStorage.setItem(STORAGE_KEY_SHEETS_CONFIG, JSON.stringify(config));
  }
};

export const getSchoolInfo = (): SchoolInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCHOOL_INFO);
    if (!raw) return DEFAULT_SCHOOL_INFO;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SCHOOL_INFO,
      ...parsed,
      namaSekolah: parsed.namaSekolah && parsed.namaSekolah !== 'SD Pelita Harapan Bangsa'
        ? parsed.namaSekolah
        : 'SDN SUMUR WELUT III/440',
    };
  } catch {
    return DEFAULT_SCHOOL_INFO;
  }
};

export const saveSchoolInfo = (info: SchoolInfo) => {
  localStorage.setItem(STORAGE_KEY_SCHOOL_INFO, JSON.stringify(info));
};

export const generateSampleData = (): ConsentRecord[] => {
  const samples: ConsentRecord[] = [
    {
      id: 'BIAS-2026-001',
      createdAt: '2026-10-28T08:15:00.000Z',
      formattedDate: '28 Okt 2026, 15:15 WIB',
      namaSiswa: 'Aditia Pratama Putra',
      kelas: '1-A',
      jenisVaksin: 'BIAS Dt (Difteri & Tetanus)',
      jenisKelamin: 'Laki-laki',
      namaOrangTua: 'Bambang Sugiharto',
      hubunganOrangTua: 'Ayah',
      keputusan: 'SETUJU',
      catatanKesehatan: 'Anak dalam kondisi sehat dan siap imunisasi',
      tandaTanganUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 50 Q 50 10 90 45 T 160 30" stroke="%230f172a" stroke-width="2.5" fill="none"/></svg>',
      syncedToSheets: true,
      syncTimestamp: '2026-10-28T08:15:20.000Z',
    },
    {
      id: 'BIAS-2026-002',
      createdAt: '2026-10-28T09:20:00.000Z',
      formattedDate: '28 Okt 2026, 16:20 WIB',
      namaSiswa: 'Siti Nur Azizah',
      kelas: '1-B',
      jenisVaksin: 'BIAS Dt (Difteri & Tetanus)',
      jenisKelamin: 'Perempuan',
      namaOrangTua: 'Nurul Hidayati',
      hubunganOrangTua: 'Ibu',
      keputusan: 'SETUJU',
      catatanKesehatan: '',
      tandaTanganUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 40 Q 60 70 100 20 T 170 45" stroke="%230f172a" stroke-width="2.5" fill="none"/></svg>',
      syncedToSheets: true,
      syncTimestamp: '2026-10-28T09:20:15.000Z',
    },
    {
      id: 'BIAS-2026-003',
      createdAt: '2026-10-29T02:10:00.000Z',
      formattedDate: '29 Okt 2026, 09:10 WIB',
      namaSiswa: 'Muhammad Farhan',
      kelas: '2-A',
      jenisVaksin: 'BIAS Td (Tetanus & Difteri Lanjutan)',
      jenisKelamin: 'Laki-laki',
      namaOrangTua: 'Agus Gunawan',
      hubunganOrangTua: 'Ayah',
      keputusan: 'MENOLAK',
      alasanMenolak: 'Sudah mendapatkan imunisasi Dt / Td secara mandiri di Dokter/RS/Klinik',
      detailAlasan: 'Farhan sudah diimunisasi Td di RS bulan lalu saat kontrol tahunan.',
      catatanKesehatan: 'Sudah memiliki sertifikat imunisasi dari dokter anak',
      tandaTanganUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 30 Q 70 5 120 50 T 180 35" stroke="%230f172a" stroke-width="2.5" fill="none"/></svg>',
      syncedToSheets: true,
      syncTimestamp: '2026-10-29T02:10:45.000Z',
    },
    {
      id: 'BIAS-2026-004',
      createdAt: '2026-10-29T04:45:00.000Z',
      formattedDate: '29 Okt 2026, 11:45 WIB',
      namaSiswa: 'Clarissa Aurelia',
      kelas: '2-B',
      jenisVaksin: 'BIAS Td (Tetanus & Difteri Lanjutan)',
      jenisKelamin: 'Perempuan',
      namaOrangTua: 'Irene Kusuma',
      hubunganOrangTua: 'Ibu',
      keputusan: 'SETUJU',
      catatanKesehatan: 'Anak agak sensitif plester, tapi kondisi badan sehat',
      tandaTanganUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M25 55 Q 65 15 110 40 T 175 25" stroke="%230f172a" stroke-width="2.5" fill="none"/></svg>',
      syncedToSheets: false,
    },
    {
      id: 'BIAS-2026-005',
      createdAt: '2026-10-30T01:30:00.000Z',
      formattedDate: '30 Okt 2026, 08:30 WIB',
      namaSiswa: 'Rian Saputra',
      kelas: '5',
      jenisVaksin: 'BIAS Td (Tetanus & Difteri Lanjutan)',
      jenisKelamin: 'Laki-laki',
      namaOrangTua: 'Dedy Saputra',
      hubunganOrangTua: 'Ayah',
      keputusan: 'SETUJU',
      catatanKesehatan: '',
      tandaTanganUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M15 45 Q 55 20 100 50 T 165 40" stroke="%230f172a" stroke-width="2.5" fill="none"/></svg>',
      syncedToSheets: false,
    },
  ];
  return samples;
};

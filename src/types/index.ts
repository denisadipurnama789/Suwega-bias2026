export type KelasType = '1-A' | '1-B' | '2-A' | '2-B' | '5';
export type KeputusanType = 'SETUJU' | 'MENOLAK';

export interface ConsentRecord {
  id: string;
  createdAt: string; // ISO string
  formattedDate: string; // "31 Okt 2026, 08:30 WIB"
  namaSiswa: string;
  kelas: KelasType;
  jenisVaksin: 'BIAS Dt (Difteri & Tetanus)' | 'BIAS Td (Tetanus & Difteri Lanjutan)';
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  namaOrangTua: string;
  hubunganOrangTua: 'Ayah' | 'Ibu' | 'Wali';
  keputusan: KeputusanType;
  alasanMenolak?: string;
  detailAlasan?: string;
  catatanKesehatan?: string; // Opsional: orang tua mengetik sendiri kondisi anak
  tandaTanganUrl: string; // Base64 PNG
  syncedToSheets: boolean;
  syncTimestamp?: string;
  spreadsheetId?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  autoSync: boolean;
  webhookUrl?: string; // Optional Google Apps Script webhook for universal direct sync
  lastSyncedAt?: string;
}

import { ConsentRecord, GoogleSheetsConfig } from '../types';

const STORAGE_KEY_RECORDS = 'bias_consent_records_v3';
const STORAGE_KEY_SHEETS_CONFIG = 'bias_sheets_config_v1';
const STORAGE_KEY_SCHOOL_INFO = 'bias_school_info_v2';

// Clean up old sample records if existing in browser
try {
  localStorage.removeItem('bias_consent_records_v1');
  localStorage.removeItem('bias_consent_records_v2');
} catch {
  // ignore
}

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

export const clearAllRecords = (): ConsentRecord[] => {
  localStorage.removeItem(STORAGE_KEY_RECORDS);
  return [];
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

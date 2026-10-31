import { ConsentRecord } from '../types';

export interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export const SHEETS_HEADER_ROW = [
  'Waktu Pengisian (WIB)',
  'ID Respon',
  'Nama Lengkap Siswa',
  'Kelas',
  'Jenis Vaksin',
  'Jenis Kelamin',
  'Nama Orang Tua/Wali',
  'Hubungan Keluarga',
  'Status Persetujuan',
  'Alasan Jika Menolak',
  'Detail Penjelasan Alasan',
  'Catatan Kondisi Anak (Opsional)',
  'Verifikasi Tanda Tangan Digital',
];

export const formatRecordToSheetRow = (record: ConsentRecord): (string | number)[] => {
  return [
    record.formattedDate || new Date(record.createdAt).toLocaleString('id-ID'),
    record.id,
    record.namaSiswa,
    record.kelas,
    record.jenisVaksin,
    record.jenisKelamin,
    record.namaOrangTua,
    record.hubunganOrangTua,
    record.keputusan,
    record.keputusan === 'MENOLAK' ? (record.alasanMenolak || '-') : '-',
    record.keputusan === 'MENOLAK' ? (record.detailAlasan || '-') : '-',
    record.catatanKesehatan?.trim() || 'Tidak ada catatan khusus (sehat)',
    record.tandaTanganUrl ? 'Terverifikasi (Tanda Tangan Digital)' : 'Belum Ada',
  ];
};

/**
 * Creates a brand new Google Spreadsheet configured specifically for BIAS Dt/Td
 */
export const createBiasSpreadsheet = async (
  accessToken: string,
  schoolName: string = 'SDN SUMUR WELUT III/440'
): Promise<SheetCreationResult> => {
  const currentYear = new Date().getFullYear();
  const title = `Rekap Persetujuan Imunisasi BIAS Dt & Td - ${schoolName} (${currentYear})`;

  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Rekap BIAS',
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 200,
            columnCount: SHEETS_HEADER_ROW.length + 2,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: SHEETS_HEADER_ROW.map((header) => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.05, green: 0.53, blue: 0.44 }, // Teal #0d8870
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                      fontSize: 10,
                    },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    padding: { top: 6, bottom: 6, left: 8, right: 8 },
                  },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal membuat spreadsheet: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title,
  };
};

/**
 * Appends a single consent response to the configured Google Spreadsheet
 */
export const appendRowToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  record: ConsentRecord,
  sheetName: string = 'Rekap BIAS'
): Promise<boolean> => {
  const rowValues = formatRecordToSheetRow(record);

  // We append to the sheet
  const range = `${encodeURIComponent(sheetName)}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!response.ok) {
    // If the sheet name was not found, fallback to appending without sheet name prefix (appends to first sheet)
    if (response.status === 400 || response.status === 404) {
      const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValues],
        }),
      });

      if (!fallbackRes.ok) {
        const err = await fallbackRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gagal menambah data ke Google Sheets`);
      }
      return true;
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal menambah data ke Google Sheets`);
  }

  return true;
};

/**
 * Batch append multiple records to the spreadsheet
 */
export const batchAppendRecordsToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  records: ConsentRecord[],
  sheetName: string = 'Rekap BIAS'
): Promise<number> => {
  if (records.length === 0) return 0;

  const rows = records.map(formatRecordToSheetRow);
  const range = `${encodeURIComponent(sheetName)}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    // Try fallback to Sheet1 or first sheet
    const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const fallbackRes = await fetch(fallbackUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    });

    if (!fallbackRes.ok) {
      const err = await fallbackRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal batch sinkronisasi ke Google Sheets`);
    }
  }

  return records.length;
};

/**
 * Validate that a spreadsheet exists and is accessible
 */
export const checkSpreadsheetAccess = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Spreadsheet tidak ditemukan atau Anda tidak memiliki izin akses.');
  }

  const data = await response.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);
  return {
    title: data.properties?.title || 'Spreadsheet Tanpa Judul',
    sheets,
  };
};

/**
 * Direct HTTP Webhook to Google Sheets (Google Apps Script)
 * Useful for public parents filling forms on their own smartphones without requiring a Google login.
 */
export const postToGoogleSheetsWebhook = async (
  webhookUrl: string,
  record: ConsentRecord
): Promise<boolean> => {
  try {
    const payload = JSON.stringify({
      ...record,
      rowValues: formatRecordToSheetRow(record),
    });

    // Use mode: 'no-cors' so Google Apps Script redirects don't fail CORS in browser
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    return true;
  } catch (err) {
    console.warn('Webhook post failed:', err);
    return false;
  }
};

export const SAMPLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Rekap BIAS") || ss.getSheets()[0];
    
    // Pastikan header ada di baris pertama
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Waktu Pengisian (WIB)', 'ID Respon', 'Nama Lengkap Siswa', 'Kelas',
        'Jenis Vaksin', 'Jenis Kelamin', 'Nama Orang Tua/Wali', 'Hubungan Keluarga',
        'Status Persetujuan', 'Alasan Jika Menolak', 'Detail Penjelasan Alasan',
        'Catatan Kondisi Anak', 'Verifikasi Tanda Tangan Digital'
      ]);
      sheet.getRange(1, 1, 1, 13).setBackground("#0d8870").setFontColor("#ffffff").setFontWeight("bold");
    }
    
    var data = JSON.parse(e.postData.contents);
    var row = data.rowValues || [
      data.formattedDate, data.id, data.namaSiswa, data.kelas, data.jenisVaksin,
      data.jenisKelamin, data.namaOrangTua, data.hubunganOrangTua, data.keputusan,
      data.alasanMenolak || '-', data.detailAlasan || '-', data.catatanKesehatan || '-',
      data.tandaTanganUrl ? 'Terverifikasi' : '-'
    ];
    
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;


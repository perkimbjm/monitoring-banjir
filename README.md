# Konsep Solusi: Aplikasi Ekstraksi Metadata Foto dengan Google Apps Script

## 1. Gambaran Umum Sistem

Sistem ini dirancang untuk mengotomatisasi pengumpulan metadata foto dari file yang diupload ke Google Drive dan mencatatnya secara terstruktur di Google Sheets. Metadata yang dikumpulkan mencakup informasi teknis foto seperti tanggal pengambilan, lokasi GPS, spesifikasi kamera, dan parameter fotografi lainnya.

## 2. Arsitektur Sistem

### Komponen Utama

**Google Sheets** berfungsi sebagai antarmuka utama dan penyimpanan data. Sheet ini berisi kolom-kolom untuk menyimpan informasi foto dan metadata yang telah diekstrak. Pengguna dapat menambahkan foto baru melalui link Drive atau menggunakan form untuk upload.

**Google Drive** menyimpan file foto asli. Ketika foto diupload ke folder tertentu di Drive, sistem dapat mengaksesnya dan membaca metadata EXIF-nya.

**Google Apps Script** adalah engine pemrosesan yang menjalankan ekstraksi metadata. Script ini menggunakan Google Drive API untuk membaca informasi teknis dari foto dan menulis hasilnya ke Google Sheets.

### Alur Kerja

1. **Input Foto**: Pengguna mengupload foto
2. **Kirim ke Google Drive** : Jika Pengguna menekan button "Kirim ke Google Drive" maka aplikasi akan mengupload foto ke Google Drive
2. **Deteksi File**: Google Drive kemudian mengirimkan data url ke Google Apps Script
3. **Ekstraksi Metadata**: Script menggunakan Drive API untuk membaca metadata EXIF dari foto
4. **Pencatatan Data**: Script menulis metadata ke Google Sheets dalam format terstruktur
5. **Verifikasi**: Pengguna dapat melihat dan memverifikasi data di Sheets
6. **JSON**: Dari google sheet kemudian menjadi JSON
7. **API**: JSON kemudian menjadi API
8. **Aplikasi**: API kemudian dimanfaatkan oleh aplikasi ini

## 3. Struktur Data Google Sheets

Kolom-kolom yang direkomendasikan untuk dicatat:

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| No | Integer | Nomor urut otomatis |
| Nama File | String | Nama file foto |
| Link Drive | URL | Link langsung ke file di Google Drive |
| Tanggal Pengambilan | DateTime | Waktu foto diambil (EXIF DateTime) |
| Latitude | Decimal | Koordinat lintang GPS |
| Longitude | Decimal | Koordinat bujur GPS |
| Altitude (m) | Decimal | Ketinggian lokasi dalam meter |
| Camera Maker | String | Merek/pembuat kamera (contoh: Canon, Nikon) |
| Camera Model | String | Model kamera (contoh: Canon EOS 5D Mark IV) |
| Timestamp Ekstraksi | DateTime | Waktu metadata diekstrak |

## 4. Fitur-Fitur Utama

### Fitur 1: Ekstraksi Otomatis
Script dapat dikonfigurasi untuk berjalan secara otomatis setiap kali ada file baru di folder tertentu. Pengguna dapat mengatur trigger berbasis waktu (time-driven trigger) atau event-driven trigger.

### Fitur 2: Batch Processing
Sistem dapat memproses multiple foto sekaligus. Pengguna dapat memilih folder di Drive dan script akan mengekstrak metadata dari semua foto dalam folder tersebut.

### Fitur 3: Validasi Data
Script dapat memvalidasi data yang diekstrak dan memberikan notifikasi jika ada data yang tidak lengkap atau tidak valid.

### Fitur 4: Error Handling
Jika foto tidak memiliki metadata tertentu (misalnya tidak ada GPS data), sistem akan mencatat "N/A" atau null value daripada error.

### Fitur 5: Link Sharing
Sistem otomatis menghasilkan link shareable ke setiap foto di Google Drive untuk memudahkan akses.

## 5. Implementasi Teknis

### Metode Akses Metadata

**Menggunakan Google Drive API v2 via UrlFetchApp:**
- Mengirim HTTP request ke endpoint Google Drive API
- Parsing JSON response yang berisi metadata
- Ekstrak field-field yang diperlukan

**Keuntungan:**
- Akses ke semua field metadata yang tersedia
- Fleksibel dan powerful
- Dapat dikustomisasi sesuai kebutuhan

**Limitasi:**
- Memerlukan authorization token
- Rate limiting dari Google API
- Perlu handling error yang baik

### Struktur Kode

Kode akan terdiri dari beberapa fungsi utama:

1. **`getFileMetadata(fileID)`** - Mengambil metadata dari satu file
2. **`extractMetadataFields(metadata)`** - Mengekstrak field-field yang diperlukan
3. **`writeToSheet(data)`** - Menulis data ke Google Sheets
4. **`processFolder(folderId)`** - Memproses semua file dalam folder
5. **`onOpen()`** - Membuat custom menu di Sheets
6. **`createTrigger()`** - Membuat automated trigger

## 6. Keamanan dan Permissions

- Script memerlukan permission untuk membaca file di Google Drive
- Script memerlukan permission untuk menulis ke Google Sheets
- User harus mengauthorize script saat pertama kali dijalankan
- Semua data tetap dalam akun Google user, tidak ada data yang dikirim ke pihak ketiga

## 7. Limitasi dan Pertimbangan

**Limitasi Metadata:**
- Tidak semua foto memiliki metadata lengkap
- Foto yang di-crop atau diedit mungkin kehilangan metadata
- GPS data hanya tersedia jika diaktifkan saat pengambilan foto

**Limitasi Teknis:**
- Google Drive API memiliki rate limit (queries per minute)
- Untuk processing besar, mungkin perlu membagi menjadi batch
- Metadata hanya dapat dibaca, tidak dapat dimodifikasi melalui API ini

**Kompatibilitas File:**
- Sistem ini optimal untuk format JPEG dan PNG
- Format lain mungkin memiliki metadata yang berbeda

## 8. Panduan Implementasi Step-by-Step

Berikut adalah langkah-langkah detail untuk mengimplementasikan sistem ini dari nol, mulai dari setup Google Sheet hingga integrasi dengan aplikasi React.

### 8.1 Persiapan Google Sheet & Drive

1.  **Buat Folder Google Drive**:
    *   Buat folder baru di Google Drive, misal: `FloodData_Photos`.
    *   Catat **Folder ID** (bagian terakhir dari URL folder tersebut).

2.  **Buat Google Sheet**:
    *   Buat spreadsheet baru, misal: `FloodData_Database`.
    *   Ganti nama tab (sheet) pertama menjadi `Metadata`.
    *   Buat header di baris 1 (A1:R1) dengan kolom berikut:
        `ID`, `Nama File`, `Link Drive`, `Tanggal Pengambilan`, `Latitude`, `Longitude`, `Altitude`, `Camera Maker`, `Camera Model`, `Timestamp`

### 8.2 Implementasi Google Apps Script (Backend API)

Langkah ini akan membuat script untuk (1) mengekstrak metadata foto dari Drive dan (2) menyediakan API JSON agar data bisa dibaca oleh aplikasi React.

1.  Buka Google Sheet yang baru dibuat.
2.  Klik menu **Extensions** > **Apps Script**.
3.  Hapus kode default dan paste kode berikut:

```javascript
/* 
  CONFIGURATION 
  Ganti FOLDER_ID dengan ID folder Google Drive Anda.
*/
const FOLDER_ID = 'MASUKKAN_ID_FOLDER_DRIVE_DISINI';
const SHEET_NAME = 'Metadata';

function doGet(e) {
  return handleApiRequest(e);
}

function doPost(e) {
  try {
    // 1. Parse Data dari Request
    const data = JSON.parse(e.postData.contents);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // 2. Decode Base64 dan Buat File
    const blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, data.fileName);
    const file = folder.createFile(blob);
    
    // 3. Set Permissions (Optional: Agar bisa diakses publik via link)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 4. Extract data awal (opsional) atau biarkan trigger yang mengurus
    // Kita return success response
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handler untuk API Request (GET)
function handleApiRequest(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Konversi data sheet ke Array of Objects (JSON friendly)
  const headers = data[0];
  const rows = data.slice(1);
  
  const result = rows.map((row) => {
    let obj = {};
    headers.forEach((header, index) => {
      // Ubah header jadi camelCase untuk key (opsional, biar rapi)
      const key = header.toLowerCase().replace(/ /g, '_'); 
      obj[key] = row[index];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi Utama: Scan Folder dan Update Sheet
function scanFolderMetaData() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  // Ambil list file yang sudah ada agar tidak duplikat (cek kolom Nama File / ID)
  const presentFiles = getExistingFileNames(sheet);
  
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    
    // Skip jika file sudah ada di sheet
    if (presentFiles.includes(fileName)) continue;

    const mimeType = file.getMimeType();
    
    // Proses hanya gambar
    if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
      try {
        const metadata = extractExif(file);
        // Susun baris baru sesuai urutan header
        // [ID, Nama, Link, Tanggal, Lat, Long, ...]
        sheet.appendRow([
          file.getId(),
          fileName,
          file.getUrl(),
          metadata.date || new Date(),
          metadata.lat,
          metadata.lng,
          metadata.altitude,
          metadata.make,
          metadata.model,
          metadata.lens,
          metadata.focal,
          metadata.aperture,
          metadata.exposure,
          metadata.iso,
          metadata.flash,
          metadata.width,
          metadata.height,
          new Date()
        ]);
        Logger.log('Processed: ' + fileName);
      } catch (err) {
        Logger.log('Error processing ' + fileName + ': ' + err);
      }
    }
  }
}

function getExistingFileNames(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  // Asumsi kolom 'Nama File' ada di indeks ke-1 (kolom B)
  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); 
  return data.flat();
}

// Fungsi Dummy untuk Ekstraksi EXIF 
// Catatan: DriveApp standar tidak bisa baca EXIF detail tanpa Advanced Drive API.
// Untuk solusi simple tanpa API Advanced, kita hanya mengambil metadata basic file.
// Jika ingin EXIF lengkap, Anda perlu mengaktifkan "Drive API" di Services 
// dan menggunakan Drive.Files.get(fileId, {fields: 'imageMediaMetadata'})
function extractExif(file) {
  // Gunakan Advanced services (Drive API v2/v3) untuk hasil akurat
  let metadata = {
    date: file.getDateCreated(),
    lat: '', lng: '', altitude: '',
    make: '', model: '', lens: '', focal: '', aperture: '',
    exposure: '', iso: '', flash: '', width: '', height: ''
  };

  // Contoh penggunaan Advanced Drive API (jika diaktifkan di Services +)
  try {
    // PENTING: Untuk Drive API v3, parameter 'fields' WAJIB disertakan untuk mendapatkan metadata gambar
    const driveFile = Drive.Files.get(file.getId(), {fields: 'imageMediaMetadata'});
    
    if (driveFile && driveFile.imageMediaMetadata) {
      const exif = driveFile.imageMediaMetadata;
      if (exif.location) {
        // Paksa format teks dengan titik (.) agar konsisten (misal: -7.12345)
        // String(val).replace(',', '.') menangani kemungkinan output lokal atau number
        metadata.lat = "'" + String(exif.location.latitude).replace(',', '.');
        metadata.lng = "'" + String(exif.location.longitude).replace(',', '.');
        metadata.altitude = exif.location.altitude;
      }
      metadata.make = exif.cameraMake;
      metadata.model = exif.cameraModel;
      metadata.width = exif.width;
      metadata.height = exif.height;
      metadata.aperture = exif.aperture;
      metadata.iso = exif.isoSpeed;
      metadata.date = exif.date || file.getDateCreated();
    }
  } catch (e) {
    // Fallback jika Drive API service belum aktif
    Logger.log("Advanced Drive API not enabled or error: " + e);
  }
  
  return metadata;
}
```

4.  **Aktifkan Service Drive API**:
    *   Di editor Apps Script, klik icon `+` di sebelah **Services**.
    *   Pilih **Drive API**, klik Add.
5.  **Deploy sebagai Web App** (Agar bisa dibaca React App):
    *   Klik **Deploy** > **New deployment**.
    *   Select type: **Web app**.
    *   Description: "API Metadata Floods".
    *   Execute as: **Me**.
    *   Who has access: **Anyone** (Ini penting agar aplikasi React bisa fetch data tanpa login Google ribet. Pastikan data tidak sensitif).
    *   Klik **Deploy**, dan COPY **Web App URL** (misal: `https://script.google.com/macros/s/.../exec`).

### 8.3 Implementasi di Aplikasi Frontend (React)

Sekarang kita buat fungsi untuk mengambil data JSON yang sudah diekspos oleh script di atas.

1.  Buat file helper baru: `api.ts` (sejajar dengan App.tsx).

```typescript
// api.ts

// Ganti dengan URL Web App dari langkah Deploy Apps Script
const API_URL = 'https://script.google.com/macros/s/XXXXX_PASTE_URL_DISINI_XXXXX/exec';

export interface PhotoMetadata {
  id: string;
  nama_file: string;
  link_drive: string;
  tanggal_pengambilan: string;
  latitude: number | string;
  longitude: number | string;
  camera_model: string;
  // ... sesuaikan dengan field lainnya
}

export const fetchSheetData = async (): Promise<PhotoMetadata[]> => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data from Google Sheet:", error);
    return [];
  }
};
```

2.  Contoh Penggunaan di Komponen (misal di `components/MapViewer.tsx` atau komponen baru):

```tsx
import React, { useEffect, useState } from 'react';
import { fetchSheetData, PhotoMetadata } from '../api'; // Sesuaikan path import

export default function SheetDataViewer() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchSheetData();
      setPhotos(data);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return <div>Loading data from Google Sheet...</div>;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Data Foto Dashboard</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2">Nama File</th>
              <th className="px-4 py-2">Model Kamera</th>
              <th className="px-4 py-2">Lokasi</th>
              <th className="px-4 py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {photos.map((photo) => (
              <tr key={photo.id} className="border-b">
                <td className="px-4 py-2">{photo.nama_file}</td>
                <td className="px-4 py-2">{photo.camera_model || '-'}</td>
                <td className="px-4 py-2">
                  {photo.latitude}, {photo.longitude}
                </td>
                <td className="px-4 py-2">
                  <a 
                    href={photo.link_drive} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 8.4 Menjalankan Automasi
1.  Di Apps Script editor, klik icon **Triggers** (gambar jam di kiri).
2.  Klik **+ Add Trigger**.
3.  Pilih function: `scanFolderMetaData`.
4.  Select event source: **Time-driven**.
5.  Select type of time based trigger: **Minutes timer** / **Every 5 minutes** (atau sesuai kebutuhan).
6.  Save. Script sekarang akan berjalan otomatis setiap 5 menit untuk mengecek file baru dan update Sheet.

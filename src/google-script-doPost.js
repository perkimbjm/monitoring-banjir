const FOLDER_ID = '1jYCTMC-CKxhV1uLvF_AEJR4EG72NXUDH';
const SHEET_NAME = 'Metadata';

// --- BAGIAN UTAMA: MENERIMA UPLOAD DARI WEB (DOPOST) ---

function doPost(e) {
  // Lock untuk mencegah masalah penulisan bersamaan
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    
    // Cek apakah ini request delete
    if (data.action === 'delete') {
      return handleDelete(data.id);
    }
    
    // 1. Simpan File ke Google Drive
    // Menggunakan folder ID yang sudah ditentukan
    var folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Decode base64 gambar
    var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, data.fileName);
    var file = folder.createFile(blob);
    
    // Set permission agar 'Anyone with Link' bisa melihat (penting untuk ditampilkan di app)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = file.getUrl(); // Link untuk melihat file
    
    // 2. Simpan Data ke Google Sheet
    var sheet = getOrCreateSheet(SHEET_NAME);
    
    // Siapkan baris data sesuai header
    // Pastikan urutan ini SAMA dengan yang ada di fungsi scanFolderMetaData
    var row = [
      data.id || file.getId(),                  // ID (Preferensi dari Client/UUID, fallback ke File ID)
      data.fileName,                            // Nama File
      fileUrl,                                  // Link Drive
      data.tanggal_pengambilan || new Date(),   // Tanggal Pengambilan
      data.latitude || "",                      // Latitude (dari Payload Client)
      data.longitude || "",                     // Longitude (dari Payload Client)
      data.altitude || "",                      // Altitude
      data.camera_maker || "",                  // Camera Maker
      data.camera_model || "",                  // Camera Model
      data.regu || "",                          // Regu
      new Date()                                // Waktu Upload (Server Time)
    ];
    
    sheet.appendRow(row);

    // Return Success JSON
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data saved successfully',
      fileId: file.getId(),
      fileUrl: fileUrl,
      row: row
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return Error JSON
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

// Handler untuk Delete Request
function handleDelete(id) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    var data = sheet.getDataRange().getValues();
    var rowToDelete = -1;
    
    // Cari baris dengan ID yang sesuai (kolom pertama adalah ID)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        rowToDelete = i + 1; // +1 karena sheet index mulai dari 1
        break;
      }
    }
    
    if (rowToDelete === -1) {
      throw new Error('Data not found');
    }
    
    // Hapus baris dari sheet
    sheet.deleteRow(rowToDelete);
    
    // Opsional: Hapus file dari Drive juga
    // Uncomment jika ingin menghapus file dari Drive
    // try {
    //   var file = DriveApp.getFileById(id);
    //   file.setTrashed(true);
    // } catch (e) {
    //   Logger.log('Could not delete file from Drive: ' + e);
    // }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data deleted successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- BAGIAN KEDUA: MEMBACA DATA (DOGET) ---
// Ini Kode Anda sebelumnya

function doGet(e) {
  return handleApiRequest(e);
}

// Handler untuk API Request (GET)
function handleApiRequest(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  // Jika sheet belum ada, return array kosong
  if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([]))
       .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  
  // Jika data kosong atau hanya header
  if (data.length <= 1) {
     return ContentService.createTextOutput(JSON.stringify([]))
       .setMimeType(ContentService.MimeType.JSON);
  }

  // Konversi data sheet ke Array of Objects (JSON friendly)
  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      // Ubah header jadi camelCase untuk key (opsional, biar rapi)
      // Contoh: "Nama File" -> "nama_file"
      var key = header.toString().toLowerCase().replace(/ /g, '_'); 
      obj[key] = row[index];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// --- BAGIAN KETIGA: UTILITIES MANUAL (SCAN FOLDER) ---
// Ini fungsi manual Anda untuk sync file yang ada di folder tapi belum di sheet

function scanFolderMetaData() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFiles();
  var sheet = getOrCreateSheet(SHEET_NAME);
  
  // Ambil list file yang sudah ada agar tidak duplikat (cek kolom Nama File / ID)
  var presentFiles = getExistingFileNames(sheet);
  
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    
    // Skip jika file sudah ada di sheet
    if (presentFiles.includes(fileName)) continue;

    var mimeType = file.getMimeType();
    
    // Proses hanya gambar
    if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') {
      try {
        var metadata = extractExif(file);
        // Susun baris baru sesuai urutan header
        // [ID, Nama, Link, Tanggal, Lat, Long, Alt, Maker, Model, Regu, Waktu Upload]
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
          "",  // Regu (kosong untuk scan manual, bisa diisi manual di sheet)
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
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  // Asumsi kolom 'Nama File' ada di indeks ke-1 (kolom B - karena array mulai 0)
  // [ID, Nama File, ...] -> Index 1
  var data = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); 
  return data.flat();
}

function extractExif(file) {
  // Gunakan Advanced services (Drive API v2/v3) untuk hasil akurat
  var metadata = {
    date: file.getDateCreated(),
    lat: '', lng: '', altitude: '',
    make: '', model: '',
  };

  // Contoh penggunaan Advanced Drive API (jika diaktifkan di Services +)
  try {
    var driveFile = Drive.Files.get(file.getId(), {fields: 'imageMediaMetadata'});
    if (driveFile && driveFile.imageMediaMetadata) {
      var exif = driveFile.imageMediaMetadata;
      if (exif.location) {
        metadata.lat = "'" + String(exif.location.latitude).replace(',', '.');
        metadata.lng = "'" + String(exif.location.longitude).replace(',', '.');
        metadata.altitude = exif.location.altitude;
      }
      metadata.make = exif.cameraMake;
      metadata.model = exif.cameraModel;
      metadata.date = exif.date || file.getDateCreated();
    }
  } catch (e) {
    // Fallback jika Drive API service belum aktif
    Logger.log("Advanced Drive API not enabled or error: " + e);
  }
  
  return metadata;
}

// Helper untuk memastikan Sheet ada dan punya Header
function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Buat Header Default
    sheet.appendRow([
        "ID", 
        "Nama File", 
        "Link Drive", 
        "Tanggal Pengambilan", 
        "Latitude", 
        "Longitude", 
        "Altitude", 
        "Camera Maker", 
        "Camera Model", 
        "Regu",
        "Waktu Upload"
    ]);
  }
  return sheet;
}

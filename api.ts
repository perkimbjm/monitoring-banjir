
// Ganti dengan URL Web App dari langkah Deploy Apps Script
// Contoh: 'https://script.google.com/macros/s/AKfycby.../exec'
export const API_URL = 'https://script.google.com/macros/s/AKfycbwXf765Dm8vSlwfMvEC1OR_tUExynqAuFQtooQyWNMtLIZhOfgLuAkuMSIaFoQNU-Mb/exec';

export interface PhotoMetadata {
  id: string;
  nama_file: string;
  link_drive: string;
  tanggal_pengambilan: string;
  latitude: number | string;
  longitude: number | string;
  altitude: number | string;
  camera_maker: string;
  camera_model: string;
  timestamp_ekstraksi: string;
  [key: string]: any; 
}

export const fetchSheetData = async (): Promise<PhotoMetadata[]> => {
  // Fix: Check if it IS the placeholder, not if it is the real URL. 
  // Wait, previous code was checking if it WAS the specific URL. 
  // Let's assume the user has replaced it correctly.
  if (API_URL.includes('PASTE_YOUR_')) {
    console.warn("API_URL belum diset di api.ts");
    return [];
  }

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

export const uploadPhotoToDrive = async (file: File): Promise<any> => {
  if (API_URL.includes('PASTE_YOUR_')) {
     throw new Error("API_URL not configured");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        
        // Google Apps Script usually requires no-cors for simple inserts if not handling OPTIONS correctly,
        // but for returning data we need properly handled POST.
        // NOTE: Google Apps Script Web App POST requests often face CORS issues in browser.
        // A common workaround is using 'no-cors' but then we can't read response.
        // Alternatively, use proper CORS headers in GAS (ContentService).
        // Standard fetch with body often follows redirects in GAS automatically.
        
        const payload = {
          base64: base64String,
          mimeType: file.type,
          fileName: file.name
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          // mode: 'no-cors' // Use this if you don't care about response and hit CORS errors
        });

        if (!response.ok) {
           // If we get an opaque response via no-cors, we won't end up here necessarily,
           // but for standard cors enabled:
           throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status === 'error') {
          throw new Error(result.message);
        }
        
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

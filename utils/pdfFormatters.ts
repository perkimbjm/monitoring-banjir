// PDF Data Formatting Utilities

/**
 * Format timestamp to Indonesian date format: DD/MM/YYYY HH:MM
 */
export const formatDate = (timestamp: number | string | undefined): string => {
  if (!timestamp) return 'N/A';
  
  try {
    let date: Date;
    
    if (typeof timestamp === 'string') {
      // Handle EXIF format: "YYYY:MM:DD HH:MM:SS"
      const exifDate = timestamp.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      date = new Date(exifDate);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Format GPS coordinates for display
 */
export const formatCoordinates = (lat?: number, lng?: number): string => {
  if (lat === undefined || lng === undefined) return 'Lokasi: Tidak Tersedia';
  
  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  
  return `${latStr}, ${lngStr}`;
};

/**
 * Format camera information (make and model)
 */
export const formatCameraInfo = (make?: string, model?: string): string => {
  if (!make && !model) return 'N/A';
  if (!make) return model || 'N/A';
  if (!model) return make;
  
  return `${make} ${model}`;
};

/**
 * Truncate text to maximum length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Format regu name for display
 */
export const formatReguName = (regu?: string): string => {
  if (!regu || regu === 'all') return 'N/A';
  return regu;
};

/**
 * Generate PDF filename with proper format and filter information
 * Format: Laporan_Banjir_BPBD_YYYY-MM-DD[_FilterInfo].pdf
 */
export const generateFilename = (filterInfo?: {
  captureDateStart?: string;
  captureDateEnd?: string;
  uploadDateStart?: string;
  uploadDateEnd?: string;
  regu?: string;
}): string => {
  const date = new Date().toISOString().split('T')[0];
  let filename = `Laporan_Banjir_BPBD_${date}`;
  
  // Add regu filter if specified
  if (filterInfo?.regu && filterInfo.regu !== 'all') {
    // Sanitize regu name for filename
    const sanitizedRegu = filterInfo.regu.replace(/[^a-zA-Z0-9]/g, '_');
    filename += `_${sanitizedRegu}`;
  }
  
  // Add filtered indicator if date filters are active
  if (filterInfo?.captureDateStart || filterInfo?.captureDateEnd || 
      filterInfo?.uploadDateStart || filterInfo?.uploadDateEnd) {
    filename += '_Filtered';
  }
  
  // Sanitize filename for cross-platform compatibility
  filename = filename.replace(/[<>:"/\\|?*]/g, '_');
  
  return `${filename}.pdf`;
};

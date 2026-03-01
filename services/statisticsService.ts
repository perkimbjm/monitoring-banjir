// Statistics Calculation Service for PDF Reports

import { FloodReport } from '../types';
import { ReportStatistics } from '../types/pdfTypes';

/**
 * Calculate comprehensive statistics from flood reports
 */
export const calculateStatistics = (reports: FloodReport[]): ReportStatistics => {
  // Total reports
  const totalReports = reports.length;
  
  // Mapped reports (with GPS coordinates)
  const mappedReports = reports.filter(r => r.exif.location).length;
  
  // Uploaded reports (completed status)
  const uploadedReports = reports.filter(r => r.status === 'completed').length;
  
  // Date range calculation
  const timestamps = reports
    .map(r => {
      // Try to get EXIF date first, fallback to timestamp
      if (r.exif.dateTime) {
        const exifDate = r.exif.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const date = new Date(exifDate);
        return isNaN(date.getTime()) ? r.timestamp : date.getTime();
      }
      return r.timestamp;
    })
    .filter(t => t && !isNaN(t));
  
  const earliest = timestamps.length > 0 
    ? new Date(Math.min(...timestamps)).toLocaleDateString('id-ID')
    : 'N/A';
  
  const latest = timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toLocaleDateString('id-ID')
    : 'N/A';
  
  // Regu breakdown
  const reguMap = new Map<string, number>();
  
  reports.forEach(r => {
    const regu = r.regu || 'Tidak Ada Regu';
    reguMap.set(regu, (reguMap.get(regu) || 0) + 1);
  });
  
  const reguBreakdown = Array.from(reguMap.entries())
    .map(([regu, count]) => ({ regu, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
  
  return {
    totalReports,
    mappedReports,
    uploadedReports,
    dateRange: {
      earliest,
      latest
    },
    reguBreakdown
  };
};

/**
 * Validate statistics for consistency
 */
export const validateStatistics = (stats: ReportStatistics, reports: FloodReport[]): boolean => {
  // Total count should match
  if (stats.totalReports !== reports.length) return false;
  
  // Regu breakdown should sum to total
  const reguSum = stats.reguBreakdown.reduce((sum, item) => sum + item.count, 0);
  if (reguSum !== stats.totalReports) return false;
  
  // Mapped count should not exceed total
  if (stats.mappedReports > stats.totalReports) return false;
  
  // Uploaded count should not exceed total
  if (stats.uploadedReports > stats.totalReports) return false;
  
  return true;
};

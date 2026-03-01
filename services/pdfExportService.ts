import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDFExportOptions,
  PDFGenerationResult,
  PDFExportError,
  FilterInfo,
  ReportStatistics,
} from '../types/pdfTypes';
import { FloodReport } from '../types';
import { calculateStatistics } from './statisticsService';
import { captureMapSnapshot, loadAndCompressPhoto } from '../utils/imageUtils';
import { formatDate, formatCoordinates, formatCameraInfo, formatReguName } from '../utils/pdfFormatters';

/**
 * Validates the PDF export request before generation
 * @throws {PDFExportError} if validation fails
 */
export function validateExportRequest(options: PDFExportOptions): void {
  // Validate reports array
  if (!options.reports || !Array.isArray(options.reports)) {
    throw new PDFExportError(
      'Data laporan tidak valid',
      'validation',
      false
    );
  }

  // Validate empty dataset
  if (options.reports.length === 0) {
    throw new PDFExportError(
      'Tidak ada data untuk diekspor. Silakan sesuaikan filter Anda.',
      'validation',
      true
    );
  }

  // Validate filter info
  if (!options.filterInfo) {
    throw new PDFExportError(
      'Informasi filter tidak valid',
      'validation',
      false
    );
  }

  // Validate map element if map is to be included
  if (options.includeMap && !options.mapElement) {
    throw new PDFExportError(
      'Elemen peta tidak ditemukan untuk snapshot',
      'validation',
      true
    );
  }
}

/**
 * PDFExportService - Main service class for generating PDF reports
 * Handles PDF initialization, section generation, and error handling
 */
export class PDFExportService {
  private doc: jsPDF | null = null;

  /**
   * Generates a complete PDF report from flood data
   * @param options - PDF export configuration and data
   * @returns Promise resolving to generation result with success status and filename
   */
  async generateReport(options: PDFExportOptions): Promise<PDFGenerationResult> {
    try {
      // Validate the export request
      validateExportRequest(options);

      // Initialize PDF document
      this.initializePDF();

      // Add header section
      this.addHeader(options.filterInfo);

      // Add statistics section
      this.addStatistics(options.reports, options.filterInfo);

      // Add map snapshot section if requested
      if (options.includeMap && options.mapElement) {
        await this.addMapSnapshot(options.mapElement, options.reports);
      }

      // Add photo grid section if requested
      if (options.includePhotos && options.reports.length > 0) {
        await this.addPhotoGrid(options.reports);
      }

      // Add data table section if requested
      if (options.includeTable && options.reports.length > 0) {
        this.addDataTable(options.reports);
      }

      // Add footers to all pages
      const totalPages = this.doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        this.doc.setPage(i);
        this.addFooter(i, totalPages);
      }

      // Set PDF metadata
      this.setPDFMetadata(options.filterInfo);

      const filename = this.generateFilename(options.filterInfo);

      // Trigger PDF download
      this.downloadPDF(filename);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Initializes the PDF document with A4 size, portrait orientation, and Helvetica font
   * @throws {PDFExportError} if PDF initialization fails
   */
  private initializePDF(): void {
    try {
      // Create jsPDF instance with A4 size and portrait orientation
      this.doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set default font to Helvetica
      this.doc.setFont('helvetica');
    } catch (error) {
      throw new PDFExportError(
        'Gagal menginisialisasi PDF. Silakan coba lagi.',
        'initialization',
        true
      );
    }
  }

  /**
   * Generates filename based on filter information
   * Format: Laporan_Banjir_BPBD_YYYY-MM-DD[_FilterSuffix].pdf
   */
  private generateFilename(filterInfo: FilterInfo): string {
    const date = new Date().toISOString().split('T')[0];
    let filename = `Laporan_Banjir_BPBD_${date}`;

    // Add regu suffix if filtered
    if (filterInfo.regu && filterInfo.regu !== 'all') {
      filename += `_${filterInfo.regu}`;
    }

    // Add filtered indicator if date filters are active
    if (filterInfo.captureDateStart || filterInfo.captureDateEnd ||
        filterInfo.uploadDateStart || filterInfo.uploadDateEnd) {
      filename += '_Filtered';
    }

    return `${filename}.pdf`;
  }

  /**
   * Adds header section to the PDF
   * Includes logo, organization name, report title, generation date/time, and active filters
   * @param filterInfo - Active filter information to display
   */
  private addHeader(filterInfo: FilterInfo): void {
    if (!this.doc) return;

    const pageWidth = this.doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Organization name (bold, large)
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('BPBD Kota Banjarmasin', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Report title
    this.doc.setFontSize(16);
    this.doc.text('Laporan Data Banjir', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Generation date/time
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const generationDate = `Tanggal Pembuatan: ${day}/${month}/${year} ${hours}:${minutes}`;
    this.doc.text(generationDate, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Active filter information
    const filterLines = this.buildFilterInfo(filterInfo);
    if (filterLines.length > 0) {
      yPosition += 2;
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      
      filterLines.forEach(line => {
        this.doc!.text(line, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
      });
    }

    // Add separator line
    yPosition += 3;
    this.doc.setLineWidth(0.5);
    this.doc.line(15, yPosition, pageWidth - 15, yPosition);
  }

  /**
   * Builds filter information text lines for display in header
   * @param filterInfo - Active filter information
   * @returns Array of filter description lines
   */
  private buildFilterInfo(filterInfo: FilterInfo): string[] {
    const lines: string[] = [];

    // Check if any filters are active
    const hasFilters = 
      (filterInfo.regu && filterInfo.regu !== 'all') ||
      filterInfo.captureDateStart ||
      filterInfo.captureDateEnd ||
      filterInfo.uploadDateStart ||
      filterInfo.uploadDateEnd;

    if (!hasFilters) {
      return lines;
    }

    lines.push('Filter Aktif:');

    // Regu filter
    if (filterInfo.regu && filterInfo.regu !== 'all') {
      lines.push(`Regu: ${filterInfo.regu}`);
    }

    // Capture date filter
    if (filterInfo.captureDateStart || filterInfo.captureDateEnd) {
      let dateFilter = 'Tanggal Pengambilan: ';
      if (filterInfo.captureDateStart && filterInfo.captureDateEnd) {
        dateFilter += `${this.formatFilterDate(filterInfo.captureDateStart)} - ${this.formatFilterDate(filterInfo.captureDateEnd)}`;
      } else if (filterInfo.captureDateStart) {
        dateFilter += `Dari ${this.formatFilterDate(filterInfo.captureDateStart)}`;
      } else if (filterInfo.captureDateEnd) {
        dateFilter += `Sampai ${this.formatFilterDate(filterInfo.captureDateEnd)}`;
      }
      lines.push(dateFilter);
    }

    // Upload date filter
    if (filterInfo.uploadDateStart || filterInfo.uploadDateEnd) {
      let dateFilter = 'Tanggal Upload: ';
      if (filterInfo.uploadDateStart && filterInfo.uploadDateEnd) {
        dateFilter += `${this.formatFilterDate(filterInfo.uploadDateStart)} - ${this.formatFilterDate(filterInfo.uploadDateEnd)}`;
      } else if (filterInfo.uploadDateStart) {
        dateFilter += `Dari ${this.formatFilterDate(filterInfo.uploadDateStart)}`;
      } else if (filterInfo.uploadDateEnd) {
        dateFilter += `Sampai ${this.formatFilterDate(filterInfo.uploadDateEnd)}`;
      }
      lines.push(dateFilter);
    }

    return lines;
  }

  /**
   * Adds statistics section to the PDF
   * Displays total reports, mapped reports, uploaded reports, date range, and regu breakdown
   * @param reports - Array of flood reports to calculate statistics from
   * @param filterInfo - Active filter information to indicate filtered data
   */
  private addStatistics(reports: FloodReport[], filterInfo: FilterInfo): void {
    if (!this.doc) return;

    const pageWidth = this.doc.internal.pageSize.getWidth();
    let yPosition = 70; // Start after header

    // Section title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Ringkasan Statistik', 15, yPosition);
    yPosition += 8;

    // Check if filters are active
    const hasFilters = 
      (filterInfo.regu && filterInfo.regu !== 'all') ||
      filterInfo.captureDateStart ||
      filterInfo.captureDateEnd ||
      filterInfo.uploadDateStart ||
      filterInfo.uploadDateEnd;

    // Add filter indication if active
    if (hasFilters) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(200, 0, 0); // Red color for emphasis
      this.doc.text('* Statistik berikut mencerminkan data yang telah difilter', 15, yPosition);
      this.doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 7;
    }

    // Calculate statistics
    const stats = calculateStatistics(reports);

    // Display statistics in card-like layout
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    // Draw statistics boxes
    const boxWidth = (pageWidth - 40) / 3; // 3 boxes with margins
    const boxHeight = 20;
    const boxY = yPosition;
    
    // Box 1: Total Reports
    this.drawStatBox(15, boxY, boxWidth, boxHeight, 'Total Laporan', stats.totalReports.toString());
    
    // Box 2: Mapped Reports
    this.drawStatBox(15 + boxWidth + 5, boxY, boxWidth, boxHeight, 'Laporan Terpetakan', stats.mappedReports.toString());
    
    // Box 3: Uploaded Reports
    this.drawStatBox(15 + (boxWidth + 5) * 2, boxY, boxWidth, boxHeight, 'Laporan Terupload', stats.uploadedReports.toString());
    
    yPosition += boxHeight + 10;

    // Date range section
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Rentang Tanggal:', 15, yPosition);
    yPosition += 6;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Paling Awal: ${stats.dateRange.earliest}`, 15, yPosition);
    yPosition += 5;
    this.doc.text(`Paling Akhir: ${stats.dateRange.latest}`, 15, yPosition);
    yPosition += 10;

    // Regu breakdown section
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Distribusi per Regu:', 15, yPosition);
    yPosition += 8;

    // Draw regu breakdown table
    this.drawReguTable(stats.reguBreakdown, yPosition);
  }

  /**
   * Draws a statistics box with label and value
   * @param x - X position
   * @param y - Y position
   * @param width - Box width
   * @param height - Box height
   * @param label - Label text
   * @param value - Value text
   */
  private drawStatBox(x: number, y: number, width: number, height: number, label: string, value: string): void {
    if (!this.doc) return;

    // Draw box border
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.rect(x, y, width, height);

    // Draw label
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(label, x + width / 2, y + 7, { align: 'center' });

    // Draw value
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(value, x + width / 2, y + 15, { align: 'center' });
  }

  /**
   * Draws the regu breakdown table
   * @param reguBreakdown - Array of regu counts
   * @param startY - Starting Y position
   */
  private drawReguTable(reguBreakdown: Array<{ regu: string; count: number }>, startY: number): void {
    if (!this.doc) return;

    const pageWidth = this.doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - 30;
    const colWidth = tableWidth / 2;
    let yPosition = startY;

    // Table header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(15, yPosition, tableWidth, 8, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Regu', 20, yPosition + 5.5);
    this.doc.text('Jumlah', 15 + colWidth + 5, yPosition + 5.5);
    
    yPosition += 8;

    // Table rows
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);

    reguBreakdown.forEach((item, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        this.doc!.setFillColor(250, 250, 250);
        this.doc!.rect(15, yPosition, tableWidth, 7, 'F');
      }

      // Draw row data
      this.doc!.text(item.regu, 20, yPosition + 5);
      this.doc!.text(item.count.toString(), 15 + colWidth + 5, yPosition + 5);
      
      yPosition += 7;
    });

    // Draw table border
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.rect(15, startY, tableWidth, yPosition - startY);
    
    // Draw column separator
    this.doc.line(15 + colWidth, startY, 15 + colWidth, yPosition);
  }

  /**
   * Adds map snapshot section to the PDF
   * Captures the map element, converts to image, and adds to PDF with legend and attribution
   * @param mapElement - HTML element containing the map to capture
   * @param reports - Array of flood reports to check for location data
   */
  private async addMapSnapshot(mapElement: HTMLElement, reports: FloodReport[]): Promise<void> {
    if (!this.doc) return;

    try {
      // Check if there are any reports with location data
      const hasLocationData = reports.some(report => report.exif?.location);

      // Add new page for map
      this.doc.addPage();
      const pageWidth = this.doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Section title
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Peta Lokasi Banjir', 15, yPosition);
      yPosition += 10;

      // If no location data available, show message
      if (!hasLocationData) {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'italic');
        this.doc.setTextColor(150, 150, 150);
        this.doc.text('Tidak ada data lokasi tersedia', pageWidth / 2, yPosition + 50, { align: 'center' });
        this.doc.setTextColor(0, 0, 0);
        return;
      }

      // Capture map snapshot
      let mapImageData: string;
      try {
        mapImageData = await captureMapSnapshot(mapElement);
      } catch (error) {
        // Graceful degradation if map capture fails
        console.error('Failed to capture map snapshot:', error);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'italic');
        this.doc.setTextColor(200, 0, 0);
        this.doc.text('Gagal menangkap snapshot peta', pageWidth / 2, yPosition + 50, { align: 'center' });
        this.doc.setTextColor(0, 0, 0);
        return;
      }

      // Calculate image dimensions to fit page width with margins
      const maxWidth = pageWidth - 30; // 15mm margins on each side
      const maxHeight = 150; // Maximum height for map image

      // Add map image to PDF
      this.doc.addImage(
        mapImageData,
        'JPEG',
        15, // x position
        yPosition, // y position
        maxWidth, // width
        maxHeight, // height
        undefined,
        'FAST' // compression
      );

      yPosition += maxHeight + 8;

      // Add map legend
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Keterangan:', 15, yPosition);
      yPosition += 6;

      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('• Marker merah menunjukkan lokasi laporan banjir', 20, yPosition);
      yPosition += 5;
      this.doc.text('• Klik pada marker untuk melihat detail foto', 20, yPosition);
      yPosition += 8;

      // Add attribution
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(100, 100, 100);
      this.doc.text('Sumber peta: OpenStreetMap contributors', 15, yPosition);
      this.doc.setTextColor(0, 0, 0);

    } catch (error) {
      // Log error but don't fail the entire PDF generation
      console.error('Error in addMapSnapshot:', error);
      
      // Show error message in PDF
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(200, 0, 0);
      this.doc.text('Terjadi kesalahan saat menambahkan peta', 15, 30);
      this.doc.setTextColor(0, 0, 0);
    }
  }

  /**
   * Formats a date string for filter display (DD/MM/YYYY)
   * @param dateStr - ISO date string
   * @returns Formatted date string
   */
  private formatFilterDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Adds photo grid section to the PDF
   * Displays photos in 2-column grid with captions, metadata, and pagination
   * @param reports - Array of flood reports containing photos
   */
  private async addPhotoGrid(reports: FloodReport[]): Promise<void> {
    if (!this.doc) return;

    try {
      // Add new page for photo grid
      this.doc.addPage();
      const pageWidth = this.doc.internal.pageSize.getWidth();
      const pageHeight = this.doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Section title
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Galeri Foto Banjir', 15, yPosition);
      yPosition += 10;

      // Grid configuration
      const margin = 15;
      const columnGap = 10;
      const columns = 2;
      const photoWidth = (pageWidth - (2 * margin) - columnGap) / columns;
      const maxPhotoHeight = 80; // Maximum height for photos
      const captionHeight = 25; // Space for caption text
      const itemHeight = maxPhotoHeight + captionHeight;
      const bottomMargin = 20; // Space for footer

      // Load photos in batches
      const batchSize = 10;
      let currentColumn = 0;
      let currentRow = 0;

      for (let i = 0; i < reports.length; i += batchSize) {
        const batch = reports.slice(i, Math.min(i + batchSize, reports.length));
        
        // Load batch of photos
        const photoPromises = batch.map(async (report) => {
          try {
            const compressedImage = await loadAndCompressPhoto(report.previewUrl, 800);
            return { report, image: compressedImage, failed: false };
          } catch (error) {
            console.warn(`Failed to load photo ${report.file.name}:`, error);
            return { report, image: '', failed: true };
          }
        });

        const loadedPhotos = await Promise.all(photoPromises);

        // Add photos to grid
        for (const { report, image, failed } of loadedPhotos) {
          // Calculate position
          const xPosition = margin + (currentColumn * (photoWidth + columnGap));
          const photoY = yPosition;

          // Check if we need a new page
          if (yPosition + itemHeight > pageHeight - bottomMargin) {
            this.doc.addPage();
            yPosition = 20;
            currentRow = 0;
            currentColumn = 0;
            
            // Repeat section title on new page
            this.doc.setFontSize(14);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text('Galeri Foto Banjir (lanjutan)', 15, yPosition);
            yPosition += 10;
          }

          // Draw photo border
          this.doc.setDrawColor(200, 200, 200);
          this.doc.setLineWidth(0.3);
          this.doc.rect(xPosition, photoY, photoWidth, maxPhotoHeight);

          if (!failed && image) {
            try {
              // Add image to PDF with fixed dimensions
              // The jsPDF library will handle aspect ratio internally
              this.doc.addImage(
                image,
                'JPEG',
                xPosition,
                photoY,
                photoWidth,
                maxPhotoHeight,
                undefined,
                'FAST'
              );
            } catch (error) {
              // If image processing fails, show placeholder text
              this.doc.setFontSize(9);
              this.doc.setFont('helvetica', 'italic');
              this.doc.setTextColor(150, 150, 150);
              this.doc.text('Gagal memuat foto', xPosition + photoWidth / 2, photoY + maxPhotoHeight / 2, { align: 'center' });
              this.doc.setTextColor(0, 0, 0);
            }
          } else {
            // Show placeholder for failed photo loads
            this.doc.setFontSize(9);
            this.doc.setFont('helvetica', 'italic');
            this.doc.setTextColor(150, 150, 150);
            this.doc.text('Foto tidak tersedia', xPosition + photoWidth / 2, photoY + maxPhotoHeight / 2, { align: 'center' });
            this.doc.setTextColor(0, 0, 0);
          }

          // Add caption below photo
          let captionY = photoY + maxPhotoHeight + 4;
          this.doc.setFontSize(8);
          this.doc.setFont('helvetica', 'bold');
          
          // Filename (truncated if too long)
          const maxFilenameLength = 30;
          const filename = report.file.name.length > maxFilenameLength 
            ? report.file.name.substring(0, maxFilenameLength - 3) + '...'
            : report.file.name;
          this.doc.text(filename, xPosition + 2, captionY);
          captionY += 4;

          // Capture date/time and regu
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(7);
          
          const captureDate = formatDate(report.exif?.dateTime || report.timestamp);
          const reguName = formatReguName(report.regu);
          this.doc.text(`Tanggal: ${captureDate}`, xPosition + 2, captionY);
          captionY += 3.5;
          this.doc.text(`Regu: ${reguName}`, xPosition + 2, captionY);
          captionY += 3.5;

          // GPS coordinates
          if (report.exif?.location) {
            const coords = formatCoordinates(report.exif.location.lat, report.exif.location.lng);
            this.doc.text(`Lokasi: ${coords}`, xPosition + 2, captionY);
          } else {
            this.doc.setFont('helvetica', 'italic');
            this.doc.setTextColor(150, 150, 150);
            this.doc.text('Lokasi: Tidak Tersedia', xPosition + 2, captionY);
            this.doc.setTextColor(0, 0, 0);
            this.doc.setFont('helvetica', 'normal');
          }
          captionY += 3.5;

          // Camera info
          if (report.exif?.make || report.exif?.model) {
            const cameraInfo = formatCameraInfo(report.exif.make, report.exif.model);
            this.doc.text(`Kamera: ${cameraInfo}`, xPosition + 2, captionY);
          }

          // Move to next position
          currentColumn++;
          if (currentColumn >= columns) {
            currentColumn = 0;
            currentRow++;
            yPosition += itemHeight + 5; // Add spacing between rows
          }
        }
      }

      // If we ended mid-row, adjust yPosition for next section
      if (currentColumn > 0) {
        yPosition += itemHeight + 5;
      }

    } catch (error) {
      // Log error but don't fail the entire PDF generation
      console.error('Error in addPhotoGrid:', error);
      
      // Show error message in PDF
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(200, 0, 0);
      this.doc.text('Terjadi kesalahan saat menambahkan galeri foto', 15, 30);
      this.doc.setTextColor(0, 0, 0);
    }
  }

  /**
   * Adds data table section to the PDF
   * Creates a table with columns: No, Filename, Regu, Capture Date, Location, Camera Device
   * Uses jsPDF-autotable for automatic pagination and styling
   * @param reports - Array of flood reports to display in the table
   */
  private addDataTable(reports: FloodReport[]): void {
    if (!this.doc) return;

    try {
      // Add new page for data table
      this.doc.addPage();
      let yPosition = 20;

      // Section title
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Tabel Data Laporan', 15, yPosition);
      yPosition += 10;

      // Prepare table data
      const tableData = reports.map((report, index) => {
        // Row number (sequential starting from 1)
        const no = index + 1;

        // Filename
        const filename = report.file.name || 'N/A';

        // Regu
        const regu = formatReguName(report.regu);

        // Capture date formatted as DD/MM/YYYY HH:MM
        const captureDate = formatDate(report.exif?.dateTime || report.timestamp);

        // Location (Lat/Lng) or N/A
        const location = report.exif?.location
          ? formatCoordinates(report.exif.location.lat, report.exif.location.lng)
          : 'N/A';

        // Camera device or N/A
        const camera = (report.exif?.make || report.exif?.model)
          ? formatCameraInfo(report.exif.make, report.exif.model)
          : 'N/A';

        return [no, filename, regu, captureDate, location, camera];
      });

      // Create table using jsPDF-autotable
      autoTable(this.doc, {
        startY: yPosition,
        head: [['No', 'Nama File', 'Regu', 'Tanggal Pengambilan', 'Lokasi (Lat/Lng)', 'Perangkat Kamera']],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [66, 139, 202], // Blue header
          textColor: [255, 255, 255], // White text
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' }, // No column - narrow and centered
          1: { cellWidth: 40 }, // Filename - wider
          2: { cellWidth: 20 }, // Regu
          3: { cellWidth: 35 }, // Capture Date
          4: { cellWidth: 40 }, // Location
          5: { cellWidth: 33 }, // Camera Device
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245], // Light gray for alternate rows
        },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          // This callback is called after each page is drawn
          // We can use it to ensure headers are repeated on each page
          // (jsPDF-autotable handles this automatically with showHead: 'everyPage')
        },
        showHead: 'everyPage', // Repeat headers on every page
      });

    } catch (error) {
      // Log error but don't fail the entire PDF generation
      console.error('Error in addDataTable:', error);
      
      // Show error message in PDF
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(200, 0, 0);
      this.doc.text('Terjadi kesalahan saat menambahkan tabel data', 15, 30);
      this.doc.setTextColor(0, 0, 0);
    }
  }

  /**
   * Adds footer to the current page with page numbers and organization name
   * Format: "Page X of Y" and "BPBD Kota Banjarmasin"
   * @param pageNumber - Current page number
   * @param totalPages - Total number of pages in the document
   */
  private addFooter(pageNumber: number, totalPages: number): void {
    if (!this.doc) return;

    const pageWidth = this.doc.internal.pageSize.getWidth();
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 10; // 10mm from bottom

    // Set footer font style
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100); // Gray color

    // Add page number on the left
    const pageText = `Halaman ${pageNumber} dari ${totalPages}`;
    this.doc.text(pageText, 15, footerY);

    // Add organization name on the right
    const orgName = 'BPBD Kota Banjarmasin';
    this.doc.text(orgName, pageWidth - 15, footerY, { align: 'right' });

    // Reset text color to black for subsequent content
    this.doc.setTextColor(0, 0, 0);
  }

  /**
   * Sets PDF metadata including title, author, subject, and creation date
   * Ensures UTF-8 encoding for Indonesian characters
   * @param filterInfo - Active filter information to include in metadata
   */
  private setPDFMetadata(filterInfo: FilterInfo): void {
    if (!this.doc) return;

    try {
      // Build title based on filters
      let title = 'Laporan Data Banjir';
      if (filterInfo.regu && filterInfo.regu !== 'all') {
        title += ` - ${filterInfo.regu}`;
      }
      if (filterInfo.captureDateStart || filterInfo.captureDateEnd) {
        title += ' (Filtered)';
      }

      // Set PDF properties
      this.doc.setProperties({
        title: title,
        author: 'BPBD Kota Banjarmasin',
        subject: 'Laporan Data Banjir - Sistem Pengumpulan Data Banjir',
        creator: 'BPBD Flood Data Collection System',
        keywords: 'banjir, flood, laporan, report, BPBD, Banjarmasin',
      });

      // Note: jsPDF automatically handles UTF-8 encoding for Indonesian characters
    } catch (error) {
      // Log error but don't fail PDF generation
      console.error('Failed to set PDF metadata:', error);
    }
  }

  /**
   * Triggers PDF download to user's device
   * Handles browser download blocking gracefully
   * @param filename - Name of the PDF file to download
   * @throws {PDFExportError} if download fails
   */
  private downloadPDF(filename: string): void {
    if (!this.doc) {
      throw new PDFExportError(
        'PDF document tidak tersedia untuk diunduh',
        'download',
        false
      );
    }

    try {
      // Use jsPDF's save method to trigger download
      // This method handles blob creation and download link automatically
      this.doc.save(filename);
    } catch (error) {
      // Handle download blocking or other download errors
      console.error('Failed to download PDF:', error);
      
      throw new PDFExportError(
        'Gagal mengunduh PDF. Silakan periksa pengaturan browser Anda dan pastikan download tidak diblokir.',
        'download',
        true
      );
    }
  }

  /**
   * Handles errors during PDF generation
   * Converts various error types to PDFGenerationResult
   */
  private handleError(error: unknown): PDFGenerationResult {
    if (error instanceof PDFExportError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga';
    return {
      success: false,
      error: `Gagal membuat PDF: ${errorMessage}`,
    };
  }
}

// Default export for convenience
export default PDFExportService;

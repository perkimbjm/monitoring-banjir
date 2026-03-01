// PDF Export Type Definitions

import { FloodReport } from '../types';

export interface PDFExportOptions {
  reports: FloodReport[];
  filterInfo: FilterInfo;
  mapElement?: HTMLElement;
  includeMap: boolean;
  includePhotos: boolean;
  includeTable: boolean;
}

export interface FilterInfo {
  captureDateStart?: string;
  captureDateEnd?: string;
  uploadDateStart?: string;
  uploadDateEnd?: string;
  regu?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface ReportStatistics {
  totalReports: number;
  mappedReports: number;
  uploadedReports: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  reguBreakdown: Array<{
    regu: string;
    count: number;
  }>;
}

export interface PhotoGridItem {
  image: string;
  filename: string;
  captureDate: string;
  location?: string;
  camera?: string;
  regu?: string;
}

export interface TableRow {
  no: number;
  filename: string;
  regu: string;
  captureDate: string;
  location: string;
  camera: string;
}

export interface PDFSection {
  title: string;
  content: () => void;
  pageBreakBefore?: boolean;
}

export interface PDFStyles {
  headerFont: string;
  bodyFont: string;
  headerSize: number;
  bodySize: number;
  primaryColor: [number, number, number];
  secondaryColor: [number, number, number];
}

export class PDFExportError extends Error {
  constructor(
    message: string,
    public category: 'initialization' | 'validation' | 'resource' | 'generation' | 'download',
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'PDFExportError';
  }
}

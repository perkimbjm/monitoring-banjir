
export type UserRole = 'surveyor' | 'admin';

export interface GeoLocation {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  location?: GeoLocation;
  software?: string;
}

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface FloodReport {
  id: string;
  file: File;
  previewUrl: string;
  exif: ExifData;
  timestamp: number;
  status: UploadStatus;
  driveFileId?: string;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  image: string;
}

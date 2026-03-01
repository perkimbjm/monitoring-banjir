// Image Processing Utilities for PDF Export

import html2canvas from 'html2canvas';

/**
 * Load image from URL with Promise-based async loading
 */
export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    
    img.src = url;
  });
};

/**
 * Compress image using canvas-based compression
 * @param img - HTMLImageElement to compress
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param quality - JPEG quality 0-1 (default: 0.75)
 * @returns Base64 encoded image data URL
 */
export const compressImage = (
  img: HTMLImageElement,
  maxWidth: number = 800,
  quality: number = 0.75
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Calculate scaled dimensions while preserving aspect ratio
  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  // Draw and compress
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * Load and compress photo in one operation
 * @param url - Image URL to load
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @returns Base64 encoded compressed image
 */
export const loadAndCompressPhoto = async (
  url: string,
  maxWidth: number = 800
): Promise<string> => {
  try {
    const img = await loadImage(url);
    return compressImage(img, maxWidth, 0.75);
  } catch (error) {
    console.error('Failed to load and compress photo:', error);
    throw error;
  }
};

/**
 * Capture map snapshot using html2canvas
 * @param element - HTML element to capture (map container)
 * @returns Base64 encoded image data URL
 */
export const captureMapSnapshot = async (element: HTMLElement): Promise<string> => {
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight
    });
    
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Map capture failed:', error);
    throw new Error('Failed to capture map snapshot');
  }
};

/**
 * Get image dimensions from data URL
 */
export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = dataUrl;
  });
};

/**
 * Calculate aspect ratio from dimensions
 */
export const calculateAspectRatio = (width: number, height: number): number => {
  return width / height;
};

/**
 * Batch load multiple images with progress tracking
 */
export const batchLoadImages = async (
  urls: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<string[]> => {
  const results: string[] = [];
  const batchSize = 10; // Load 10 images at a time
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(url => loadAndCompressPhoto(url))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`Failed to load image ${i + index}:`, result.reason);
        results.push(''); // Placeholder for failed images
      }
    });
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, urls.length), urls.length);
    }
  }
  
  return results;
};

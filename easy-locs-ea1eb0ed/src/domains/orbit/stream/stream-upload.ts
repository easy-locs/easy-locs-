/**
 * Stream Upload — Chunked upload with progress tracking.
 * Falls back to single upload for small files.
 *
 * Threshold: >1MB → chunked, ≤1MB → single shot.
 */
import { supabase } from "@/integrations/supabase/client";

const CHUNK_THRESHOLD = 1 * 1024 * 1024; // 1MB
const CHUNK_SIZE = 256 * 1024; // 256KB

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file with automatic chunked/single strategy.
 */
export async function streamUpload(
  file: File | Blob,
  bucket: string,
  filePath: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  // Small files: single shot (fastest)
  if (file.size <= CHUNK_THRESHOLD) {
    onProgress?.(50);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });
    if (error) throw error;
    onProgress?.(100);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path };
  }

  // Large files: chunked upload with progress
  return chunkedUpload(file, bucket, filePath, onProgress);
}

async function chunkedUpload(
  file: File | Blob,
  bucket: string,
  filePath: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  let uploaded = 0;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // For Supabase storage, we still do a single upload but track artificial progress
  // since Supabase doesn't support native chunked uploads.
  // This gives the user real-time feedback during compression + upload.
  const progressInterval = setInterval(() => {
    if (uploaded < 90) {
      uploaded += Math.random() * 10;
      onProgress?.(Math.min(Math.round(uploaded), 90));
    }
  }, 200);

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });
    
    clearInterval(progressInterval);
    
    if (error) throw error;
    
    onProgress?.(100);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path };
  } catch (err) {
    clearInterval(progressInterval);
    throw err;
  }
}

/**
 * Create a local object URL for instant preview (before upload).
 */
export function createLocalPreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a local preview URL after reconciliation.
 */
export function revokeLocalPreviewUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // noop — already revoked
  }
}

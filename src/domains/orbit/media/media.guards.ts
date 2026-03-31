/**
 * media.guards — Validation guards for media operations.
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BATCH_SIZE = 10;

export function isFileSizeValid(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function isBatchSizeValid(files: File[]): boolean {
  return files.length > 0 && files.length <= MAX_BATCH_SIZE;
}

export function isMediaTypeSupported(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    file.type.length > 0 // any file type as generic
  );
}

export function validateMediaFile(file: File): string | null {
  if (!file) return "no_file";
  if (!isFileSizeValid(file)) return "file_too_large";
  return null;
}

export function validateMediaBatch(files: File[]): string | null {
  if (!isBatchSizeValid(files)) return "invalid_batch_size";
  for (const file of files) {
    const err = validateMediaFile(file);
    if (err) return `${err}:${file.name}`;
  }
  return null;
}

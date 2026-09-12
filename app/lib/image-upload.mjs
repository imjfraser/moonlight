export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export function imageFileError(file) {
  if (!file || !IMAGE_TYPES.has(file.type) || !Number.isFinite(file.size) || file.size <= 0) return "invalid_image";
  return file.size > MAX_IMAGE_BYTES ? "too_large" : null;
}

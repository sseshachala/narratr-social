export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const VIDEO_TYPES = ['video/mp4'] as const;
export const ALLOWED_MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES] as const;

export const MAX_IMAGE_COUNT = 4;
export const MAX_VIDEO_COUNT = 1;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export const RECOMMENDED_FEED_IMAGE = { width: 1080, height: 1350, label: '1080 × 1350' };
export const RECOMMENDED_SQUARE_IMAGE = { width: 1080, height: 1080, label: '1080 × 1080' };
export const RECOMMENDED_VERTICAL_VIDEO = { width: 1080, height: 1920, label: '1080 × 1920' };
export const RECOMMENDED_LANDSCAPE_VIDEO = { width: 1920, height: 1080, label: '1920 × 1080' };

export type MediaValidationResult = {
  errors: string[];
  warnings: string[];
};

export function isImageType(type: string) {
  return IMAGE_TYPES.includes(type as (typeof IMAGE_TYPES)[number]);
}

export function isVideoType(type: string) {
  return VIDEO_TYPES.includes(type as (typeof VIDEO_TYPES)[number]);
}

export function validateMediaSelection(files: Array<{ type: string; size: number }>): MediaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const images = files.filter((file) => isImageType(file.type));
  const videos = files.filter((file) => isVideoType(file.type));
  const unsupported = files.filter((file) => !isImageType(file.type) && !isVideoType(file.type));

  if (unsupported.length > 0) errors.push('Only JPG, PNG, WebP, and MP4 files are supported.');
  if (videos.length > MAX_VIDEO_COUNT) errors.push('Only one video can be attached to a post.');
  if (videos.length > 0 && images.length > 0) errors.push('Choose either one video or up to four images for a post.');
  if (videos.length === 0 && images.length > MAX_IMAGE_COUNT) errors.push('You can upload up to four images.');
  if (images.some((file) => file.size > MAX_IMAGE_BYTES)) errors.push('Each image must be 8 MB or smaller.');
  if (videos.some((file) => file.size > MAX_VIDEO_BYTES)) errors.push('Video must be 25 MB or smaller.');

  return { errors, warnings };
}

export function getImageRecommendation(width?: number | null, height?: number | null) {
  if (!width || !height) return null;
  if (width < 1080 || height < 1080) {
    return 'This image may look soft on some platforms. Recommended sizes are 1080 × 1350 or 1080 × 1080.';
  }
  const ratio = width / height;
  const preferredRatios = [1080 / 1350, 1];
  if (preferredRatios.every((candidate) => Math.abs(candidate - ratio) > 0.08)) {
    return 'This image uses an unusual aspect ratio. 1080 × 1350 or 1080 × 1080 will crop more predictably across channels.';
  }
  return null;
}

export function getVideoRecommendation(width?: number | null, height?: number | null) {
  if (!width || !height) return null;
  if (width < 1080 || height < 1080) {
    return 'This video is lower resolution than recommended. 1080 × 1920 is the safest default for short-form content.';
  }
  const ratio = width / height;
  const preferredRatios = [1080 / 1920, 1920 / 1080];
  if (preferredRatios.every((candidate) => Math.abs(candidate - ratio) > 0.08)) {
    return 'This video uses an unusual aspect ratio. 1080 × 1920 or 1920 × 1080 will work more cleanly across channels.';
  }
  return null;
}

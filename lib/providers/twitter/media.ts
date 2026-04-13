import { Buffer } from 'node:buffer';
import { ApiError } from '@/lib/http/errors';

const API_BASE = 'https://api.x.com/2/media/upload';
const CHUNK_SIZE = 4 * 1024 * 1024;

type UploadResponse = {
  data?: {
    id?: string;
    media_key?: string;
    expires_after_secs?: number;
    size?: number;
    processing_info?: ProcessingInfo;
  };
  errors?: Array<{
    title?: string;
    type?: string;
    detail?: string;
    status?: number;
    message?: string;
  }>;
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
};

type ProcessingInfo = {
  state?: 'pending' | 'in_progress' | 'succeeded' | 'failed';
  check_after_secs?: number;
  progress_percent?: number;
  error?: {
    code?: number;
    name?: string;
    message?: string;
  };
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function safeJson(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json') && !contentType.includes('application/problem+json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback;
  const obj = json as Record<string, unknown>;
  const errors = Array.isArray(obj.errors) ? obj.errors : undefined;
  const firstError = errors?.[0] as Record<string, unknown> | undefined;

  return (
    (typeof firstError?.message === 'string' && firstError.message) ||
    (typeof firstError?.detail === 'string' && firstError.detail) ||
    (typeof firstError?.title === 'string' && firstError.title) ||
    (typeof obj.detail === 'string' && obj.detail) ||
    (typeof obj.title === 'string' && obj.title) ||
    fallback
  );
}

function getFileType(file: File): string {
  return (file.type || '').trim().toLowerCase();
}

function getMediaCategory(fileType: string): 'tweet_image' | 'tweet_video' | 'tweet_gif' {
  if (fileType === 'image/gif') return 'tweet_gif';
  if (fileType.startsWith('video/')) return 'tweet_video';
  return 'tweet_image';
}

function shouldUseChunkedUpload(file: File): boolean {
  return getFileType(file).startsWith('video/');
}

function createApiError(status: number, json: unknown, fallback: string): ApiError {
  return new ApiError(status, getErrorMessage(json, fallback), json);
}

async function uploadImage(file: File, token: string): Promise<string> {
  const fileType = getFileType(file) || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media: base64,
      media_type: fileType,
      media_category: getMediaCategory(fileType),
      shared: false,
    }),
    cache: 'no-store',
  });

  const json = (await safeJson(response)) as UploadResponse | null;
  if (!response.ok || !json?.data?.id) {
    console.error('[twitter.media.upload] image upload failed', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      fileName: file.name,
      fileType,
      fileSize: file.size,
      body: json,
    });
    throw createApiError(response.status, json, 'Failed to upload image');
  }

  return json.data.id;
}

async function initializeChunkedUpload(file: File, token: string): Promise<string> {
  const fileType = getFileType(file) || 'application/octet-stream';

  const response = await fetch(`${API_BASE}/initialize`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_type: fileType,
      media_category: getMediaCategory(fileType),
      total_bytes: file.size,
      shared: false,
    }),
    cache: 'no-store',
  });

  const json = (await safeJson(response)) as UploadResponse | null;
  if (!response.ok || !json?.data?.id) {
    console.error('[twitter.media.upload] initialize failed', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      fileName: file.name,
      fileType,
      fileSize: file.size,
      body: json,
    });
    throw createApiError(response.status, json, 'Failed to initialize media upload');
  }

  return json.data.id;
}

async function appendChunkedUpload(file: File, mediaId: string, token: string): Promise<void> {
  let segmentIndex = 0;

  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    const formData = new FormData();
    formData.append('media', chunk, file.name || `segment-${segmentIndex}`);
    formData.append('segment_index', String(segmentIndex));

    const response = await fetch(`${API_BASE}/${mediaId}/append`, {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
      cache: 'no-store',
    });

    const json = await safeJson(response);
    if (!response.ok) {
      console.error('[twitter.media.upload] append failed', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        fileName: file.name,
        fileType: getFileType(file),
        fileSize: file.size,
        mediaId,
        segmentIndex,
        chunkSize: chunk.size,
        body: json,
      });
      throw createApiError(response.status, json, 'Failed to append media chunk');
    }

    segmentIndex += 1;
  }
}

async function finalizeChunkedUpload(mediaId: string, token: string): Promise<ProcessingInfo | undefined> {
  const response = await fetch(`${API_BASE}/${mediaId}/finalize`, {
    method: 'POST',
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const json = (await safeJson(response)) as UploadResponse | null;
  if (!response.ok || !json?.data?.id) {
    console.error('[twitter.media.upload] finalize failed', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      mediaId,
      body: json,
    });
    throw createApiError(response.status, json, 'Failed to finalize media upload');
  }

  return json.data.processing_info;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMedia(mediaId: string, token: string, initial?: ProcessingInfo): Promise<void> {
  let processingInfo = initial;

  while (processingInfo && (processingInfo.state === 'pending' || processingInfo.state === 'in_progress')) {
    const delayMs = Math.max(1, processingInfo.check_after_secs ?? 1) * 1000;
    await sleep(delayMs);

    const url = new URL(API_BASE);
    url.searchParams.set('command', 'STATUS');
    url.searchParams.set('media_id', mediaId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: authHeaders(token),
      cache: 'no-store',
    });

    const json = (await safeJson(response)) as UploadResponse | null;
    if (!response.ok || !json?.data?.id) {
      console.error('[twitter.media.upload] status failed', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        mediaId,
        body: json,
      });
      throw createApiError(response.status, json, 'Failed to check media processing status');
    }

    processingInfo = json.data.processing_info;
    if (processingInfo?.state === 'failed') {
      throw new ApiError(422, processingInfo.error?.message || 'Media processing failed', processingInfo);
    }
  }
}

async function uploadChunkedMedia(file: File, token: string): Promise<string> {
  const mediaId = await initializeChunkedUpload(file, token);
  await appendChunkedUpload(file, mediaId, token);
  const processingInfo = await finalizeChunkedUpload(mediaId, token);
  await waitForMedia(mediaId, token, processingInfo);
  return mediaId;
}

export async function uploadMediaFiles(files: File[], token: string): Promise<string[]> {
  const mediaIds: string[] = [];

  for (const file of files) {
    console.log('[twitter.media.upload] preparing file', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const mediaId = shouldUseChunkedUpload(file)
      ? await uploadChunkedMedia(file, token)
      : await uploadImage(file, token);

    mediaIds.push(mediaId);
  }

  return mediaIds;
}

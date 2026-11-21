import { auth } from '../lib/firebase';

export interface ExportArtifactStatus {
  available: boolean;
  source: 'local' | 'github' | null;
  fileName?: string;
  sizeBytes?: number;
  signed?: boolean;
  downloadUrl?: string;
  releaseTag?: string;
}

export interface ExportStatusResponse {
  appName: string;
  packageId: string;
  sourceZipReady: boolean;
  projectFilesCount: number;
  firebase: {
    configured: boolean;
    projectId: string | null;
    databaseId: string | null;
    storageBucket: string | null;
    rulesFilePresent: boolean;
  };
  androidProjectReady: boolean;
  toolchain: {
    nodeVersion: string;
    hasJava: boolean;
    javaVersion: string | null;
    hasAndroidSdk: boolean;
    hasGradleWrapper: boolean;
    hasCapacitorConfig: boolean;
    hasReleaseKeystoreConfigured: boolean;
  };
  apk: ExportArtifactStatus;
  aab: ExportArtifactStatus;
  githubRelease?: {
    checked: boolean;
    repoExists: boolean;
    releaseTag?: string;
    error?: string;
  } | null;
  buildStatus: 'ready' | 'toolchain_missing' | 'building';
  errorDetails: string | null;
}

export interface AndroidBuildResponse {
  ok: boolean;
  status: string;
  errorDetails?: string;
  buildLog?: string;
  apk?: ExportArtifactStatus;
  aab?: ExportArtifactStatus;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to export the application.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchExportStatus(githubRepo?: string): Promise<ExportStatusResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (githubRepo && githubRepo.trim()) {
    params.set('githubRepo', githubRepo.trim());
  }
  const query = params.toString();
  const res = await fetch(`/api/export/status${query ? `?${query}` : ''}`, { headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to inspect export status.');
  }
  return data as ExportStatusResponse;
}

export async function triggerAndroidBuild(): Promise<AndroidBuildResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/export/build-android', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  const data = (await res.json()) as AndroidBuildResponse;
  return data;
}

function triggerBrowserBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function streamResponseWithProgress(
  response: Response,
  onProgress?: (loadedBytes: number, totalBytes: number | null) => void
): Promise<Uint8Array<ArrayBuffer>> {
  const contentLengthHeader = response.headers.get('Content-Length');
  const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : null;

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    onProgress?.(bytes.byteLength, bytes.byteLength);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, totalBytes);
    }
  }

  const combined = new Uint8Array(new ArrayBuffer(loaded));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

export async function downloadSourceCodeZip(
  onProgress?: (loadedBytes: number, totalBytes: number | null) => void
): Promise<{ fileCount: number; sizeBytes: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/export/source-zip', { headers });

  if (!res.ok) {
    let errMsg = `Export failed (HTTP ${res.status}).`;
    try {
      const errData = await res.json();
      if (errData?.error) errMsg = errData.error;
    } catch {
      // Ignore JSON parse fallback
    }
    throw new Error(errMsg);
  }

  const fileCount = Number(res.headers.get('X-Export-File-Count') || '0');
  const bytes = await streamResponseWithProgress(res, onProgress);

  // Verify real PKZIP magic signature (0x50, 0x4B) before confirming success
  if (bytes.byteLength < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Generated archive failed ZIP integrity verification.');
  }

  const zipBlob = new Blob([bytes], { type: 'application/zip' });
  triggerBrowserBlobDownload(zipBlob, 'ajay-battles-complete-source.zip');

  return { fileCount, sizeBytes: bytes.byteLength };
}

export async function downloadAndroidArtifact(
  kind: 'apk' | 'aab',
  artifact: ExportArtifactStatus,
  onProgress?: (loadedBytes: number, totalBytes: number | null) => void
): Promise<void> {
  if (!artifact.available || !artifact.downloadUrl) {
    throw new Error(`No compiled .${kind} file is available yet.`);
  }

  if (artifact.source === 'github') {
    const link = document.createElement('a');
    link.href = artifact.downloadUrl;
    link.download = artifact.fileName || `ajay-battles.${kind}`;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const headers = await getAuthHeaders();
  const res = await fetch(artifact.downloadUrl, { headers });
  if (!res.ok) {
    let errMsg = `Unable to download .${kind} file (HTTP ${res.status}).`;
    try {
      const errData = await res.json();
      if (errData?.error) errMsg = errData.error;
    } catch {
      // Ignore JSON parse fallback
    }
    throw new Error(errMsg);
  }

  const bytes = await streamResponseWithProgress(res, onProgress);
  if (bytes.byteLength < 100) {
    throw new Error(`Downloaded .${kind} artifact appears incomplete.`);
  }

  const mime =
    kind === 'apk' ? 'application/vnd.android.package-archive' : 'application/octet-stream';
  const blob = new Blob([bytes], { type: mime });
  triggerBrowserBlobDownload(blob, artifact.fileName || `ajay-battles.${kind}`);
}

export function formatBytes(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

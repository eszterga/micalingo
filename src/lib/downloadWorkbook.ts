import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const OCTET_STREAM = 'application/octet-stream';

type PluginHeader = { name?: string };

/**
 * The installed app only includes plugins listed by the native bridge.
 * A JavaScript-only Filesystem fallback writes into IndexedDB and never
 * produces a file the user can open, so it must not be treated as success.
 */
function nativePluginInstalled(name: string): boolean {
  const headers = (globalThis as { Capacitor?: { PluginHeaders?: PluginHeader[] } }).Capacitor?.PluginHeaders;
  return Array.isArray(headers) && headers.some((header) => header?.name === name);
}

function safeFileName(filename: string): string {
  const cleaned = filename.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').trim() || 'MicaLingo.xlsx';
  return cleaned.toLowerCase().endsWith('.xlsx') ? cleaned : `${cleaned}.xlsx`;
}

function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Uint8Array.from(data as number[]);
  throw new Error('Unexpected workbook bytes');
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isShareCancel(error: unknown): boolean {
  const name = error && typeof error === 'object' && 'name' in error ? String((error as { name?: string }).name) : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return name === 'AbortError' || /cancel|dismiss/i.test(message);
}

/**
 * Same save SheetJS used when phone downloads worked: an octet-stream blob.
 * Android's download manager rejects the spreadsheet MIME type and reports
 * that the file could not be downloaded. Keep the blob alive long enough
 * for a slow phone to finish reading it.
 */
function triggerAnchorDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytesToArrayBuffer(bytes)], { type: OCTET_STREAM });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function excelFile(bytes: Uint8Array, filename: string, type: string): File {
  return new File([bytesToArrayBuffer(bytes)], filename, { type });
}

/**
 * Must be called in the same turn as the tap. Android's WebView ignores a
 * normal download link, and canShare() often says no even when the share
 * sheet can still open. Asking here is what shows Save / Drive / Files.
 */
function shareFileFromTap(bytes: Uint8Array, filename: string): Promise<void> {
  if (typeof navigator.share !== 'function') {
    return Promise.reject(new Error('share unavailable'));
  }
  const payload: ShareData = { files: [excelFile(bytes, filename, XLSX_MIME)], title: filename };
  return navigator.share(payload).catch((error: unknown) => {
    if (isShareCancel(error)) throw error;
    const fallback: ShareData = { files: [excelFile(bytes, filename, OCTET_STREAM)], title: filename };
    return navigator.share(fallback);
  });
}

async function shareWithNativePlugins(bytes: Uint8Array, filename: string): Promise<void> {
  const base64 = bytesToBase64(bytes);
  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  const rawUri = written?.uri
    || (await Filesystem.getUri({ directory: Directory.Cache, path: filename })).uri;
  const uri = rawUri?.startsWith('/') ? `file://${rawUri}` : rawUri;
  if (!uri || !uri.startsWith('file:')) {
    throw new Error('Excel file URI is not shareable');
  }
  await Share.share({
    title: filename,
    files: [uri],
    dialogTitle: filename,
  });
}

async function saveInApp(bytes: Uint8Array, filename: string, failMessage?: string): Promise<void> {
  try {
    await shareFileFromTap(bytes, filename);
    return;
  } catch (error) {
    if (isShareCancel(error)) return;
    console.error('Excel share failed', error);
  }

  if (nativePluginInstalled('Filesystem') && nativePluginInstalled('Share')) {
    try {
      await shareWithNativePlugins(bytes, filename);
      return;
    } catch (error) {
      if (isShareCancel(error)) return;
      console.error('Excel native share failed', error);
    }
  }

  if (failMessage) window.alert(failMessage);
}

/**
 * Browsers save the file directly. The Android app shows the system share
 * sheet (Save to Files, Drive, Downloads) because its WebView drops a normal
 * download and gives the user no sign that the tap worked.
 */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string, failMessage?: string): Promise<void> {
  try {
    const bytes = toUint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
    const safeName = safeFileName(filename);
    if (Capacitor.isNativePlatform()) {
      return saveInApp(bytes, safeName, failMessage);
    }
    triggerAnchorDownload(bytes, safeName);
    return Promise.resolve();
  } catch (error) {
    console.error(error);
    if (failMessage) window.alert(failMessage);
    return Promise.resolve();
  }
}

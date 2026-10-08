import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function shareWithNativePlugins(bytes: Uint8Array, filename: string): Promise<void> {
  const base64 = bytesToBase64(bytes);
  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  const { uri } = await Filesystem.getUri({
    directory: Directory.Cache,
    path: filename,
  });
  await Share.share({
    title: filename,
    files: [uri],
    dialogTitle: filename,
  });
}

async function shareWithWebApi(file: File, filename: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== 'function') return false;
  const payload: ShareData = { files: [file], title: filename };
  if (typeof nav.canShare === 'function' && !nav.canShare(payload)) return false;
  await nav.share(payload);
  return true;
}

async function saveOnDevice(bytes: Uint8Array, blob: Blob, filename: string, failMessage?: string): Promise<void> {
  const file = new File([blob], filename, { type: XLSX_MIME });
  try {
    if (nativePluginInstalled('Filesystem') && nativePluginInstalled('Share')) {
      await shareWithNativePlugins(bytes, filename);
      return;
    }
    if (await shareWithWebApi(file, filename)) return;
  } catch (error) {
    if (isShareCancel(error)) return;
    console.error('Excel share failed', error);
    try {
      if (await shareWithWebApi(file, filename)) return;
    } catch (fallbackError) {
      if (isShareCancel(fallbackError)) return;
      console.error('Excel web share failed', fallbackError);
    }
  }

  if (failMessage) window.alert(failMessage);
}

/**
 * Browsers save the file directly. The Capacitor app loads the site inside a
 * WebView, which ignores the download attribute, so the app opens the system
 * share sheet instead (Save to Files, Drive, Downloads, and so on).
 */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string, failMessage?: string): void {
  try {
    const bytes = toUint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
    const blob = new Blob([bytesToArrayBuffer(bytes)], { type: XLSX_MIME });
    const safeName = safeFileName(filename);
    if (!Capacitor.isNativePlatform()) {
      triggerAnchorDownload(blob, safeName);
      return;
    }
    void saveOnDevice(bytes, blob, safeName, failMessage);
  } catch (error) {
    console.error(error);
    if (failMessage) window.alert(failMessage);
  }
}

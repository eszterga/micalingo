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

function shareableFile(bytes: Uint8Array, filename: string): File | null {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== 'function') return null;
  try {
    const buffer = bytesToArrayBuffer(bytes);
    const candidates = [
      new File([buffer], filename, { type: XLSX_MIME }),
      new File([buffer], filename, { type: OCTET_STREAM }),
    ];
    for (const file of candidates) {
      const payload: ShareData = { files: [file], title: filename };
      if (typeof nav.canShare !== 'function' || nav.canShare(payload)) return file;
    }
  } catch (error) {
    console.error('Excel share check failed', error);
  }
  return null;
}

function startWebShare(file: File, filename: string, onFail: () => void): void {
  const payload: ShareData = { files: [file], title: filename };
  void navigator.share(payload).catch((error: unknown) => {
    if (isShareCancel(error)) return;
    console.error('Excel web share failed', error);
    onFail();
  });
}

async function shareWithNativePlugins(bytes: Uint8Array, filename: string): Promise<void> {
  const base64 = bytesToBase64(bytes);
  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  const uri = written?.uri
    || (await Filesystem.getUri({ directory: Directory.Cache, path: filename })).uri;
  if (!uri || !uri.startsWith('file:')) {
    throw new Error('Excel file URI is not shareable');
  }
  await Share.share({
    title: filename,
    files: [uri],
    dialogTitle: filename,
  });
}

async function saveOnDevice(
  bytes: Uint8Array,
  filename: string,
  failMessage: string | undefined,
  fallback: () => void,
): Promise<void> {
  try {
    await shareWithNativePlugins(bytes, filename);
    return;
  } catch (error) {
    if (isShareCancel(error)) return;
    console.error('Excel share failed', error);
  }

  const file = shareableFile(bytes, filename);
  if (file) {
    startWebShare(file, filename, () => {
      try {
        fallback();
      } catch (error) {
        console.error(error);
        if (failMessage) window.alert(failMessage);
      }
    });
    return;
  }

  try {
    fallback();
  } catch (error) {
    console.error(error);
    if (failMessage) window.alert(failMessage);
  }
}

/**
 * Browsers save the file directly. The Capacitor app loads the site inside a
 * WebView. When that app build includes Filesystem and Share, the system
 * share sheet opens. Older installs keep the direct download that already
 * worked on the phone.
 */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string, failMessage?: string): void {
  try {
    const bytes = toUint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
    const safeName = safeFileName(filename);
    const fallback = () => triggerAnchorDownload(bytes, safeName);
    const nativeShareReady = Capacitor.isNativePlatform()
      && nativePluginInstalled('Filesystem')
      && nativePluginInstalled('Share');

    if (nativeShareReady) {
      void saveOnDevice(bytes, safeName, failMessage, fallback);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      const file = shareableFile(bytes, safeName);
      if (file) {
        startWebShare(file, safeName, () => {
          try {
            fallback();
          } catch (error) {
            console.error(error);
            if (failMessage) window.alert(failMessage);
          }
        });
        return;
      }
    }

    fallback();
  } catch (error) {
    console.error(error);
    if (failMessage) window.alert(failMessage);
  }
}

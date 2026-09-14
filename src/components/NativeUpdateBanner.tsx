import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

type UpdateManifest = {
  version: string;
  url?: string;
  checksum?: string;
  message?: string;
  mandatory?: boolean;
};

type BundleInfo = {
  id: string;
  version?: string;
};

type CapacitorUpdaterPlugin = {
  notifyAppReady?: () => Promise<unknown>;
  current?: () => Promise<{ bundle?: BundleInfo }>;
  download?: (options: {
    version: string;
    url: string;
    checksum?: string;
  }) => Promise<BundleInfo>;
  set?: (options: { id: string }) => Promise<unknown>;
  addListener?: (
    eventName: string,
    listener: (event: { percent?: number }) => void,
  ) => Promise<{ remove?: () => Promise<void> | void }>;
};

const MANIFEST_URL =
  'https://raw.githubusercontent.com/duonganhthu1505-stack/Trip-plan-for-us/main/public/ota/version.json';

function getUpdater(): CapacitorUpdaterPlugin | null {
  const capacitor = (window as any).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return (capacitor.Plugins?.CapacitorUpdater as CapacitorUpdaterPlugin | undefined) || null;
}

function normalizeVersion(value?: string | null) {
  if (!value || value === 'builtin') return [0, 0, 0];
  const clean = value.replace(/^v/i, '').split('-')[0];
  return clean.split('.').slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
}

function isNewerVersion(next: string, current?: string | null) {
  const a = normalizeVersion(next);
  const b = normalizeVersion(current);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

export function NativeUpdateBanner() {
  const updater = useMemo(() => getUpdater(), []);
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const progressListenerRef = useRef<{ remove?: () => Promise<void> | void } | null>(null);

  useEffect(() => {
    if (!updater) return;

    let cancelled = false;

    async function checkForUpdate() {
      try {
        await updater.notifyAppReady?.();

        const current = await updater.current?.().catch(() => null);
        const currentVersion = current?.bundle?.version || 'builtin';
        const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const next = (await response.json()) as UpdateManifest;
        if (
          !cancelled &&
          next?.version &&
          next?.url &&
          isNewerVersion(next.version, currentVersion)
        ) {
          setManifest(next);
        }
      } catch (error) {
        console.warn('OTA update check failed:', error);
      }
    }

    void checkForUpdate();
    const timer = window.setInterval(checkForUpdate, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void progressListenerRef.current?.remove?.();
    };
  }, [updater]);

  if (!updater || !manifest || dismissed) return null;

  const installUpdate = async () => {
    if (!updater.download || !updater.set || !manifest.url) return;

    setStatus('downloading');
    setProgress(1);
    setErrorMessage('');

    try {
      if (updater.addListener) {
        progressListenerRef.current = await updater.addListener('download', (event) => {
          if (typeof event.percent === 'number') {
            setProgress(Math.max(1, Math.min(100, Math.round(event.percent))));
          }
        });
      }

      const bundle = await updater.download({
        version: manifest.version,
        url: manifest.url,
        ...(manifest.checksum ? { checksum: manifest.checksum } : {}),
      });

      if (!bundle?.id) throw new Error('Không nhận được gói cập nhật hợp lệ.');

      setProgress(100);
      await progressListenerRef.current?.remove?.();
      progressListenerRef.current = null;

      // set() switches to the downloaded web bundle and reloads the WebView.
      await updater.set({ id: bundle.id });
    } catch (error) {
      console.error('OTA update failed:', error);
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể cài bản cập nhật. Vui lòng thử lại.',
      );
      await progressListenerRef.current?.remove?.();
      progressListenerRef.current = null;
    }
  };

  return (
    <div className="fixed left-3 right-3 bottom-4 z-[250] mx-auto max-w-md rounded-2xl border border-[#D8C7B7] bg-[#FFFDF9] p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5C4033] text-white">
          {status === 'downloading' ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#382D24]">Có bản cập nhật mới</p>
              <p className="mt-0.5 text-xs text-[#806957]">Phiên bản {manifest.version}</p>
            </div>

            {!manifest.mandatory && status !== 'downloading' && (
              <button
                type="button"
                aria-label="Đóng thông báo cập nhật"
                onClick={() => setDismissed(true)}
                className="rounded-lg p-1 text-[#8C7768] transition hover:bg-[#F2E9DF]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {manifest.message && (
            <p className="mt-2 text-xs leading-relaxed text-[#6F5A4C]">{manifest.message}</p>
          )}

          {status === 'downloading' ? (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#806957]">
                <span>Đang tải bản cập nhật…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EEE5DC]">
                <div
                  className="h-full rounded-full bg-[#5C4033] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={installUpdate}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5C4033] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#493127]"
            >
              <Download className="h-4 w-4" />
              Cập nhật ngay
            </button>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-600">{errorMessage || 'Cập nhật thất bại. Hãy thử lại.'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

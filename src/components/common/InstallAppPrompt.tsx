import { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

const DISMISS_KEY = 'finanza:install-prompt-dismissed-at';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS non supporta display-mode: standalone nel matchMedia in alcune versioni,
    // ma espone questa proprietà non standard sul navigator quando l'app è installata.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent;
  const isIPad = ua.includes('Macintosh') && navigator.maxTouchPoints > 1; // iPadOS si presenta come Mac
  return /iPhone|iPad|iPod/.test(ua) || isIPad;
}

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Banner discreto che invita a installare l'app sulla schermata Home. Su Android/desktop
 * Chrome intercetta l'evento beforeinstallprompt e mostra il prompt nativo; su iOS Safari
 * quell'evento non esiste, quindi mostriamo istruzioni testuali per "Condividi → Aggiungi
 * alla schermata Home" (unico modo per installare una PWA su iOS).
 */
export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    if (isIOS()) {
      setShowIOSInstructions(true);
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-white border border-slate-200 shadow-lg rounded-xl p-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          {showIOSInstructions ? (
            <>
              <p className="text-sm font-medium text-slate-800">Installa Finanza Personale</p>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1">
                Tocca <Share size={13} className="inline shrink-0" /> Condividi, poi
                <PlusSquare size={13} className="inline shrink-0" /> "Aggiungi alla schermata Home".
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-800">Installa Finanza Personale</p>
              <p className="text-xs text-slate-500 mt-0.5">Accedi più velocemente, anche a schermo intero.</p>
            </>
          )}
          <div className="flex gap-2 mt-2">
            {!showIOSInstructions && (
              <button className="btn-primary !py-1 !px-2.5 text-xs" onClick={install}>
                Installa
              </button>
            )}
            <button className="btn-secondary !py-1 !px-2.5 text-xs" onClick={dismiss}>
              {showIOSInstructions ? 'Ho capito' : 'Non ora'}
            </button>
          </div>
        </div>
        <button className="btn-ghost !p-1 shrink-0" onClick={dismiss} aria-label="Chiudi">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

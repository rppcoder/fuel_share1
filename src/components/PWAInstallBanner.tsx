import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Sparkles, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if user dismissed the banner in this session
    const isDismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fuelshare_pwa_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  // Do not show banner if already running in standalone PWA mode
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('fuelshare_pwa_banner_dismissed', 'true');
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => setDismissed(true), 3500);
      }
    } else {
      // Browser didn't fire beforeinstallprompt yet or browser requires manual add
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {/* Floating Bottom Pop-Up Banner */}
      <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5">
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />

          {/* Close / Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
            title="Dismiss for now"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            {/* App Icon Badge */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-amber-300 font-bold text-lg shadow-md shrink-0 border border-emerald-400/30">
              FS
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white tracking-tight">Install FuelShare App</h3>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase">
                  <Sparkles className="w-2.5 h-2.5" /> PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                Add to your home screen for 1-tap access, fast offline recording & real-time sync.
              </p>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                {installedSuccess ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>App Installed Successfully!</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleInstallClick}
                      className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md active:scale-98 transition"
                    >
                      {isIOS ? (
                        <>
                          <Smartphone className="w-4 h-4 stroke-[2.5]" />
                          <span>Install on iPhone</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>Install App Now</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                      Not Now
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS & Manual Installation Modal Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-900 border border-slate-100 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-amber-300 font-bold text-base shadow">
                  FS
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Install FuelShare</h3>
                  <p className="text-xs text-slate-500">Add to Phone Home Screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-slate-700">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-xs">
                      Tap the <strong className="text-slate-900 flex-inline items-center gap-1"><Share2 className="w-3.5 h-3.5 inline text-blue-600" /> Share</strong> button in Safari toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-xs">
                      Scroll down and select <strong className="text-slate-900 flex-inline items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline text-slate-700" /> Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <p className="text-xs">
                      Tap <strong className="text-slate-900">Add</strong> in the top right to launch FuelShare like a native mobile app!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-xs">
                      Open your browser menu (3 dots <strong className="text-slate-900">⋮</strong> in Chrome/Edge or top bar).
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-xs">
                      Select <strong className="text-slate-900">&quot;Install FuelShare&quot;</strong> or <strong className="text-slate-900">&quot;Add to Home Screen&quot;</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 active:scale-98 transition shadow"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

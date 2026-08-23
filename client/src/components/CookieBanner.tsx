import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

const CONSENT_KEY = "lienguard_cookie_consent";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  timestamp: string;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        // Small timeout so it doesn't jarringly pop immediately upon first render
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    const consent: ConsentState = {
      necessary: true,
      analytics,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-transparent pointer-events-none"
    >
      <div className="max-w-4xl mx-auto bg-[#0f2b4b] text-white border border-[#245380] rounded-2xl shadow-2xl p-5 sm:p-6 pointer-events-auto backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#245380] text-[#bcff6b] mt-0.5">
              <Cookie className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Privacy & Cookie Governance
              </h2>
              <p className="text-xs sm:text-sm text-[#c7d9ec] leading-relaxed max-w-2xl">
                LienGuard uses strictly necessary cookies for authentication and secure sessions. We do not use advertising trackers. With your consent, we use anonymous usage metrics to improve civic workflows.{" "}
                <Link href="/privacy" className="text-[#bcff6b] hover:underline font-semibold">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs border-[#245380] text-[#c7d9ec] bg-white/5 hover:bg-white/10 hover:text-white"
            >
              {showSettings ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
              Preferences
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveConsent(false)}
              className="text-xs border-[#245380] text-white bg-transparent hover:bg-white/10"
            >
              Essential Only
            </Button>
            <Button
              size="sm"
              onClick={() => saveConsent(true)}
              className="text-xs bg-[#bcff6b] text-[#0b1627] hover:bg-[#aef558] font-bold"
            >
              Accept All
            </Button>
          </div>
        </div>

        {/* Detailed Preferences Drawer */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-white/10 grid gap-3 text-xs sm:text-sm text-[#c7d9ec]">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <p className="font-bold text-white">Strictly Necessary (Always Active)</p>
                <p className="text-xs text-[#9eb6ce]">Required for secure authentication, CSRF defense, and session integrity.</p>
              </div>
              <span className="text-xs font-bold text-emerald-400">Required</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <p className="font-bold text-white">Anonymous Usage Analytics</p>
                <p className="text-xs text-[#9eb6ce]">Collects privacy-preserving product telemetry without any personal or case data.</p>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={e => setAnalyticsEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-[#bcff6b] focus:ring-[#bcff6b] cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => saveConsent(analyticsEnabled)}
                className="bg-white text-[#0f2b4b] hover:bg-white/90 text-xs font-bold"
              >
                Save Selected Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

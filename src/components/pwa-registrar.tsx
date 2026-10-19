"use client";

import { useEffect, useState } from "react";
import { shouldRegisterServiceWorker } from "@/lib/pwa/register-policy";

/** Path of the generated worker; used to scope the dev/preview unregister. */
const SW_PATH = "/sw.js";

/**
 * Registers the service worker in production browsers only.
 *
 * Guard rails (deliberate):
 *  - never in development (the SW would serve stale builds over HMR),
 *  - never inside a preview frame (cross-origin preview surfaces must show the
 *    live app, not a cached copy),
 *  - never in a non-secure context (except localhost),
 *  - unregisters any existing SW in dev/preview so a stale worker can't linger.
 */
export function PwaRegistrar() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const canRegister = shouldRegisterServiceWorker({
      nodeEnv: process.env.NODE_ENV,
      inFrame: window.self !== window.top,
      hasServiceWorker: "serviceWorker" in navigator,
      secureContext: window.isSecureContext,
      hostname: location.hostname,
    });

    if (!canRegister) {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const reg of regs) {
            if (reg.active?.scriptURL.endsWith(SW_PATH)) void reg.unregister();
          }
        });
      }
      return;
    }

    navigator.serviceWorker
      .register(SW_PATH, { scope: "/" })
      .catch((err) => console.warn("[pwa] service worker registration failed:", err));

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void Promise.resolve().then(() => setOffline(!navigator.onLine));

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 bg-[var(--primary-700)] px-4 py-2 text-center text-sm text-[var(--primary-foreground)]"
    >
      You are offline — showing saved content.
    </div>
  );
}

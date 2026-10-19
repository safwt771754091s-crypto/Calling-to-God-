/** Environment facts that decide whether the service worker may register. */
export interface RegisterEnv {
  nodeEnv: string;
  /** True when the page is embedded in an iframe (e.g. a preview frame). */
  inFrame: boolean;
  hasServiceWorker: boolean;
  secureContext: boolean;
  hostname: string;
}

/**
 * Whether to register the service worker. Deliberately conservative:
 * production builds only, never inside a preview frame, and only over a secure
 * context (localhost excepted for local production checks).
 */
export function shouldRegisterServiceWorker(env: RegisterEnv): boolean {
  return (
    env.nodeEnv === "production" &&
    !env.inFrame &&
    env.hasServiceWorker &&
    (env.secureContext || env.hostname === "localhost")
  );
}

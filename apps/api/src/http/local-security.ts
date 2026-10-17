import type { RequestHandler } from 'express';

const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i;
function localOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === origin
      && localHost.test(url.host);
  } catch { return false; }
}

/** Browser-origin/Host checks are defense in depth, never authentication. */
export const localSecurity: RequestHandler = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  const origin = req.get('Origin');
  if (!localHost.test(req.get('Host') ?? '') || (origin !== undefined && !localOrigin(origin))) {
    res.status(403).json({ error: { code: 'LOCAL_ACCESS_ONLY', message: 'Use TaskFlow from a local browser origin.' } });
    return;
  }
  next();
};

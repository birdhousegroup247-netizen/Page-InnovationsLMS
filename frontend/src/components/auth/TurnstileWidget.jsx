import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget.
 *
 * Renders only when VITE_TURNSTILE_SITE_KEY is configured. The script is
 * loaded once per page-life and the widget renders into a div ref'd by
 * this component. When the challenge passes, the token is delivered to
 * the parent via `onToken(token)`. The parent sends the token along with
 * the signup payload so the API can verify it server-side.
 *
 * If the env var is not set the component renders nothing — both dev
 * and prod deployments still work, just without the bot check until a
 * key is provided.
 */
export default function TurnstileWidget({ onToken, theme = 'auto' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return; // Not configured — skip entirely.

    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      // Clear previous widget if this component re-mounts.
      if (widgetIdRef.current != null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        callback: (token) => onToken?.(token),
        'error-callback': () => onToken?.(''),
        'expired-callback': () => onToken?.(''),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      // Inject the Turnstile script once per page.
      const existing = document.querySelector('script[data-turnstile]');
      if (existing) {
        existing.addEventListener('load', render, { once: true });
      } else {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.async = true;
        s.defer = true;
        s.dataset.turnstile = '1';
        s.addEventListener('load', render, { once: true });
        document.head.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
      }
    };
  }, [siteKey, theme, onToken]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="my-2 flex justify-center" />;
}

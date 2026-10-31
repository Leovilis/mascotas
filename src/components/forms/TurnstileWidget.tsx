'use client';

import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar la verificación de seguridad'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** true si el captcha está configurado (si no, los formularios funcionan sin él) */
export const TURNSTILE_ENABLED = !!SITE_KEY;

export interface TurnstileHandle {
  /** Pide un token nuevo (los tokens sirven para un solo envío) */
  reset: () => void;
}

/**
 * Captcha de Cloudflare Turnstile (modo "Managed": casi siempre invisible).
 * onToken recibe el token cuando la verificación pasa, y null si vence o falla.
 */
export const TurnstileWidget = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void; className?: string }>(
  function TurnstileWidget({ onToken, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    useEffect(() => {
      onTokenRef.current = onToken;
    }, [onToken]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        onTokenRef.current(null);
        if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
      },
    }));

    useEffect(() => {
      if (!SITE_KEY) return;
      let cancelled = false;
      loadScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            language: 'es',
            theme: 'auto',
            callback: (token: string) => onTokenRef.current(token),
            'expired-callback': () => onTokenRef.current(null),
            'error-callback': () => onTokenRef.current(null),
          });
        })
        .catch(() => onTokenRef.current(null));
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={containerRef} className={className} />;
  }
);

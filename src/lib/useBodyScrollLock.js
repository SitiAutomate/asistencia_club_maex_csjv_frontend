import { useEffect } from 'react';

/** Bloquea el scroll del body mientras `locked` sea true (p. ej. modal abierto). */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [locked]);
}

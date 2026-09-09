import { useEffect } from 'react';

/** Bloquea el scroll del body mientras `locked` sea true (p. ej. modal abierto). */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

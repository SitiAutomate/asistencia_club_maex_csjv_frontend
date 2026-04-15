/** Solo dígitos */
export function digitsOnly(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

export function telHref(phone) {
  let d = digitsOnly(phone);
  if (!d) return null;
  if (d.length === 10) d = `57${d}`;
  return `tel:+${d}`;
}

/** wa.me: si hay 10 dígitos, antepone 57 (Colombia). */
export function whatsappHref(phone) {
  let d = digitsOnly(phone);
  if (!d) return null;
  if (d.length === 10) d = `57${d}`;
  return `https://wa.me/${d}`;
}

export function mailtoHref(email) {
  const e = String(email ?? '').trim();
  if (!e || !e.includes('@')) return null;
  return `mailto:${e}`;
}

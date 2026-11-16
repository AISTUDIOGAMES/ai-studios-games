const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const MAP = new Map([...A].map((c, i) => [c, i]));
export function b58encode(bytes) {
  let z = 0; while (z < bytes.length && bytes[z] === 0) z++;
  const d = [];
  for (let i = z; i < bytes.length; i++) {
    let c = bytes[i];
    for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; }
    while (c) { d.push(c % 58); c = (c / 58) | 0; }
  }
  return '1'.repeat(z) + d.reverse().map(i => A[i]).join('');
}
export function b58decode(str) {
  if (typeof str !== 'string' || !str.length) throw new Error('base58');
  let z = 0; while (z < str.length && str[z] === '1') z++;
  const d = [];
  for (let i = z; i < str.length; i++) {
    let c = MAP.get(str[i]); if (c === undefined) throw new Error('base58');
    for (let j = 0; j < d.length; j++) { c += d[j] * 58; d[j] = c & 0xff; c >>= 8; }
    while (c) { d.push(c & 0xff); c >>= 8; }
  }
  return new Uint8Array([...new Array(z).fill(0), ...d.reverse()]);
}
export function isAddress(s) { try { return typeof s === 'string' && s.length >= 32 && s.length <= 44 && b58decode(s).length === 32; } catch { return false; } }
export const b64 = u8 => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
export const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

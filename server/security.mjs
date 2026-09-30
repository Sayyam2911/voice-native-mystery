import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors.mjs';

let devSecret;
export function appSecret(config = process.env) {
  if (config.APP_SECRET?.length >= 32) return config.APP_SECRET;
  if (config.VERCEL || config.NODE_ENV === 'production')
    throw new HttpError(503, 'APP_SECRET must contain at least 32 characters on the server.');
  devSecret ||= randomBytes(32).toString('hex');
  return devSecret;
}
export function sameSecret(a, b) {
  const x = Buffer.from(a || ''),
    y = Buffer.from(b || '');
  return y.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}
export function sign(value, secret) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
export function verify(token, secret) {
  try {
    const [p, s, ...extra] = String(token || '').split('.');
    if (extra.length || !sameSecret(s, createHmac('sha256', secret).update(p).digest('base64url')))
      return null;
    const data = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
export function readCookie(req, name = 'casework_session') {
  const pairs = (req.headers.cookie || '').split(';').map((x) => x.trim().split('='));
  return pairs
    .find((x) => x[0] === name)
    ?.slice(1)
    .join('=');
}
export function sessionId(req, secret) {
  const data = verify(readCookie(req), secret);
  if (!data?.sid) throw new HttpError(401, 'Start an investigation to continue.');
  return data.sid;
}
export function setSessionCookie(res, sid, secret, secure = false) {
  const token = sign({ sid, exp: Date.now() + 86400000 }, secret);
  res.setHeader(
    'Set-Cookie',
    `casework_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secure ? '; Secure' : ''}`,
  );
}
